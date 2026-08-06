/**
 * header-conformance.test — recipes/app/header.recipe.json と実装 resolver の機械照合。
 * pure resolver（src/components/header.styles.ts）の出力と recipe styleRefs を突き合わせる。
 * title の typography は Text（variant="xl" 等）の compose のため text recipe 側が正（ここでは照合しない）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveContractsRoot } from "./contracts-root.js";
import {
  loadAppRecipe,
  resolveStyleRefs,
  type AppRecipe,
} from "./recipe-conformance.js";
import { resolveHeaderStyle } from "../../src/components/header.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const recipe = loadAppRecipe(contractsRoot, "header.recipe.json") as AppRecipe & {
  variants: Record<string, { containerStyle: Record<string, unknown>; titleWrapStyle: Record<string, unknown> }>;
};

test("header conformance: variants / sizes / states の網羅（default のみ）", () => {
  assert.deepEqual(Object.keys(recipe.variants), ["default"]);
  assert.deepEqual(Object.keys(recipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(recipe.states ?? {}), []);
});

test("header conformance: default variant の container / titleWrap が実装と一致", () => {
  // recipe のキー集合を固定（新キーが増えたら黙って通らず、照合の追加を強制する）
  assert.deepEqual(Object.keys(recipe.variants.default).sort(), ["containerStyle", "titleWrapStyle"]);
  assert.deepEqual(
    Object.keys(recipe.variants.default.containerStyle).sort(),
    [
      "alignItems",
      "backgroundColor",
      "borderBottomColor",
      "borderBottomWidth",
      "flexDirection",
      "gap",
      "paddingHorizontal",
      "paddingVertical",
    ],
  );

  const impl = resolveHeaderStyle(nativeTheme, "light");
  assert.deepEqual(
    impl.containerStyle,
    resolveStyleRefs(tokens, recipe.variants.default.containerStyle),
    "containerStyle",
  );
  assert.deepEqual(
    impl.titleWrapStyle,
    resolveStyleRefs(tokens, recipe.variants.default.titleWrapStyle),
    "titleWrapStyle（flex:1 で trailing を右端へ）",
  );
});

test("header conformance: dark mode では bg / border が dark 側から解決される", () => {
  const impl = resolveHeaderStyle(nativeTheme, "dark");
  assert.equal(impl.containerStyle.backgroundColor, nativeTheme.color.semantic.dark["bg-page"]);
  assert.equal(impl.containerStyle.borderBottomColor, nativeTheme.color.semantic.dark["border-default"]);
});
