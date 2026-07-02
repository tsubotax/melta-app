/**
 * image-conformance.test — recipes/app/image.recipe.json と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の「層B: button styleRefs conformance」と同型。
 * image の recipe は variants.default.style / states.error.style が両方とも空 object＝
 * 「実装はデフォルトの装飾 style を持たない」が意図（contract default variant の
 * tokenRefs radius=radius.md とは意図的な食い違い。recipe description に明記済み）。
 * よって照合対象は「recipe の style が空 ⇔ resolver がデフォルトで装飾を持たない」ことと、
 * radius prop 指定時のみ borderRadius + overflow:hidden が付くこと。
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
import { resolveImageShape } from "../../src/components/image.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const imageRecipe = loadAppRecipe(contractsRoot, "image.recipe.json") as AppRecipe & {
  variants: Record<string, { style: Record<string, unknown> }>;
  states: Record<string, { style: Record<string, unknown> }>;
};

test("image conformance: variants / sizes / states の網羅（default / error のみ・sizes 無し）", () => {
  assert.deepEqual(Object.keys(imageRecipe.variants), ["default"]);
  assert.deepEqual(Object.keys(imageRecipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(imageRecipe.states), ["error"]);
});

test("image conformance: recipe の style が空 ⇔ resolver がデフォルトで装飾 style を持たない", () => {
  // recipe 側: default variant / error state とも style は空 object（token 解決後も空）
  assert.deepEqual(resolveStyleRefs(tokens, imageRecipe.variants.default.style), {});
  assert.deepEqual(resolveStyleRefs(tokens, imageRecipe.states.error.style), {});
  // 実装側: radius / aspectRatio 未指定なら装飾 style は一切付かない
  assert.deepEqual(resolveImageShape(nativeTheme), {});
  assert.deepEqual(resolveImageShape(nativeTheme, {}), {});
});

test("image conformance: radius prop 指定時のみ borderRadius + overflow:hidden が付く", () => {
  const shaped = resolveImageShape(nativeTheme, { radius: "md" });
  assert.deepEqual(shaped, { borderRadius: nativeTheme.radius.md, overflow: "hidden" });
  // radius 以外（aspectRatio のみ）では装飾（borderRadius / overflow）は付かない
  const aspectOnly = resolveImageShape(nativeTheme, { aspectRatio: 16 / 9 });
  assert.deepEqual(aspectOnly, { aspectRatio: 16 / 9 });
});

test("image conformance: radius が token キーで theme.radius を正しく引く", () => {
  for (const key of ["sm", "md", "lg", "full"] as const) {
    const shaped = resolveImageShape(nativeTheme, { radius: key });
    assert.equal(shaped.borderRadius, nativeTheme.radius[key], `radius=${key}`);
    assert.equal(shaped.overflow, "hidden", `radius=${key}: overflow`);
  }
});
