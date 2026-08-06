/**
 * generate-contract-types — melta-contracts の *.contract.json を読み、
 * 各 component の variant/size/state を string literal union 型 + 実行時メタ(CONTRACTS)に
 * codegen する。出力は src/contracts/contract-types.ts。
 *
 * 設計書 design-melta-app.md §2(A-3): 「variant/size/state の型を contract から codegen、
 * 実装は手書き、各 component に __contract メタを持たせ conformance test で照合」。
 * ここは型 + メタの生成が責務。生成物と契約源・実装宣言の機械照合は scripts/lib/conformance.test.ts
 * が担当する（稼働中）。
 *
 * 使い方:
 *   npx tsx scripts/generate-contract-types.ts [contracts/components ディレクトリのパス]
 *
 * 入力の解決順（generate-native-theme.ts と同方針）:
 *   1. 第1引数で明示されたディレクトリ
 *   2. melta-contracts の components/ / 兄弟 melta-ui の開発 fallback（scripts/lib/contracts-root.ts）
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveContractsComponentsDir } from "./lib/contracts-root";
import { isMainModule } from "./lib/main-guard";

const scriptDir = dirname(fileURLToPath(import.meta.url));

/**
 * MVP スコープ（設計書 §1 の名目9個から育成した現在の実装集合）。melta-app が実装する
 * component だけを型生成する。33 contract 全部を引くと未実装 component の型がノイズになるため
 * allowlist 方式。育成フロー（§7）で component を追加するときはここに足す。
 *
 * **この配列が allowlist の SSOT**。conformance / drift 検査 / 公開 API 照合はここを import して
 * 使う（`MVP_CONTRACT_IDS` として再輸出、scripts/lib/conformance.ts）。かつては両側に同じ
 * 配列が書かれており、片方だけ足すと型は生成されるのに照合が素通りする形になっていた。
 */
export const MVP_COMPONENTS = [
  "text",
  "button",
  "tag",
  "card",
  "image",
  "surface",
  "skeleton",
  "empty-state",
  "metric",
  "stack",
  "row",
  "screen",
  "header",
  "icon",
  "avatar",
  "textfield",
  "toggle",
  "checkbox",
  "radio",
  "alert",
  "toast",
  "progress",
  "modal",
  "action-sheet",
  "bottom-sheet",
] as const;

interface RawContract {
  id: string;
  version: string;
  variants?: Record<string, unknown>;
  sizes?: Record<string, unknown>;
  states?: string[];
}

function inputContractsDir(): string {
  const explicit = process.argv[2];
  if (explicit) {
    const p = resolve(explicit);
    if (!existsSync(p)) throw new Error(`指定された contracts ディレクトリが見つからない: ${p}`);
    return p;
  }
  return resolveContractsComponentsDir({ warnOnFallback: true });
}

/** "empty-state" → "emptyState"（型キーを TS identifier 化）。contract の id 文字列自体は保持。 */
function toKey(id: string): string {
  return id.replace(/-([a-z])/g, (_m, ch: string) => ch.toUpperCase());
}

function literalArray(values: string[]): string {
  return `[${values.map((v) => JSON.stringify(v)).join(", ")}]`;
}

function main(): void {
  const dir = inputContractsDir();

  const blocks: string[] = [];
  for (const id of MVP_COMPONENTS) {
    const file = join(dir, `${id}.contract.json`);
    if (!existsSync(file)) {
      console.warn(`⚠️  contract 未存在（skip）: ${id}.contract.json`);
      continue;
    }
    const c = JSON.parse(readFileSync(file, "utf8")) as RawContract;
    const key = toKey(c.id);
    const variants = c.variants ? Object.keys(c.variants) : [];
    const sizes = c.sizes ? Object.keys(c.sizes) : [];
    const states = c.states ?? [];
    blocks.push(
      `  ${key}: {\n` +
        `    id: ${JSON.stringify(c.id)},\n` +
        `    version: ${JSON.stringify(c.version)},\n` +
        `    variants: ${literalArray(variants)},\n` +
        `    sizes: ${literalArray(sizes)},\n` +
        `    states: ${literalArray(states)},\n` +
        `  },`,
    );
  }

  const banner =
    "// ⚠️ 自動生成ファイル — 手で編集しないこと。\n" +
    "// 生成元: scripts/generate-contract-types.ts（入力 melta-contracts/components/*.contract.json）\n" +
    "// 各 component の variant/size/state を contract から codegen した型 + 実行時メタ(__contract 用)。\n\n";

  const body =
    "/** 各 contract メタの shape（§2 A-3: 生成結果が shape から逸脱したら型で検知する）。 */\n" +
    "export interface ContractShape {\n" +
    "  id: string;\n" +
    "  version: string;\n" +
    "  variants: readonly string[];\n" +
    "  sizes: readonly string[];\n" +
    "  states: readonly string[];\n" +
    "}\n\n" +
    `export const CONTRACTS = {\n${blocks.join("\n")}\n} as const satisfies Record<string, ContractShape>;\n\n` +
    "export type ContractId = keyof typeof CONTRACTS;\n\n" +
    "/** contract の variant キー union（例: VariantOf<\"text\"> = \"xs\" | ... | \"3xl\"）。空なら never。 */\n" +
    'export type VariantOf<K extends ContractId> = (typeof CONTRACTS)[K]["variants"][number];\n' +
    "/** contract の size キー union（空なら never）。 */\n" +
    'export type SizeOf<K extends ContractId> = (typeof CONTRACTS)[K]["sizes"][number];\n' +
    "/** contract の state キー union。 */\n" +
    'export type StateOf<K extends ContractId> = (typeof CONTRACTS)[K]["states"][number];\n';

  const outDir = resolve(scriptDir, "../src/contracts");
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, "contract-types.ts");
  writeFileSync(out, banner + body, "utf8");
  console.log(`✅ contract 型を生成: ${out}`);
}

// --- main guard（allowlist を import するだけの呼び出し元では codegen を走らせない） ---
if (isMainModule(import.meta.url)) main();
