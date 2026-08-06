/**
 * contracts-root — melta-contracts（デザイン契約パッケージ）の所在を解決する唯一の口。
 *
 * 解決順は **npm-first**（設計書 §2 / CI の前提）:
 *   1. `melta-contracts`（npm install 済みのパッケージルート）
 *   2. 開発 fallback: 兄弟ディレクトリ `../melta-ui/design/contracts`
 *      （publish 前の契約をローカルで回すための口。CI には兄弟が意図的に無く、
 *       「npm 経路だけで生成・検査できる」ことの証明になっている）
 *
 * この解決は codegen（generate-native-theme / generate-contract-types）・drift 検査・
 * conformance テストの全部が必要とする。各所に写経すると **解決順がバラバラに腐る**
 * （実際 W1 で「片方だけ npm-first、片方は兄弟直書き」という食い違いが出た）ため、
 * ここを SSOT にして全呼び出し元がここを通る。
 *
 * 存在検査は「ルート」ではなく **要求された成果物単位** で行う（例: 古い melta-contracts に
 * components/ が無い場合、npm ルートは見つかるが components は兄弟から取る、という
 * 旧実装の挙動を保つ）。
 */

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url)); // scripts/lib

/**
 * 開発 fallback のルート（melta-app と melta-ui が兄弟ディレクトリに並んでいる前提）。
 * 「兄弟がある時だけ追加で検証する」テストが直接参照するので export する。
 */
export const SIBLING_CONTRACTS_ROOT = resolve(here, "../../../melta-ui/design/contracts");

/** 解決元。`sibling` は publish 前のローカル契約（CI では出現しない）。 */
export type ContractsSource = "npm" | "sibling";

export interface ResolveOptions {
  /** 兄弟 fallback に倒れた時に警告を出す（codegen スクリプト向け。テストでは静かにする）。 */
  warnOnFallback?: boolean;
}

function notFound(what: string): Error {
  return new Error(
    `${what} を解決できません（melta-contracts 未 install + 兄弟 melta-ui の fallback も不在）。` +
      "`npm install` するか、CLI なら第1引数でパスを渡してください。",
  );
}

/**
 * melta-contracts 配下の成果物を npm-first で解決する。
 * @param relative ルートからの相対パス（"" ならルート自身。例: "components" / "tokens.json"）
 */
export function resolveContractsArtifact(relative: string, options: ResolveOptions = {}): string {
  const candidates: { path: string; source: ContractsSource }[] = [];
  try {
    const npmRoot = dirname(require.resolve("melta-contracts/package.json"));
    candidates.push({ path: relative ? join(npmRoot, relative) : npmRoot, source: "npm" });
  } catch {
    // melta-contracts 未 install。開発 fallback へ落ちる
  }
  candidates.push({
    path: relative ? join(SIBLING_CONTRACTS_ROOT, relative) : SIBLING_CONTRACTS_ROOT,
    source: "sibling",
  });

  for (const candidate of candidates) {
    if (!existsSync(candidate.path)) continue;
    if (candidate.source === "sibling" && options.warnOnFallback) {
      console.warn(`⚠️  melta-contracts 未 install。開発 fallback を使用: ${candidate.path}`);
    }
    return candidate.path;
  }
  throw notFound(relative === "" ? "melta-contracts" : `melta-contracts の ${relative}`);
}

/** melta-contracts のパッケージルート（recipes/ や components/ の親）。 */
export function resolveContractsRoot(options: ResolveOptions = {}): string {
  return resolveContractsArtifact("", options);
}

/** 契約源（*.contract.json が並ぶ components ディレクトリ）。 */
export function resolveContractsComponentsDir(options: ResolveOptions = {}): string {
  return resolveContractsArtifact("components", options);
}

/** トークン源（web 形式の tokens.json。RN 正規化は normalize-tokens が行う）。 */
export function resolveTokensPath(options: ResolveOptions = {}): string {
  return resolveContractsArtifact("tokens.json", options);
}
