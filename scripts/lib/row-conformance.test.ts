/**
 * row-conformance.test — recipes/app/row.recipe.json と実装 resolver の機械照合。
 * pure resolver（src/primitives/row.styles.ts）の出力と recipe styleRefs を突き合わせる。
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
import { resolveRowStyle } from "../../src/primitives/row.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const recipe = loadAppRecipe(contractsRoot, "row.recipe.json") as AppRecipe & {
  variants: Record<string, { style: Record<string, unknown> }>;
};

test("row conformance: default variant（flexDirection + alignItems center）が実装デフォルトと一致", () => {
  assert.deepEqual(Object.keys(recipe.variants.default.style).sort(), ["alignItems", "flexDirection"]);
  const impl = resolveRowStyle(nativeTheme); // 引数なし = prop デフォルト
  const style = resolveStyleRefs(tokens, recipe.variants.default.style);
  assert.deepEqual(impl, style, "default: 実装デフォルトが recipe と一致（justify/wrap/gap を出力しない）");
});

test("row conformance: variants / sizes / states の網羅（default のみ・sizes / states 無し）", () => {
  assert.deepEqual(Object.keys(recipe.variants), ["default"]);
  assert.deepEqual(Object.keys(recipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(recipe.states ?? {}), []);
});

test("row conformance: gap prop が spacing token キーで theme を正しく引く", () => {
  assert.equal(resolveRowStyle(nativeTheme, { gap: "6" }).gap, nativeTheme.spacing["6"]);
  assert.equal(resolveRowStyle(nativeTheme, { gap: "2" }).gap, nativeTheme.spacing["2"]);
});

test("row conformance: align / justify / wrap prop の写像", () => {
  assert.equal(resolveRowStyle(nativeTheme, { align: "start" }).alignItems, "flex-start");
  assert.equal(resolveRowStyle(nativeTheme, { align: "baseline" }).alignItems, "baseline");
  assert.equal(resolveRowStyle(nativeTheme, { justify: "between" }).justifyContent, "space-between");
  assert.equal(resolveRowStyle(nativeTheme, { justify: "end" }).justifyContent, "flex-end");
  assert.ok(!("justifyContent" in resolveRowStyle(nativeTheme, { justify: "start" })), "justify=start は出力しない");
  assert.equal(resolveRowStyle(nativeTheme, { wrap: true }).flexWrap, "wrap");
  assert.ok(!("flexWrap" in resolveRowStyle(nativeTheme, { wrap: false })), "wrap=false は出力しない");
});
