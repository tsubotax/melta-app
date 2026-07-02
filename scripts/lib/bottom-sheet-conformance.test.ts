/**
 * bottom-sheet-conformance.test — recipes/app/bottom-sheet.recipe.json と実装 resolver の機械照合。
 * pure resolver（src/components/bottom-sheet.styles.ts）の出力と recipe styleRefs を突き合わせる。
 * overlay の "rgba(0,0,0,0.5)" は token 外 literal のため literal 照合（modal と同じ）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveContractsRoot,
  loadAppRecipe,
  resolveStyleRefs,
  type AppRecipe,
} from "./recipe-conformance.js";
import { resolveBottomSheetStyle } from "../../src/components/bottom-sheet.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const recipe = loadAppRecipe(contractsRoot, "bottom-sheet.recipe.json") as AppRecipe & {
  variants: Record<string, Record<string, Record<string, unknown>>>;
};

const STYLE_KEYS = ["contentStyle", "grabberStyle", "overlayStyle", "sheetStyle", "titleStyle"] as const;

test("bottom-sheet conformance: variants / sizes / states の網羅（default のみ）", () => {
  assert.deepEqual(Object.keys(recipe.variants), ["default"]);
  assert.deepEqual(Object.keys(recipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(recipe.states ?? {}), []);
});

test("bottom-sheet conformance: default variant の各 style が実装と一致", () => {
  // recipe のキー集合を固定（新キーが増えたら黙って通らず、照合の追加を強制する）
  assert.deepEqual(
    Object.keys(recipe.variants.default).sort(),
    [...STYLE_KEYS],
    "recipe のキー集合が変わった（このテストに照合を追加すること）",
  );

  const impl = resolveBottomSheetStyle(nativeTheme, "light");
  for (const key of STYLE_KEYS) {
    assert.deepEqual(
      impl[key],
      resolveStyleRefs(tokens, recipe.variants.default[key]),
      `default: ${key}`,
    );
  }
  // overlay の黒 50% は token 外 literal（modal と同じ）
  assert.equal(impl.overlayStyle.backgroundColor, "rgba(0,0,0,0.5)", "overlay literal");
  // 上角のみ radius（下端密着）— borderRadius（全周）を recipe が持たないことを両側で確認
  assert.ok(!("borderRadius" in recipe.variants.default.sheetStyle), "recipe sheetStyle に全周 borderRadius が無い");
  assert.ok(!("borderRadius" in impl.sheetStyle), "実装 sheetStyle に全周 borderRadius が無い");
});

test("bottom-sheet conformance: dark mode では semantic 色が dark 側から解決される", () => {
  const impl = resolveBottomSheetStyle(nativeTheme, "dark");
  assert.equal(impl.sheetStyle.backgroundColor, nativeTheme.color.semantic.dark["bg-surface"]);
  assert.equal(impl.grabberStyle.backgroundColor, nativeTheme.color.semantic.dark["border-strong"]);
  assert.equal(impl.titleStyle.color, nativeTheme.color.semantic.dark["text-heading"]);
});
