/**
 * screen-conformance.test — recipes/app/screen.recipe.json と実装 resolver の機械照合。
 * pure resolver（src/components/screen.styles.ts）の出力と recipe styleRefs を突き合わせる。
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
import { resolveScreenStyle } from "../../src/components/screen.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface ScreenVariantRecipe {
  safeAreaStyle: Record<string, unknown>;
  contentStyle: Record<string, unknown>;
}

const recipe = loadAppRecipe(contractsRoot, "screen.recipe.json") as AppRecipe & {
  variants: Record<string, ScreenVariantRecipe>;
};

test("screen conformance: variants / sizes / states の網羅（fixed / scroll）", () => {
  assert.deepEqual(Object.keys(recipe.variants).sort(), ["fixed", "scroll"]);
  assert.deepEqual(Object.keys(recipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(recipe.states ?? {}), []);
});

for (const variant of ["fixed", "scroll"] as const) {
  test(`screen conformance: ${variant} variant の safeArea / content が実装と一致`, () => {
    // recipe のキー集合を固定（新キーが増えたら黙って通らず、照合の追加を強制する）
    assert.deepEqual(Object.keys(recipe.variants[variant]).sort(), ["contentStyle", "safeAreaStyle"]);
    assert.deepEqual(
      Object.keys(recipe.variants[variant].safeAreaStyle).sort(),
      ["backgroundColor", "flex"],
    );
    assert.deepEqual(
      Object.keys(recipe.variants[variant].contentStyle).sort(),
      variant === "fixed" ? ["flex", "padding"] : ["padding"],
    );

    const impl = resolveScreenStyle(nativeTheme, "light", { variant }); // padding デフォルト
    assert.deepEqual(
      impl.safeAreaStyle,
      resolveStyleRefs(tokens, recipe.variants[variant].safeAreaStyle),
      `${variant}: safeAreaStyle`,
    );
    assert.deepEqual(
      impl.contentStyle,
      resolveStyleRefs(tokens, recipe.variants[variant].contentStyle),
      `${variant}: contentStyle（padding デフォルト = recipe に焼いた spacing.4）`,
    );
  });
}

test("screen conformance: padding prop（token キー / none）", () => {
  const p6 = resolveScreenStyle(nativeTheme, "light", { variant: "scroll", padding: "6" });
  assert.equal(p6.contentStyle.padding, nativeTheme.spacing["6"], "padding=6 → spacing.6(px)");
  const none = resolveScreenStyle(nativeTheme, "light", { variant: "scroll", padding: "none" });
  assert.ok(!("padding" in none.contentStyle), "padding=none は出力しない");
});

test("screen conformance: dark mode では bg-page が dark 側から解決される", () => {
  const impl = resolveScreenStyle(nativeTheme, "dark", { variant: "fixed" });
  assert.equal(impl.safeAreaStyle.backgroundColor, nativeTheme.color.semantic.dark["bg-page"]);
});
