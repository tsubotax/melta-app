/**
 * progress-conformance.test — recipes/app/progress.recipe.json と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の「層B: button styleRefs conformance」と同型。
 * pure resolver（src/components/progress.styles.ts）の出力と recipe の styleRefs を
 * token 解決（tokens.json を正とする）して突き合わせる。
 * progress は variant 3種 × 2 slot（trackStyle / fillStyle）。fill の幅（value% / indeterminate 40%）は
 * 実装が算出するため recipe には無い（recipe は色と形のみ、recipe description）。
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
import {
  clampProgressValue,
  resolveProgressStyles,
  type ProgressVariant,
} from "../../src/components/progress.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const progressRecipe = loadAppRecipe(contractsRoot, "progress.recipe.json") as AppRecipe & {
  variants: Record<string, Record<string, Record<string, unknown>>>;
};

/** slot のキー集合一致 + 全キーの値一致を照合する（期待値は tokens.json を正として解決）。 */
function assertSlotConforms(
  implSlot: Record<string, unknown>,
  recipeSlot: Record<string, unknown>,
  label: string,
) {
  const expected = resolveStyleRefs(tokens, recipeSlot);
  assert.deepEqual(
    Object.keys(implSlot).sort(),
    Object.keys(expected).sort(),
    `${label}: キー集合が recipe と不一致`,
  );
  for (const [key, value] of Object.entries(expected)) {
    assert.deepEqual(implSlot[key], value, `${label}.${key}`);
  }
}

test("progress conformance: 全 variant の trackStyle / fillStyle が実装 resolver と recipe で一致（light）", () => {
  for (const [name, recipeVariant] of Object.entries(progressRecipe.variants)) {
    // recipe slot / キー集合を固定（新キーが増えたら黙って通らず、照合の追加を強制する。Codex L-3）
    assert.deepEqual(
      Object.keys(recipeVariant).sort(),
      ["fillStyle", "trackStyle"],
      `${name}: recipe の slot 集合が変わった（このテストに照合を追加すること）`,
    );
    assert.deepEqual(
      Object.keys(recipeVariant.trackStyle).sort(),
      ["backgroundColor", "borderRadius", "height", "overflow"],
      `${name}: trackStyle のキー集合が変わった（このテストに照合を追加すること）`,
    );
    assert.deepEqual(
      Object.keys(recipeVariant.fillStyle).sort(),
      ["backgroundColor", "borderRadius", "height"],
      `${name}: fillStyle のキー集合が変わった（このテストに照合を追加すること）`,
    );
    const impl = resolveProgressStyles(nativeTheme, "light", name as ProgressVariant);
    assertSlotConforms(impl.trackStyle, recipeVariant.trackStyle, `${name}.trackStyle`);
    assertSlotConforms(impl.fillStyle, recipeVariant.fillStyle, `${name}.fillStyle`);
  }
});

test("progress conformance: dark mode では track の semantic 色が dark 側から解決される", () => {
  for (const name of Object.keys(progressRecipe.variants)) {
    const impl = resolveProgressStyles(nativeTheme, "dark", name as ProgressVariant);
    assert.equal(
      impl.trackStyle.backgroundColor,
      nativeTheme.color.semantic.dark["border-default"],
      `${name}: track bg`,
    );
    // fill は primary.500 / status.success.base（mode 非依存 = light と同値）
    assert.deepEqual(
      impl.fillStyle,
      resolveProgressStyles(nativeTheme, "light", name as ProgressVariant).fillStyle,
      `${name}: fill は mode 非依存`,
    );
  }
});

test("progress conformance: value clamp（0〜100 固定 + 非有限は 0）", () => {
  assert.equal(clampProgressValue(-10), 0);
  assert.equal(clampProgressValue(0), 0);
  assert.equal(clampProgressValue(65), 65);
  assert.equal(clampProgressValue(100), 100);
  assert.equal(clampProgressValue(150), 100);
  assert.equal(clampProgressValue(Number.NaN), 0);
});

test("progress conformance: recipe の variant / state 網羅が実装と一致（sizes / states なし）", () => {
  assert.deepEqual(
    new Set(Object.keys(progressRecipe.variants)),
    new Set(["primary", "success", "indeterminate"]),
  );
  assert.deepEqual(Object.keys(progressRecipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(progressRecipe.states ?? {}), []);
});
