/**
 * generate-showcase.ts — showcase シェル（showcase/index.html）に契約由来のデータを
 * 注入して dist-site/index.html を出力する。
 *
 * 生成はビルド時のみで成果物は commit しない（= README と違い drift しない）。
 * SSOT は melta-contracts の appStatus / appMapping / appNote（check-drift.ts の README 表と同源）。
 *
 * 使い方: tsx scripts/generate-showcase.ts（scripts/build-showcase.sh から呼ばれる）
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { toComponentName } from "./lib/conformance.js";
import { resolveContractsRoot } from "./lib/contracts-root.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// appStatus（実装状態）と appMapping（native/adapted の形）は直交（contracts 0.2.1 の Codex レビューで分離）
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

if (!contracts.some((c) => c.appStatus)) {
  throw new Error(
    "melta-contracts に appStatus が無い（0.2.1+ が必要）。showcase は appStatus 全量を前提とする",
  );
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// --- ステータス表（HTML）の生成 ---

const ORDER = ["implemented", "planned", "not-planned"] as const;

const STATUS_BADGE: Record<string, string> = {
  implemented:
    '<span class="inline-flex items-center bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">implemented</span>',
  planned:
    '<span class="inline-flex items-center bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">planned</span>',
  "not-planned":
    '<span class="inline-flex items-center bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">not planned</span>',
};

// appMapping=adapted は「web の形を持ち込まず、モバイルの慣習に変換して提供」の宣言
const ADAPTED_BADGE =
  '<span class="inline-flex items-center bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">adapted</span>';

const withStatus = contracts.filter((c) => c.appStatus);
const sorted = [...withStatus].sort(
  (a, b) =>
    ORDER.indexOf(a.appStatus!) - ORDER.indexOf(b.appStatus!) || a.id.localeCompare(b.id),
);

const rows = sorted
  .map((c) => {
    const name =
      c.appStatus === "implemented"
        ? `<code class="text-xs px-1.5 py-0.5 rounded" style="background:var(--bg-page-alt);color:var(--text-heading);">${escapeHtml(toComponentName(c.id))}</code>`
        : '<span style="color:var(--text-muted);">—</span>';
    return [
      '                <tr class="hover:bg-gray-50 transition-colors">',
      `                  <td class="px-4 py-3 text-sm font-medium" style="color:var(--text-heading);">${escapeHtml(c.id)}</td>`,
      `                  <td class="px-4 py-3 text-sm">${name}</td>`,
      `                  <td class="px-4 py-3">${STATUS_BADGE[c.appStatus!]}</td>`,
      `                  <td class="px-4 py-3 text-sm">${c.appMapping === "adapted" ? ADAPTED_BADGE : '<span style="color:var(--text-muted);">—</span>'}</td>`,
      `                  <td class="px-4 py-3 text-sm" style="color:var(--text-muted);">${c.appNote ? escapeHtml(c.appNote) : ""}</td>`,
      "                </tr>",
    ].join("\n");
  })
  .join("\n");

// --- 統計値 ---

const count = (s: ContractAvailability["appStatus"]) =>
  withStatus.filter((c) => c.appStatus === s).length;
const adaptedCount = withStatus.filter((c) => c.appMapping === "adapted").length;

const replacements: Record<string, string> = {
  __GEN_STATUS_TABLE__: rows,
  __GEN_IMPLEMENTED_COUNT__: String(count("implemented")),
  __GEN_ADAPTED_COUNT__: String(adaptedCount),
  __GEN_PLANNED_COUNT__: String(count("planned")),
  __GEN_NOT_PLANNED_COUNT__: String(count("not-planned")),
  __GEN_CONTRACT_COUNT__: String(withStatus.length),
};

// --- 注入して dist-site へ出力 ---

let html = readFileSync(resolve(root, "showcase/index.html"), "utf8");

for (const [key, value] of Object.entries(replacements)) {
  if (!html.includes(key)) {
    throw new Error(`showcase/index.html に placeholder ${key} が無い`);
  }
  html = html.replaceAll(key, value);
}

const leftover = html.match(/__GEN_[A-Z_]+__/);
if (leftover) {
  throw new Error(`未処理の placeholder が残っている: ${leftover[0]}`);
}

mkdirSync(resolve(root, "dist-site"), { recursive: true });
writeFileSync(resolve(root, "dist-site/index.html"), html);
console.log(
  `✅ dist-site/index.html を生成（契約 ${withStatus.length} / implemented ${count("implemented")} / planned ${count("planned")} / not-planned ${count("not-planned")} / adapted形 ${adaptedCount}）`,
);
