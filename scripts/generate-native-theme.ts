/**
 * generate-native-theme — melta-contracts の tokens.json を読み、
 * RN 向け NativeTheme に正規化して src/theme/native-theme.ts を生成する codegen。
 *
 * 使い方:
 *   npx tsx scripts/generate-native-theme.ts [tokens.json のパス]
 *
 * 入力の解決順:
 *   1. 第1引数で明示されたパス
 *   2. melta-contracts の tokens.json / 兄弟 melta-ui の開発 fallback（scripts/lib/contracts-root.ts）
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveTokensPath } from "./lib/contracts-root";
import { normalizeTokens, type RawTokens } from "./lib/normalize-tokens";

const scriptDir = dirname(fileURLToPath(import.meta.url));

function inputTokensPath(): string {
  const explicit = process.argv[2];
  if (explicit) {
    const p = resolve(explicit);
    if (!existsSync(p)) throw new Error(`指定された tokens.json が見つからない: ${p}`);
    return p;
  }
  return resolveTokensPath({ warnOnFallback: true });
}

function main(): void {
  const tokensPath = inputTokensPath();
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
    // 相対 import は .js 拡張子を明示する（node16/nodenext の consumer で .d.ts が解決できるように）
    'import type { NativeTheme } from "./types.js";\n\n' +
    `export const nativeTheme: NativeTheme = ${JSON.stringify(theme, null, 2)};\n`;

  writeFileSync(out, banner + body, "utf8");
  console.log(`✅ NativeTheme を生成: ${out}`);
}

main();
