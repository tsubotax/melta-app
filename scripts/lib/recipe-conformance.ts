/**
 * recipe-conformance — recipes/app（melta-contracts の styleRefs）と実装の照合基盤（P4）。
 *
 * consumer-driven contract testing の考え方:
 *   melta-ui 側が契約 / token / recipe を壊したら、melta-app のテストが赤くなる。
 *   web 側の互換ゲート（design:compat）と対になる消費者側の安全網。
 *
 * token 参照の解決は **tokens.json を正** とする（NativeTheme は normalize で一部キー名が
 * 変わるため。例: color.status.danger."text-light" → theme では textLight）。
 */

import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url)); // scripts/lib

/** melta-contracts のパッケージルートを解決（npm install → 兄弟ディレクトリ fallback）。 */
export function resolveContractsRoot(): string {
  try {
    const pkgJson = require.resolve("melta-contracts/package.json");
    return dirname(pkgJson);
  } catch {
    // fall through
  }
  const local = resolve(here, "../../../melta-ui/design/contracts");
  if (existsSync(local)) return local;
  throw new Error("melta-contracts を解決できません（未 install + 兄弟 fallback 不在）。");
}

export function listAppRecipeFiles(root: string): string[] {
  const dir = join(root, "recipes", "app");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".recipe.json"))
    .sort();
}

export interface AppRecipe {
  id: string;
  platform: string;
  contractVersion: string;
  variants?: Record<string, unknown>;
  sizes?: Record<string, unknown>;
  states?: Record<string, unknown>;
}

export function loadAppRecipe(root: string, file: string): AppRecipe {
  return JSON.parse(readFileSync(join(root, "recipes", "app", file), "utf8")) as AppRecipe;
}

/** tokens.json のノードパスを walk（例: "color.primary.500" → {value, tailwind}）。無ければ undefined。 */
export function walkTokenPath(tokens: unknown, path: string): unknown {
  let node: unknown = tokens;
  for (const seg of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[seg];
    if (node === undefined) return undefined;
  }
  return node;
}

/** recipe 内の {"token": path} 参照を深掘りで全部集める。 */
export function collectTokenRefs(node: unknown, refs: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectTokenRefs(item, refs);
    return refs;
  }
  if (node !== null && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.token === "string") refs.push(obj.token);
    for (const value of Object.values(obj)) collectTokenRefs(value, refs);
  }
  return refs;
}

/**
 * token ノード → 実装が使う scalar 値へ正規化して解決する（conformance の期待値側）。
 *   color.*   → .value（hex / rgba 文字列。theme の色値と同源）
 *   spacing.* → .value の px を number 化（theme.spacing と同じ変換）
 *   radius.*  → .px number
 *   typography.fontSize.* → .px number
 * それ以外（elevation / motion 等の複合値）は node をそのまま返す（equality 比較には使わない）。
 */
export function resolveTokenScalar(tokens: unknown, path: string): unknown {
  const node = walkTokenPath(tokens, path);
  if (node === undefined || node === null || typeof node !== "object") return node;
  const obj = node as Record<string, unknown>;
  if (path.startsWith("color.")) return obj.value;
  if (path.startsWith("spacing.")) return parseFloat(String(obj.value));
  if (path.startsWith("radius.")) return obj.px;
  if (path.startsWith("typography.fontSize.")) return obj.px;
  return node;
}

/** styleRefs の 1 階層 object を解決（{token} → scalar / literal はそのまま）。 */
export function resolveStyleRefs(
  tokens: unknown,
  style: Record<string, unknown> | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!style) return out;
  for (const [key, value] of Object.entries(style)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const ref = value as Record<string, unknown>;
      if (typeof ref.token === "string") {
        out[key] = resolveTokenScalar(tokens, ref.token);
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}
