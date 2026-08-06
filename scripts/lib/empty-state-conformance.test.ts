/**
 * empty-state-conformance.test — recipes/app/empty-state.recipe.json と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の「層B: button styleRefs conformance」と同型。
 * pure resolver（src/components/empty-state.styles.ts）の出力と recipe の styleRefs を
 * token 解決（tokens.json を正とする）して突き合わせる。
 * empty-state は default variant のみ・4 slot（style / titleStyle / descriptionStyle / actionStyle）。
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
import { resolveEmptyStateStyles } from "../../src/components/empty-state.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const emptyStateRecipe = loadAppRecipe(contractsRoot, "empty-state.recipe.json") as AppRecipe & {
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

test("empty-state conformance: default variant の全 slot が実装 resolver と recipe で一致", () => {
  const impl = resolveEmptyStateStyles(nativeTheme, "light") as unknown as Record<
    string,
    Record<string, unknown>
  >;
  const recipeVariant = emptyStateRecipe.variants.default;
  assert.ok(recipeVariant, "recipe に default variant が無い");
  // slot 集合そのものも一致させる（recipe に無い slot を実装が持つ / その逆を検知）
  assert.deepEqual(
    Object.keys(impl).sort(),
    Object.keys(recipeVariant).sort(),
    "slot 集合が recipe と不一致",
  );
  for (const [slot, recipeSlot] of Object.entries(recipeVariant)) {
    assertSlotConforms(impl[slot], recipeSlot, `default.${slot}`);
  }
});

test("empty-state conformance: dark mode では semantic 色が dark 側から解決される", () => {
  const impl = resolveEmptyStateStyles(nativeTheme, "dark");
  assert.equal(impl.titleStyle.color, nativeTheme.color.semantic.dark["text-heading"]);
  assert.equal(impl.descriptionStyle.color, nativeTheme.color.semantic.dark["text-muted"]);
});

test("empty-state conformance: recipe の variant / state 網羅が実装と一致（default のみ・sizes / states なし）", () => {
  assert.deepEqual(Object.keys(emptyStateRecipe.variants), ["default"]);
  assert.deepEqual(Object.keys(emptyStateRecipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(emptyStateRecipe.states ?? {}), []);
});
