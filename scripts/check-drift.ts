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
 * 3. README が「未実装」と主張するコンポーネントが implemented 集合に混ざっていないか
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

// --- 3. README の「未実装」主張 vs 実装 allowlist ---
section("3. README の未実装主張");

const readmeNow = readFileSync(readmePath, "utf8");
let staleClaims = 0;
for (const id of MVP_CONTRACT_IDS) {
  const name = toComponentName(id);
  // 「Text / Button / Tag（未実装）」のような行を検知する（同一行に名前と「未実装」が同居）
  const line = readmeNow.split("\n").find((l) => l.includes(name) && l.includes("未実装"));
  if (line) {
    drift(`README が実装済みの ${name} を「未実装」と主張: ${line.trim()}`);
    staleClaims++;
  }
}
if (staleClaims === 0) ok("実装済みコンポーネントへの「未実装」主張なし");

// --- 結果 ---
console.log("");
if (drifts > 0) {
  console.error(`drift ${drifts} 件。ドキュメント / カタログを実態に追従させること。`);
  process.exit(1);
}
console.log("drift なし ✨");
