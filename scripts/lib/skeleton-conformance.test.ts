/**
 * skeleton-conformance.test — recipes/app/skeleton.recipe.json と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の「層B: button styleRefs conformance」と同型。
 * pure resolver（src/components/skeleton.styles.ts）の出力と recipe の styleRefs を
 * token 解決（tokens.json を正とする）して突き合わせる。
 * elevation / motion だけは複合 token のため、期待値を生成物 native-theme
 * （freshness は CI 担保済み）を同パスで walk した正規化済み値と比較する。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveContractsRoot } from "./contracts-root.js";
import {
  loadAppRecipe,
  resolveStyleRefs,
  walkTokenPath,
  type AppRecipe,
} from "./recipe-conformance.js";
import {
  resolveSkeletonVariants,
  resolveSkeletonStates,
  type SkeletonVariant,
  type SkeletonState,
} from "../../src/components/skeleton.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface SkeletonVariantRecipe {
  style: Record<string, unknown>;
  barStyle?: Record<string, unknown>;
}

interface SkeletonStateRecipe {
  style?: Record<string, unknown>;
  animation?: Record<string, unknown>;
}

const skeletonRecipe = loadAppRecipe(contractsRoot, "skeleton.recipe.json") as AppRecipe & {
  variants: Record<string, SkeletonVariantRecipe>;
  states: Record<string, SkeletonStateRecipe>;
};

/**
 * recipe の style 値 1 個 → 期待値へ解決する。
 * - elevation.* / motion.* は複合 token（resolveTokenScalar は raw node を返す）のため、
 *   nativeTheme を同じ token パスで walk した正規化済み値を期待値にする
 *   （duration は ms 数値、elevation は iOS shadow* + Android elevation の複合 style）。
 * - それ以外（scalar token / literal）は resolveStyleRefs（tokens.json が正）で解決する。
 */
function expectedValue(value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const token = (value as { token?: unknown }).token;
    if (typeof token === "string" && (token.startsWith("elevation.") || token.startsWith("motion."))) {
      const resolved = walkTokenPath(nativeTheme, token);
      assert.notEqual(resolved, undefined, `nativeTheme に無い複合 token パス: ${token}`);
      return resolved;
    }
  }
  return resolveStyleRefs(tokens, { v: value }).v;
}

/** slot（style / barStyle / animation）のキー集合一致 + 全キーの値一致を照合する。 */
function assertSlotConforms(
  implSlot: Record<string, unknown>,
  recipeSlot: Record<string, unknown>,
  label: string,
) {
  assert.deepEqual(
    Object.keys(implSlot).sort(),
    Object.keys(recipeSlot).sort(),
    `${label}: キー集合が recipe と不一致`,
  );
  for (const [key, raw] of Object.entries(recipeSlot)) {
    assert.deepEqual(implSlot[key], expectedValue(raw), `${label}.${key}`);
  }
}

test("skeleton conformance: 全 variant の style / barStyle が実装 resolver と recipe で一致", () => {
  const impl = resolveSkeletonVariants(nativeTheme, "light");
  for (const [name, variantRecipe] of Object.entries(skeletonRecipe.variants)) {
    const implVariant = impl[name as SkeletonVariant] as unknown as
      | { style: Record<string, unknown>; barStyle?: Record<string, unknown> }
      | undefined;
    assert.ok(implVariant, `実装に無い variant: ${name}`);
    assertSlotConforms(implVariant.style, variantRecipe.style, `${name}.style`);
    if (variantRecipe.barStyle) {
      assert.ok(implVariant.barStyle, `${name}: recipe が barStyle を持つのに実装に無い`);
      assertSlotConforms(implVariant.barStyle, variantRecipe.barStyle, `${name}.barStyle`);
    } else {
      assert.equal(implVariant.barStyle, undefined, `${name}: recipe に無い barStyle を実装が持つ`);
    }
  }
});

test("skeleton conformance: states.loading の style / animation（pulse）が実装と recipe で一致", () => {
  const impl = resolveSkeletonStates(nativeTheme);
  const loading = skeletonRecipe.states.loading;
  assert.ok(loading, "recipe に states.loading が無い");
  assertSlotConforms({ ...impl.loading.style }, loading.style ?? {}, "loading.style");
  assertSlotConforms({ ...impl.loading.animation }, loading.animation ?? {}, "loading.animation");
});

test("skeleton conformance: states.loaded はアンマウント（style 差分なし）で実装と recipe が一致", () => {
  const impl = resolveSkeletonStates(nativeTheme);
  const loaded = skeletonRecipe.states.loaded;
  assert.ok(loaded, "recipe に states.loaded が無い");
  assertSlotConforms(impl.loaded.style, loaded.style ?? {}, "loaded.style");
  assert.equal(loaded.animation, undefined, "loaded: recipe に無い animation");
});

test("skeleton conformance: recipe の variant / state 網羅が実装の型と一致（欠落・過剰なし）", () => {
  const implVariants = new Set<string>(["text", "circle", "card"] satisfies SkeletonVariant[]);
  assert.deepEqual(new Set(Object.keys(skeletonRecipe.variants)), implVariants);
  const implStates = new Set<string>(["loading", "loaded"] satisfies SkeletonState[]);
  assert.deepEqual(new Set(Object.keys(skeletonRecipe.states)), implStates);
  assert.deepEqual(Object.keys(skeletonRecipe.sizes ?? {}), [], "skeleton に sizes は無い想定");
});
