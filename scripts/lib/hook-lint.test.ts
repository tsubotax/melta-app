/**
 * hook-lint.test — PostToolUse design lint ハーネス（scripts/hook-lint.mjs）の E2E。
 *
 * 「一度手で動かして終わり」にしないための固定テスト。検証するのは hook の入出力契約そのもの:
 *   a. 意図的違反（生 hex 直書き）→ {"decision":"block"} と melta ルール ID を返す
 *   b. 対象外（src/ 外・対象外拡張子・不在ファイル・eslint の ignores 対象）→ 何も出さない（誤爆しない）
 *   c. 正常なコード（theme.* 経由）→ 何も出さない（素通り）
 *   d. warn のみのルール → block ではなく additionalContext で助言注入
 *   e. ハーネス自身の故障 → 無出力ではなく必ず additionalContext（fail-loud）
 *   f. 引用符・空白を含むパスでもパースが壊れない
 *
 * ⚠️ e/f が本テストの主眼（rally-nav T11/T12）。b 系は「無出力＝成功」なので、
 *    hook が常に無出力になるバグでも全部 pass してしまう。故障系の**陽性**確認が要る。
 *
 * fixture は実行時に生成して必ず消す（リポに違反ファイルを常設すると `npm run lint` が赤くなる）。
 */

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // scripts/lib
const root = resolve(here, "../..");
const HOOK = join(root, "scripts", "hook-lint.mjs");
// src/ 配下でないと melta ルールのスコープに入らない。実行時のみ存在させる
const FIXTURE_DIR = join(root, "src", "__lint_e2e__");
// hook の外に置きたいもの（src/ 外の違反ファイル・偽 eslint bin）は tmp へ逃がす
const OUTSIDE_DIR = mkdtempSync(join(tmpdir(), "melta-hook-lint-"));

interface HookOutput {
  decision?: string;
  reason?: string;
  hookSpecificOutput?: { hookEventName?: string; additionalContext?: string };
}

/** hook に生の stdin を渡し、stdout をパースして返す（無出力なら null）。 */
function runHookRaw(input: string, env: NodeJS.ProcessEnv = {}): HookOutput | null {
  const stdout = execFileSync(process.execPath, [HOOK], {
    input,
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  const trimmed = stdout.trim();
  return trimmed === "" ? null : (JSON.parse(trimmed) as HookOutput);
}

/** hook に PostToolUse の入力 JSON を stdin で渡す。 */
function runHook(filePath: string, env: NodeJS.ProcessEnv = {}): HookOutput | null {
  return runHookRaw(
    JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: filePath },
    }),
    env,
  );
}

/** src/ 配下の fixture を書いて絶対パスを返す。 */
function writeFixture(name: string, contents: string): string {
  const full = join(FIXTURE_DIR, name);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents);
  return full;
}

const RAW_COLOR_SOURCE = `export const styles = { box: { backgroundColor: "#ff0000" } };\n`;
const RAW_SPACING_SOURCE = `export const styles = { box: { padding: 13 } };\n`;
const RAW_LINEHEIGHT_SOURCE = `export const styles = { caption: { lineHeight: 16 } };\n`;
const CLEAN_SOURCE = `export const styles = { box: { flex: 1 } };\n`;

mkdirSync(FIXTURE_DIR, { recursive: true });

after(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
  rmSync(OUTSIDE_DIR, { recursive: true, force: true });
});

// --- a. 意図的違反は block される ---

