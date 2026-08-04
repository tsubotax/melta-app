/**
 * check-drift.ts — ドキュメント / カタログ / 実装 allowlist の整合性チェック（公開 P2）。
 * melta-ui の design:drift と対になる消費者側の drift 検査。
 *
 * 検出項目:
 * 1. README のコンポーネント表（marker ブロック）が契約から生成した内容と一致するか
 *    - 表は手書きしない。melta-contracts の appStatus / appMapping（0.2.1+）を SSOT に生成
 *    - appStatus 未公開の contracts（0.2.0）では implemented 集合 = MVP allowlist で生成
 *      （0.2.1 に bump した瞬間、表の拡張が必要になりここが drift として発火する）
 * 2. example/catalog が implemented 全コンポーネントを実際に描画しているか（カタログ漏れ）
 * 3. 公開ドキュメント（README + docs/*.md）が「未実装」と主張するコンポーネントが
 *    implemented 集合に混ざっていないか
 *    - README から docs/architecture.md へ台帳を分離した（2026-08-04）ので走査範囲は両方。
 *      README だけを見ると「移動した先で腐る」死角ができる
 * 6. 公開ドキュメントの内部リンク（相対パス + 見出しアンカー）の実在
 *    - README を節ごとに分割したので、リンク切れは構成変更のたびに起きうる
 * 7. ドキュメントが主張する hook E2E のケース数がテスト実体と一致するか
 *    - 数値の手書きは drift 源。検査が拾える形（`E2E N ケース`）で書き、実体と照合する
 *
 * 使い方:
 *   tsx scripts/check-drift.ts          # 検査（drift があれば exit 1）
 *   tsx scripts/check-drift.ts --write  # README の生成ブロックを再生成して heal
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MVP_CONTRACT_IDS, toComponentName } from "./lib/conformance.js";
import { resolveContractsRoot } from "./lib/recipe-conformance.js";
import { renderLlmsTxt } from "./build-llms-txt.js";
import { checkPatternsSync } from "./lib/check-patterns-sync.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const writeMode = process.argv.includes("--write");

let drifts = 0;

function drift(msg: string): void {
  console.error(`  ⚠️  DRIFT: ${msg}`);
  drifts++;
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

function section(title: string): void {
  console.log(`\n=== ${title} ===\n`);
}

// --- 契約の読み込み（appStatus は 0.2.1+。無ければ allowlist ベースに degrade） ---

// appStatus は3値。「adapted」は appStatus の値ではなく appMapping 側（直交、contracts 0.2.1 の設計）
interface ContractAvailability {
  id: string;
  appStatus?: "implemented" | "planned" | "not-planned";
  appMapping?: string;
  appNote?: string;
}

const contractsRoot = resolveContractsRoot();
const componentsDir = join(contractsRoot, "components");
const contracts: ContractAvailability[] = readdirSync(componentsDir)
  .filter((f) => f.endsWith(".contract.json"))
  .map((f) => JSON.parse(readFileSync(join(componentsDir, f), "utf8")) as ContractAvailability);

const hasAppStatus = contracts.some((c) => c.appStatus);

// --- README 生成ブロック ---

export const STATUS_BEGIN = "<!-- BEGIN GENERATED: component-status（scripts/check-drift.ts --write で再生成。手編集禁止） -->";
export const STATUS_END = "<!-- END GENERATED: component-status -->";

const STATUS_LABEL: Record<string, string> = {
  implemented: "✅ implemented",
  planned: "⬜ planned",
  "not-planned": "🚫 not-planned",
};

/** 契約の availability メタから README のコンポーネント表を生成する。 */
function renderStatusBlock(): string {
  const lines: string[] = [];
  if (hasAppStatus) {
    const order = ["implemented", "planned", "not-planned"];
    const sorted = [...contracts]
      .filter((c) => c.appStatus)
      .sort(
        (a, b) =>
          order.indexOf(a.appStatus!) - order.indexOf(b.appStatus!) || a.id.localeCompare(b.id),
      );
    lines.push("| 契約 | Component | APP | 形（appMapping） | メモ |");
    lines.push("|---|---|---|---|---|");
    for (const c of sorted) {
      const name = c.appStatus === "implemented" ? `\`${toComponentName(c.id)}\`` : "—";
      lines.push(
        `| ${c.id} | ${name} | ${STATUS_LABEL[c.appStatus!] ?? c.appStatus} | ${c.appMapping ?? "—"} | ${c.appNote ?? ""} |`,
      );
    }
  } else {
    // melta-contracts に appStatus が無い間（<0.2.1）は implemented = MVP allowlist で最小生成
    lines.push("| 契約 | Component | APP |");
    lines.push("|---|---|---|");
    for (const id of [...MVP_CONTRACT_IDS].sort()) {
      lines.push(`| ${id} | \`${toComponentName(id)}\` | ✅ implemented |`);
    }
    lines.push("");
    lines.push(
      "> planned / adapted / not-planned を含む全量の差分表は melta-contracts の `appStatus` 公開（0.2.1+）後にこの表へ自動拡張される。",
    );
  }
  return lines.join("\n");
}

