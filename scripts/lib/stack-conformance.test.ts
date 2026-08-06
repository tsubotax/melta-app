/**
 * stack-conformance.test — recipes/app/stack.recipe.json と実装 resolver の機械照合。
 * pure resolver（src/primitives/stack.styles.ts）の出力と recipe styleRefs を突き合わせる。
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
import { resolveStackStyle } from "../../src/primitives/stack.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const recipe = loadAppRecipe(contractsRoot, "stack.recipe.json") as AppRecipe & {
  variants: Record<string, { style: Record<string, unknown> }>;
};

test("stack conformance: default variant（flexDirection のみ）が実装デフォルトと一致", () => {
  // recipe style のキー集合を固定（新キーが増えたら黙って通らず、照合の追加を強制する）
  assert.deepEqual(Object.keys(recipe.variants.default.style).sort(), ["flexDirection"]);
  const impl = resolveStackStyle(nativeTheme); // 引数なし = prop デフォルト
  const style = resolveStyleRefs(tokens, recipe.variants.default.style);
  assert.deepEqual(impl, style, "default: 実装デフォルトが recipe と一致（gap/alignItems を出力しない）");
});

test("stack conformance: variants / sizes / states の網羅（default のみ・sizes / states 無し）", () => {
  assert.deepEqual(Object.keys(recipe.variants), ["default"]);
  assert.deepEqual(Object.keys(recipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(recipe.states ?? {}), []);
});

test("stack conformance: gap prop が spacing token キーで theme を正しく引く", () => {
  const impl = resolveStackStyle(nativeTheme, { gap: "4" });
  assert.equal(impl.gap, nativeTheme.spacing["4"], "gap=4 → spacing.4(px)");
  assert.equal(resolveStackStyle(nativeTheme, { gap: "2" }).gap, nativeTheme.spacing["2"]);
});

test("stack conformance: align prop の写像（stretch=デフォルトは出力しない）", () => {
  assert.equal(resolveStackStyle(nativeTheme, { align: "start" }).alignItems, "flex-start");
  assert.equal(resolveStackStyle(nativeTheme, { align: "center" }).alignItems, "center");
  assert.equal(resolveStackStyle(nativeTheme, { align: "end" }).alignItems, "flex-end");
  assert.ok(!("alignItems" in resolveStackStyle(nativeTheme, { align: "stretch" })));
});
