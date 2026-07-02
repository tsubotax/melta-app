/**
 * conformance — 「実装が contract を満たしているか」を機械照合する最小ハーネス（設計書 §2 A-3）。
 *
 * 照合は3点を一直線に繋ぐ:
 *   契約源（melta-contracts の *.contract.json）→ 生成メタ（src/contracts/contract-types.ts の CONTRACTS）
 *   → 実装宣言（各 component の `X.__contract = CONTRACTS.y`）
 *
 * RN component は node test で実行できないため、実装側はソースを「読むだけ」で静的スキャンする
 * （`X.__contract = CONTRACTS.y` の X↔y 対応を正規表現で確認）。実行時の prop 網羅照合（Button が
 * 本当に6 variant 描画できるか等）は Phase 2（実機 or RN test runner 導入後）。
 *
 * Phase 1 で保証すること:
 *   1. CONTRACTS（生成物）が contract JSON（源）と一致 = codegen が鮮度を保っている（手編集・古い生成物を検知）
 *   2. 各 component の __contract 宣言が正しい contract を指している（型では防げない誤参照を捕捉）
 */

import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url)); // scripts/lib

/** generate-contract-types.ts と同じ MVP allowlist（contract id）。 */
export const MVP_CONTRACT_IDS = [
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

export interface ContractMeta {
  id: string;
  version: string;
  variants: string[];
  sizes: string[];
  states: string[];
}

/** "empty-state" → "emptyState"（CONTRACTS のキー形式に合わせる）。 */
export function toKey(id: string): string {
  return id.replace(/-([a-z])/g, (_m, ch: string) => ch.toUpperCase());
}

/**
 * 機械変換（kebab→Pascal）で契約の name と表記が食い違う id の例外表。
 * 例: id "textfield"（ハイフン無し）は機械変換だと "Textfield" だが、契約 name は "TextField"。
 * toComponentName / toContractKey の両方向でこの表を参照し、照合の機械性を保ったまま表記を契約に合わせる。
 */
const COMPONENT_NAME_OVERRIDES: Record<string, string> = {
  textfield: "TextField",
};

/** "empty-state" → "EmptyState"（コンポーネント名の命名規約。例外は COMPONENT_NAME_OVERRIDES）。 */
export function toComponentName(id: string): string {
  const override = COMPONENT_NAME_OVERRIDES[id];
  if (override) return override;
  const key = toKey(id);
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Component 名 → 期待 contract key（toComponentName の逆写像。__contract 誤参照検査用）。 */
export function toContractKey(component: string): string {
  for (const [id, name] of Object.entries(COMPONENT_NAME_OVERRIDES)) {
    if (name === component) return toKey(id);
  }
  return component.charAt(0).toLowerCase() + component.slice(1);
}

/** 契約源（melta-contracts の components ディレクトリ）を解決。generate-contract-types と同方針。 */
export function resolveContractsDir(): string {
  try {
    const pkgJson = require.resolve("melta-contracts/package.json");
    const dir = join(dirname(pkgJson), "components");
    if (existsSync(dir)) return dir;
  } catch {
    // fall through
  }
  const local = resolve(here, "../../../melta-ui/design/contracts/components");
  if (existsSync(local)) return local;
  throw new Error("contracts components ディレクトリを解決できません（melta-contracts 未 install + fallback 不在）。");
}

/** 契約源の *.contract.json を読み、ContractMeta 形式（CONTRACTS と同じ shape）に正規化。 */
export function loadContractMetaFromSource(dir: string, id: string): ContractMeta {
  const file = join(dir, `${id}.contract.json`);
  const c = JSON.parse(readFileSync(file, "utf8")) as {
    id: string;
    version: string;
    variants?: Record<string, unknown>;
    sizes?: Record<string, unknown>;
    states?: string[];
  };
  return {
    id: c.id,
    version: c.version,
    variants: c.variants ? Object.keys(c.variants) : [],
    sizes: c.sizes ? Object.keys(c.sizes) : [],
    states: c.states ?? [],
  };
}

/**
 * src 配下を再帰スキャンし、`X.__contract = CONTRACTS.y` 宣言を全部集める。
 * 返り値: { component: "Button", contractKey: "button", file }[]
 */
export function scanContractDeclarations(srcDir: string): {
  component: string;
  contractKey: string;
  file: string;
}[] {
  const results: { component: string; contractKey: string; file: string }[] = [];
  const re = /(\w+)\.__contract\s*=\s*CONTRACTS\.(\w+)/g;

  function walk(d: string): void {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        const text = readFileSync(p, "utf8");
        for (const m of text.matchAll(re)) {
          results.push({ component: m[1], contractKey: m[2], file: p });
        }
      }
    }
  }
  walk(srcDir);
  return results;
}