test("a. 生 hex 直書き（error ルール）→ decision: block", () => {
  const out = runHook(writeFixture("violation.tsx", RAW_COLOR_SOURCE));
  assert.ok(out, "違反ファイルなのに無出力（ハーネスが効いていない）");
  assert.equal(out.decision, "block");
  assert.match(out.reason ?? "", /melta\/no-raw-color/);
  assert.match(out.reason ?? "", /#ff0000/);
});

// --- b. 対象外では発火しない（誤爆しない） ---

test("b-1. src/ の外にある同じ違反 → 無出力", () => {
  const outside = join(OUTSIDE_DIR, "outside.ts");
  writeFileSync(outside, RAW_COLOR_SOURCE);
  assert.equal(runHook(outside), null);
});

test("b-2. 対象外拡張子（.js）→ 無出力", () => {
  assert.equal(runHook(writeFixture("violation.js", RAW_COLOR_SOURCE)), null);
});

test("b-3. 存在しないファイル → 無出力", () => {
  assert.equal(runHook(join(FIXTURE_DIR, "ghost.tsx")), null);
});

test("b-4. eslint の ignores 対象（生成物）→ 無出力", () => {
  // 明示指定したファイルが ignore 対象だと eslint は "File ignored" 警告を返す。
  // 違反ではないので additionalContext に載せない（生成物の編集で毎回鳴るのを防ぐ）
  assert.equal(runHook(join(root, "src", "theme", "native-theme.ts")), null);
});

test("b-5. file_path を含まない入力 → 無出力", () => {
  assert.equal(runHookRaw(JSON.stringify({ hook_event_name: "PostToolUse" })), null);
});

// --- c. 正常なコードは素通りする ---

test("c. 生値を使わないコード → 無出力", () => {
  assert.equal(runHook(writeFixture("clean.tsx", CLEAN_SOURCE)), null);
});

// --- d. warn のみは block しない ---

test("d. 生 spacing（warn ルール）→ block せず additionalContext", () => {
  const out = runHook(writeFixture("warn.tsx", RAW_SPACING_SOURCE));
  assert.ok(out, "warn なのに無出力");
  assert.equal(out.decision, undefined, "warn で block してはいけない");
  assert.equal(out.hookSpecificOutput?.hookEventName, "PostToolUse");
  assert.match(out.hookSpecificOutput?.additionalContext ?? "", /melta\/no-raw-spacing/);
});

test("d-2. 生 lineHeight（W8 第5ルール・warn）→ block せず additionalContext", () => {
  const out = runHook(writeFixture("warn-lineheight.tsx", RAW_LINEHEIGHT_SOURCE));
  assert.ok(out, "warn なのに無出力");
  assert.equal(out.decision, undefined, "warn で block してはいけない");
  assert.match(out.hookSpecificOutput?.additionalContext ?? "", /melta\/no-raw-lineheight/);
});

// --- e. ハーネスの故障を黙って通さない（fail-loud） ---

test("e-1. eslint が見つからない → 無出力ではなく additionalContext", () => {
  const out = runHook(writeFixture("missing-bin.tsx", RAW_COLOR_SOURCE), {
    HOOK_LINT_ESLINT_BIN: join(OUTSIDE_DIR, "does-not-exist"),
  });
  assert.ok(out, "eslint 不在が無出力（＝クリーンと区別できない）");
  assert.match(out.hookSpecificOutput?.additionalContext ?? "", /npm install/);
});

test("e-2. eslint が設定破損で異常終了（exit 2）→ 無出力ではなく additionalContext", () => {
  const fakeBin = join(OUTSIDE_DIR, "eslint-exit2.mjs");
  writeFileSync(
    fakeBin,
    '#!/usr/bin/env node\nprocess.stderr.write("Invalid config\\n");\nprocess.exit(2);\n',
  );
  chmodSync(fakeBin, 0o755);
  const out = runHook(writeFixture("fatal.tsx", RAW_COLOR_SOURCE), {
    HOOK_LINT_ESLINT_BIN: fakeBin,
  });
  assert.ok(out, "eslint の致命的失敗が無出力（＝ハーネスが無言で死ぬ）");
  assert.equal(out.decision, undefined);
  assert.match(out.hookSpecificOutput?.additionalContext ?? "", /ハーネスが無効/);
});

test("e-3. eslint の出力が壊れている → 無出力ではなく additionalContext", () => {
  const fakeBin = join(OUTSIDE_DIR, "eslint-garbage.mjs");
  writeFileSync(fakeBin, '#!/usr/bin/env node\nprocess.stdout.write("not json at all\\n");\n');
  chmodSync(fakeBin, 0o755);
  const out = runHook(writeFixture("garbage.tsx", RAW_COLOR_SOURCE), {
    HOOK_LINT_ESLINT_BIN: fakeBin,
  });
  assert.ok(out, "出力破損が無出力");
  assert.match(out.hookSpecificOutput?.additionalContext ?? "", /解釈できません/);
});

test("e-4. 壊れた入力 JSON → 無出力ではなく additionalContext", () => {
  const out = runHookRaw("{not json");
  assert.ok(out, "入力破損が無出力");
  assert.match(out.hookSpecificOutput?.additionalContext ?? "", /入力 JSON/);
});

test("e-5. eslint が hang → timeout で中断し additionalContext（無期限に固まらない）", () => {
  // plugin/parser の無限ループを模す: 出力せずに居座る偽 bin。timeout はテスト用 seam で短縮
  const fakeBin = join(OUTSIDE_DIR, "eslint-hang.mjs");
  writeFileSync(fakeBin, "#!/usr/bin/env node\nsetTimeout(() => {}, 60_000);\n");
  chmodSync(fakeBin, 0o755);
  const started = Date.now();
  const out = runHook(writeFixture("hang.tsx", RAW_COLOR_SOURCE), {
    HOOK_LINT_ESLINT_BIN: fakeBin,
    HOOK_LINT_TIMEOUT_MS: "500",
  });
  assert.ok(Date.now() - started < 10_000, "timeout が効かず hang している");
  assert.ok(out, "timeout が無出力（＝クリーンと区別できない）");
  assert.match(out.hookSpecificOutput?.additionalContext ?? "", /完了せず中断/);
});

// --- f. パスの JSON エスケープで壊れない ---

test("f. 引用符・空白を含むパスでも違反を検出する", () => {
  // grep/sed で file_path を抜いていた bash 版は、この形のパスで途中打ち切りになっていた
  const out = runHook(writeFixture('we"ird name.tsx', RAW_COLOR_SOURCE));
  assert.ok(out, "引用符入りパスで検出できていない（パース破綻）");
  assert.equal(out.decision, "block");
  assert.match(out.reason ?? "", /melta\/no-raw-color/);
});
