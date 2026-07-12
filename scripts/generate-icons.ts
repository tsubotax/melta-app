/**
 * generate-icons — assets/icons/*.svg（Charcoal Icons のベンダリング + Charcoal に無い
 * グリフの Material Symbols Rounded 補完。いずれも Apache-2.0、帰属は THIRD_PARTY_LICENSES.md）
 * を読み、src/icons/glyphs.ts に path データを codegen する。
 *
 * SSOT→生成→drift の melta 流: SVG（源）→ glyphs.ts（生成物、commit 済みを配布）。
 * 鮮度は icon-conformance テストが「assets の SVG 集合 == glyphs のキー集合」を照合して担保する。
 *
 * 入力 SVG の前提（Charcoal）:
 *   - ルートは <svg ... viewBox="..."> のみ、子は <path> のみ（rect/circle 等が現れたら error）
 *   - fill は "currentColor"（固定色が現れたら error — 単色 tint の契約を守る）
 *   - viewBox はアイコンごとに異なる（16/24/32）ため per-icon で保持する
 *
 * 使い方: npx tsx scripts/generate-icons.ts
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(scriptDir, "../assets/icons");
const outFile = resolve(scriptDir, "../src/icons/glyphs.ts");

/** "ShareIos" → "share-ios"（Icon の name prop 形式）。 */
function toKebab(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

interface GlyphPath {
  d: string;
  fillRule?: "evenodd";
}

function parseSvg(file: string): { viewBox: string; paths: GlyphPath[] } {
  const svg = readFileSync(file, "utf8");

  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw new Error(`${basename(file)}: viewBox がありません`);

  // path 以外の描画要素が混ざっていないか（Charcoal 前提の破れを検知）
  const elements = [...svg.matchAll(/<([a-zA-Z]+)[\s/>]/g)].map((m) => m[1]);
  const unexpected = elements.filter((e) => e !== "svg" && e !== "path");
  if (unexpected.length > 0) {
    throw new Error(`${basename(file)}: path 以外の要素が含まれる: ${unexpected.join(", ")}`);
  }

  const paths: GlyphPath[] = [];
  for (const m of svg.matchAll(/<path\b([^>]*)\/>/g)) {
    const attrs = m[1];
    const d = attrs.match(/\bd="([^"]+)"/)?.[1];
    if (!d) throw new Error(`${basename(file)}: d 属性の無い path`);
    const fill = attrs.match(/\bfill="([^"]+)"/)?.[1];
    if (fill !== "currentColor") {
      // 白抜き backdrop（例: LikeOff の #fff）だけは既知パターンとして落とす（単色 tint 契約。
      // 固定色を残すと dark mode で破綻する）。それ以外の固定色は「意味のある path の無音欠落」に
      // なり得るため throw して人間に判断させる（Codex レビュー反映）。
      if (fill && /^(#fff|#ffffff|white)$/i.test(fill)) continue;
      throw new Error(
        `${basename(file)}: 未知の固定色 fill="${fill ?? "無し"}"（白抜き backdrop 以外は許可しない — アイコンを curated セットに入れる前に形式を確認）`,
      );
    }
    const fillRule = attrs.match(/\bfill-rule="([^"]+)"/)?.[1];
    if (fillRule && fillRule !== "evenodd") {
      throw new Error(`${basename(file)}: 未対応の fill-rule: ${fillRule}`);
    }
    paths.push({ d, ...(fillRule ? { fillRule: "evenodd" as const } : null) });
  }
  if (paths.length === 0) throw new Error(`${basename(file)}: currentColor の path がありません`);

  return { viewBox, paths };
}

function main(): void {
  const files = readdirSync(iconsDir)
    .filter((f) => f.endsWith(".svg"))
    .sort();

  const entries: string[] = [];
  for (const file of files) {
    const name = toKebab(basename(file, ".svg"));
    const { viewBox, paths } = parseSvg(join(iconsDir, file));
    const pathsSrc = paths
      .map(
        (p) =>
          `{ d: ${JSON.stringify(p.d)}${p.fillRule ? `, fillRule: ${JSON.stringify(p.fillRule)} as const` : ""} }`,
      )
      .join(", ");
    entries.push(`  "${name}": { viewBox: ${JSON.stringify(viewBox)}, paths: [${pathsSrc}] },`);
  }

  const out =
    "// ⚠️ 自動生成ファイル — 手で編集しないこと。\n" +
    "// 生成元: scripts/generate-icons.ts（入力 assets/icons/*.svg = Charcoal Icons + Material Symbols Rounded 補完, Apache-2.0）\n" +
    "// 帰属表示は THIRD_PARTY_LICENSES.md を参照。\n\n" +
    "export interface Glyph {\n" +
    "  viewBox: string;\n" +
    '  paths: readonly { d: string; fillRule?: "evenodd" }[];\n' +
    "}\n\n" +
    // キーは literal（IconName 導出用）、値は Glyph に広げる（fillRule 無し entry の union アクセスを許す）
    `const GLYPHS_SOURCE = {\n${entries.join("\n")}\n} as const;\n\n` +
    "export type IconName = keyof typeof GLYPHS_SOURCE;\n\n" +
    "export const GLYPHS: Record<IconName, Glyph> = GLYPHS_SOURCE;\n\n" +
    "/** 利用可能な icon name 一覧（catalog / ドキュメント生成用）。 */\n" +
    "export const ICON_NAMES = Object.keys(GLYPHS) as IconName[];\n";

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, out, "utf8");
  console.log(`✅ icon glyphs を生成: ${outFile}（${files.length} 個）`);
}

main();
