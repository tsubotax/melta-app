/**
 * icon-conformance.test — recipes/app/icon.recipe.json と実装 resolver の機械照合 +
 * glyphs.ts（生成物）の鮮度検査（assets/icons/*.svg の集合とキー集合の一致）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveContractsRoot,
  loadAppRecipe,
  resolveStyleRefs,
  type AppRecipe,
} from "./recipe-conformance.js";
import { resolveIconStyle } from "../../src/icons/icon.styles.js";
import { GLYPHS, ICON_NAMES } from "../../src/icons/glyphs.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const here = dirname(fileURLToPath(import.meta.url)); // scripts/lib
const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const recipe = loadAppRecipe(contractsRoot, "icon.recipe.json") as AppRecipe & {
  variants: Record<string, { style: Record<string, unknown> }>;
  sizes: Record<string, { style: Record<string, unknown> }>;
};

test("icon conformance: default variant の色（text-default）が実装デフォルトと一致", () => {
  assert.deepEqual(Object.keys(recipe.variants.default.style), ["color"]);
  const impl = resolveIconStyle(nativeTheme, "light"); // size/color デフォルト
  const style = resolveStyleRefs(tokens, recipe.variants.default.style);
  assert.equal(impl.color, style.color, "default: color = text-default(light)");
});

test("icon conformance: sizes（sm/md/lg の正方形）が実装と一致", () => {
  assert.deepEqual(Object.keys(recipe.sizes).sort(), ["lg", "md", "sm"]);
  for (const size of ["sm", "md", "lg"] as const) {
    assert.deepEqual(Object.keys(recipe.sizes[size].style).sort(), ["height", "width"]);
    const impl = resolveIconStyle(nativeTheme, "light", size);
    const style = resolveStyleRefs(tokens, recipe.sizes[size].style);
    assert.equal(impl.width, style.width, `${size}: width`);
    assert.equal(impl.height, style.height, `${size}: height`);
    assert.equal(impl.width, impl.height, `${size}: 正方形`);
  }
});

test("icon conformance: color prop が semantic token キーで mode から解決される", () => {
  assert.equal(
    resolveIconStyle(nativeTheme, "light", "md", "text-muted").color,
    nativeTheme.color.semantic.light["text-muted"],
  );
  assert.equal(
    resolveIconStyle(nativeTheme, "dark", "md").color,
    nativeTheme.color.semantic.dark["text-default"],
  );
});

test("icon glyphs 鮮度: assets/icons/*.svg の集合 == GLYPHS のキー集合（codegen が古くない）", () => {
  const iconsDir = resolve(here, "../../assets/icons");
  const fromAssets = readdirSync(iconsDir)
    .filter((f) => f.endsWith(".svg"))
    .map((f) => f.replace(/\.svg$/, "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase())
    .sort();
  assert.deepEqual([...ICON_NAMES].sort(), fromAssets, "assets と glyphs がズレたら npm run generate:icons");
});

test("icon glyphs 構造: 全 glyph が viewBox + currentColor path を持つ", () => {
  for (const name of ICON_NAMES) {
    const glyph = GLYPHS[name];
    assert.match(glyph.viewBox, /^0 0 \d+ \d+$/, `${name}: viewBox`);
    assert.ok(glyph.paths.length > 0, `${name}: path が 1 本以上`);
    for (const p of glyph.paths) assert.ok(p.d.length > 0, `${name}: d が空でない`);
  }
});
