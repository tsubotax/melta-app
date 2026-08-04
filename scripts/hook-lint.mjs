#!/usr/bin/env node
// PostToolUse hook: src/ 配下の .ts/.tsx を Write/Edit した直後に design lint（eslint melta ルール）を走らせる。
//
// melta-ui の hook-check-rule.sh と同型の消費者側ハーネス。JSON 契約:
//   - error あり → {"decision":"block","reason":...} で Claude に自動フィードバック（修正ループ）
//   - warn のみ → hookSpecificOutput.additionalContext で助言注入
//   - クリーン → 無出力で通過
//   - ハーネス自身の故障（eslint 未解決・設定破損・出力破損・入力 JSON 破損）→ 必ず additionalContext
//
// ⚠️ PostToolUse は「書き込み後」に走る。block は書き込みの防止でもロールバックでもなく、
//    後続作業を止めて model に修正させるフィードバックである。
//
// bash 版（scripts/hook-lint.sh）から node へ移した理由（rally-nav の外部導入 T11/T12、2026-08-04）:
//   1. `RESULT=$(... || true)` / `2>/dev/null || true` が eslint の実行失敗（設定の構文エラー・
//      plugin 解決失敗・強制終了）を握り潰し、**クリーン時と同じ無出力**を返していた。
//      ハーネスが死んでも誰も気づかない（違反入りファイルが素通りする）
//   2. file_path を grep/sed で抜いていたため、JSON エスケープ済みの引用符（src/a\"b.tsx）や
//      \uXXXX を含むパスで途中打ち切りになる → JSON.parse に統一
//   3. bash 依存を落として Windows 互換も確保する
//
// **「クリーン（無出力）」と「ハーネス故障」を絶対に同じ出力にしない**のがこのファイルの不変条件。
// 回帰テストは scripts/lib/hook-lint.test.ts（故障系の陽性ケースを含む）。
//
// 判定ロジックは eslint 本体（eslint.config.mjs + eslint-rules/melta.mjs）に集約し、hook は薄い皮に留める。

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// eslint の実体。既定は node で bin/eslint.js を直接叩く（.bin のシェル wrapper を経由しない = Windows 互換）。
// HOOK_LINT_ESLINT_BIN はテストから故障を注入するための seam（実行可能ファイルを直指定）。
const ESLINT_BIN_OVERRIDE = process.env.HOOK_LINT_ESLINT_BIN;
const ESLINT_JS = path.join(ROOT, "node_modules", "eslint", "bin", "eslint.js");

/** 何も言わずに通す（lint 対象外のファイル）。 */
function pass() {
  process.exit(0);
}

/** 助言・警告としてコンテキストに注入する（ハーネスの不調もこれで必ず表に出す）。 */
function notify(additionalContext) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext },
    }),
  );
  process.exit(0);
}

/** 後続作業を止めて model に修正させる。 */
function block(reason) {
  console.log(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

const NOT_INSTALLED =
  "melta-app: design lint をスキップしました（eslint 未解決）。リポジトリルートで npm install を実行すると Write/Edit 直後の自動 lint が有効になります。";

let raw = "";
try {
  raw = fs.readFileSync(0, "utf8");
} catch {
  // stdin が読めないのも hook 側の異常。黙って通さない
  notify("melta-app: design lint hook が PostToolUse の入力を読み取れませんでした。hook の設定を確認してください。");
}

let input;
try {
  input = JSON.parse(raw);
} catch {
  // 入力が壊れているのは hook 側の異常。黙って通すとハーネスが死んでいることに気づけない
  notify(
    "melta-app: design lint hook が PostToolUse の入力 JSON を解釈できませんでした。hook の設定を確認してください。",
  );
}

const filePath = input?.tool_input?.file_path ?? input?.file_path;
if (typeof filePath !== "string" || filePath === "") pass();

// スコープは bash 版と同一（eslint.config.mjs の melta ブロックと同じ src/ の .ts/.tsx）。
// catalog / scripts は意図的に緩く、生成物は eslint 側の ignores に任せる。
if (!/\.tsx?$/.test(filePath)) pass();
const abs = path.resolve(ROOT, filePath);
const srcDir = path.join(ROOT, "src") + path.sep;
if (!abs.startsWith(srcDir)) pass();
if (!fs.existsSync(abs)) pass();

const command = ESLINT_BIN_OVERRIDE ?? process.execPath;
const args = ESLINT_BIN_OVERRIDE
  ? ["--format", "json", abs]
  : [ESLINT_JS, "--format", "json", abs];

if (!ESLINT_BIN_OVERRIDE && !fs.existsSync(ESLINT_JS)) notify(NOT_INSTALLED);

let stdout;
try {
  stdout = execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (err) {
  // eslint 未インストール（npm install 前）は silent no-op にせず、その旨を注入する
  if (err.code === "ENOENT") notify(NOT_INSTALLED);
  // exit 1 = 違反あり（正常系。stdout に JSON が入る）/ exit 2 以上 = 設定破損などの致命的失敗
  if (err.status === 1 && typeof err.stdout === "string") {
    stdout = err.stdout;
  } else {
    const detail = String(err.stderr ?? err.message ?? "").trim().slice(0, 800);
    notify(
      `melta-app: design lint の実行に失敗しました（exit ${err.status ?? "?"}）。ハーネスが無効になっているため違反を検出できません:\n${detail}`,
    );
  }
}

let results;
try {
  results = JSON.parse(stdout);
} catch {
  notify("melta-app: design lint の出力を解釈できませんでした。ハーネスが無効になっている可能性があります。");
}
if (!Array.isArray(results)) {
  notify("melta-app: design lint の出力形式が想定外でした。ハーネスが無効になっている可能性があります。");
}

const messages = results.flatMap((r) =>
  (r.messages ?? [])
    // 明示指定したファイルが ignores 対象のときに eslint が出す案内は違反ではない（生成物を編集した場合など）
    .filter((m) => !(m.ruleId == null && /^File ignored/.test(String(m.message ?? ""))))
    .map((m) => `${r.filePath}:${m.line ?? 0} [${m.ruleId ?? "parse"}] ${m.message}`),
);
if (messages.length === 0) pass();

const errorCount = results.reduce((n, r) => n + (r.errorCount ?? 0), 0);
const body = messages.join("\n");
if (errorCount > 0) {
  block(`melta-app design lint violation（修正して再 Write してください）:\n${body}`);
}
notify(`melta-app design lint warning:\n${body}`);