// --- 1. README コンポーネント表 ---
section("1. README コンポーネント表（契約から生成）");

const readmePath = resolve(root, "README.md");
let readme = readFileSync(readmePath, "utf8");
const expected = `${STATUS_BEGIN}\n${renderStatusBlock()}\n${STATUS_END}`;
const blockRe = new RegExp(
  `${STATUS_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${STATUS_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
);

if (!blockRe.test(readme)) {
  drift("README.md に component-status の生成 marker が無い（--write では自動挿入しない。手動で marker を配置）");
} else if (readme.match(blockRe)![0] !== expected) {
  if (writeMode) {
    readme = readme.replace(blockRe, expected);
    writeFileSync(readmePath, readme);
    ok("README コンポーネント表を再生成した（--write）");
  } else {
    drift("README のコンポーネント表が契約と不一致（tsx scripts/check-drift.ts --write で再生成）");
  }
} else {
  ok(`README コンポーネント表が契約と一致（appStatus ${hasAppStatus ? "あり" : "なし=allowlist 生成"}）`);
}

// --- 2. カタログ網羅（implemented 全コンポーネントが描画されているか） ---
section("2. example/catalog の網羅");

const catalogDir = resolve(root, "example/catalog");
function readAllTsx(dir: string): string {
  let out = "";
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out += readAllTsx(p);
    else if (entry.name.endsWith(".tsx")) out += readFileSync(p, "utf8");
  }
  return out;
}
const catalogSource = existsSync(catalogDir) ? readAllTsx(catalogDir) : "";

for (const id of MVP_CONTRACT_IDS) {
  const name = toComponentName(id);
  if (new RegExp(`<${name}[\\s/>]`).test(catalogSource)) {
    ok(`catalog が <${name}> を描画`);
  } else {
    drift(`example/catalog に <${name}> の使用が無い（implemented なのにカタログ未掲載）`);
  }
}

// --- 公開ドキュメントの集合（README + docs/*.md）---
// README から docs/architecture.md へ台帳を分離したので、以降の検査はこの集合を対象にする。
// README だけを走査すると「移動先で腐る」死角ができる（＝検査が弱くなる）。
const docsDir = resolve(root, "docs");
const publicDocs: string[] = [
  "README.md",
  ...(existsSync(docsDir)
    ? readdirSync(docsDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .map((f) => `docs/${f}`)
    : []),
];

// --- 3. 公開ドキュメントの「未実装」主張 vs 実装 allowlist ---
section("3. 公開ドキュメントの未実装主張");

let staleClaims = 0;
for (const rel of publicDocs) {
  const text = readFileSync(resolve(root, rel), "utf8");
  for (const id of MVP_CONTRACT_IDS) {
    const name = toComponentName(id);
    // 「Text / Button / Tag（未実装）」のような行を検知する（同一行に名前と「未実装」が同居）
    const line = text.split("\n").find((l) => l.includes(name) && l.includes("未実装"));
    if (line) {
      drift(`${rel} が実装済みの ${name} を「未実装」と主張: ${line.trim()}`);
      staleClaims++;
    }
  }
}
if (staleClaims === 0)
  ok(`実装済みコンポーネントへの「未実装」主張なし（${publicDocs.length} ファイル走査）`);

// --- 4. llms.txt freshness（契約から生成した内容と commit 済みが一致するか） ---
section("4. llms.txt（契約から生成）");

const llmsPath = resolve(root, "llms.txt");
const expectedLlms = renderLlmsTxt();
if (!existsSync(llmsPath)) {
  drift("llms.txt が無い（npm run build:llms で生成）");
} else if (readFileSync(llmsPath, "utf8") !== expectedLlms) {
  if (writeMode) {
    writeFileSync(llmsPath, expectedLlms);
    ok("llms.txt を再生成した（--write）");
  } else {
    drift("llms.txt が契約と不一致（npm run build:llms か --write で再生成）");
  }
} else {
  ok("llms.txt が契約と一致");
}

// --- 5. docs/*.md スニペット同期（実コードからの抜粋が verbatim か） ---
section("5. docs スニペット同期");
checkPatternsSync(root, { drift, ok });

// --- 6. 公開ドキュメントの内部リンク（相対パス + 見出しアンカー）---
section("6. 内部リンク / アンカーの実在");

/** fence（``` / ~~~）で囲まれたコードブロックを落とす（例の中の [x](y) を検査しない）。 */
function stripCodeFences(md: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of md.split("\n")) {
    const open = /^\s*(```+|~~~+)/.exec(line);
    if (fence === null && open) {
      fence = open[1][0];
      out.push("");
      continue;
    }
    if (fence !== null) {
      if (open && open[1][0] === fence) fence = null;
      out.push("");
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * 見出しテキスト → GitHub のアンカー slug。
 * GitHub の規則: インライン記法を外した表示テキストを小文字化し、文字 / 数字 / 結合文字 /
 * 空白 / `_` / `-` 以外を除去して空白を `-` にする（日本語はそのまま残る）。
 */
function slugify(headingText: string): string {
  const plain = headingText
    .replace(/`([^`]*)`/g, "$1") // コードスパン → 中身
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // リンク / 画像 → テキスト
    .replace(/[*_~]/g, "")
    .trim();
  return plain
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

/** md テキストから見出しアンカーの集合を作る（fence 内の # は除外済み前提）。 */
function anchorsOf(md: string): Set<string> {
  const anchors = new Set<string>();
  for (const line of stripCodeFences(md).split("\n")) {
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (m) anchors.add(slugify(m[2]));
  }
  return anchors;
}

const anchorCache = new Map<string, Set<string> | null>();
function anchorsOfFile(absPath: string): Set<string> | null {
  if (!anchorCache.has(absPath)) {
    anchorCache.set(
      absPath,
      existsSync(absPath) ? anchorsOf(readFileSync(absPath, "utf8")) : null,
    );
  }
  return anchorCache.get(absPath)!;
}

const LINK_RE = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
let linkCount = 0;
let brokenLinks = 0;
for (const rel of publicDocs) {
  const absPath = resolve(root, rel);
  const body = stripCodeFences(readFileSync(absPath, "utf8"));
  for (const match of body.matchAll(LINK_RE)) {
    const target = match[1];
    if (/^(https?:|mailto:|tel:)/.test(target)) continue; // 外部リンクは実在検査の対象外
    linkCount++;
    const hashAt = target.indexOf("#");
    const pathPart = hashAt === -1 ? target : target.slice(0, hashAt);
    const anchor = hashAt === -1 ? "" : decodeURIComponent(target.slice(hashAt + 1));

    let targetPath = absPath;
    if (pathPart !== "") {
      targetPath = resolve(dirname(absPath), pathPart);
      if (!existsSync(targetPath)) {
        drift(`${rel}: リンク先が存在しない → ${target}`);
        brokenLinks++;
        continue;
      }
    }
    if (anchor === "") continue;
    if (!targetPath.endsWith(".md")) continue; // md 以外のアンカーは検査対象外
    const anchors = anchorsOfFile(targetPath);
    if (anchors === null || !anchors.has(anchor)) {
      drift(`${rel}: アンカーが存在しない → ${target}（見出しを確認）`);
      brokenLinks++;
    }
  }
}
if (linkCount === 0) {
  // fail-closed: 内部リンクが 1 本も無い ＝ 検査対象の消失
  drift("公開ドキュメントに内部リンクが 1 本も無い（検査対象が消失）");
} else if (brokenLinks === 0) {
  ok(`内部リンク ${linkCount} 本すべて解決（相対パス + 見出しアンカー）`);
}

// --- 7. ドキュメントが主張する hook E2E ケース数 vs テスト実体 ---
section("7. hook E2E ケース数");

const hookTestPath = resolve(root, "scripts/lib/hook-lint.test.ts");
const actualCases = existsSync(hookTestPath)
  ? (readFileSync(hookTestPath, "utf8").match(/^test\(/gm) ?? []).length
  : 0;
let claimCount = 0;
for (const rel of publicDocs) {
  const text = readFileSync(resolve(root, rel), "utf8");
  for (const m of text.matchAll(/E2E\s*(\d+)\s*ケース/g)) {
    claimCount++;
    const claimed = Number(m[1]);
    if (claimed !== actualCases) {
      drift(
        `${rel}: 「E2E ${claimed} ケース」と主張しているが実体は ${actualCases} 件（scripts/lib/hook-lint.test.ts）`,
      );
    }
  }
}
if (claimCount > 0) ok(`E2E ケース数の主張 ${claimCount} 箇所が実体（${actualCases} 件）と一致`);
else ok("E2E ケース数の主張なし（照合対象なし）");

// --- 結果 ---
console.log("");
if (drifts > 0) {
  console.error(`drift ${drifts} 件。ドキュメント / カタログを実態に追従させること。`);
  process.exit(1);
}
console.log("drift なし ✨");
