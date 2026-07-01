/**
 * generate-native-theme — melta-contracts の tokens.json を読み、
 * RN 向け NativeTheme に正規化して src/theme/native-theme.ts を生成する codegen。
 *
 * 使い方:
 *   npx tsx scripts/generate-native-theme.ts [tokens.json のパス]
 *
 * 入力の解決順:
 *   1. 第1引数で明示されたパス
 *   2. melta-contracts/tokens（publish & install 後に有効）
 *   3. 開発 fallback: 兄弟ディレクトリ ../melta-ui/design/contracts/tokens.json
 */

import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokens, type RawTokens } from "./lib/normalize-tokens";

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));

function resolveTokensPath(): string {
  const explicit = process.argv[2];
  if (explicit) {
    const p = resolve(explicit);
    if (!existsSync(p)) throw new Error(`指定された tokens.json が見つからない: ${p}`);
    return p;
  }
  try {
    return require.resolve("melta-contracts/tokens");
  } catch {
    // publish 前の開発 fallback（melta-app と melta-ui が兄弟ディレクトリ前提）
    const local = resolve(scriptDir, "../../melta-ui/design/contracts/tokens.json");
    if (existsSync(local)) {
      console.warn(`⚠️  melta-contracts 未 install。開発 fallback を使用: ${local}`);
      return local;
    }
    throw new Error(
      "tokens.json を解決できません。`npm install melta-contracts` するか、第1引数でパスを渡してください。",
    );
  }
}

function main(): void {
  const tokensPath = resolveTokensPath();
  const raw = JSON.parse(readFileSync(tokensPath, "utf8")) as RawTokens;
  const theme = normalizeTokens(raw);

  const out = resolve(scriptDir, "../src/theme/native-theme.ts");
  // banner にローカル絶対パスを焼くと公開リポで個人パスが leak し、別マシンで毎回 diff になる。
  // package specifier + tokens version だけにする（実際の入力パスは stdout にのみ出す）。
  const banner =
    "// ⚠️ 自動生成ファイル — 手で編集しないこと。\n" +
    "// 生成元: scripts/generate-native-theme.ts（入力 melta-contracts tokens.json）\n" +
    `// tokens version: ${raw.version ?? "unknown"}\n\n`;
  const body =
    'import type { NativeTheme } from "./types";\n\n' +
    `export const nativeTheme: NativeTheme = ${JSON.stringify(theme, null, 2)};\n`;

  writeFileSync(out, banner + body, "utf8");
  console.log(`✅ NativeTheme を生成: ${out}`);
}

main();
