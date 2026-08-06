/**
 * checkbox-conformance.test — recipes/app/checkbox.recipe.json（melta-contracts）と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の層B と同型の styleRefs conformance:
 *   pure style resolver（src/components/checkbox.styles.ts）の出力と recipe の styleRefs を
 *   token 解決（tokens.json を正とする）して突き合わせる。
 *
 * - variants.indeterminate は prop indeterminate:true への写像（box の塗りは checked と同源）。
 * - states.checked / error は boxStyle への差分。error は checked より優先（実装側でも照合）。
 * - variants.disabled / hitSlop 44 確保は literal（CHECKBOX_SPEC）との照合で担保する。
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
import { CHECKBOX_SPEC, resolveCheckboxStyle } from "../../src/components/checkbox.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const checkboxRecipe = loadAppRecipe(contractsRoot, "checkbox.recipe.json") as AppRecipe & {
  variants: {
    default: {
      boxStyle: Record<string, unknown>;
      labelStyle: Record<string, unknown>;
      gap: unknown;
    };
    indeterminate: { boxStyle: Record<string, unknown> };
    disabled: { style: Record<string, unknown> };
  };
  states: {
    checked: { boxStyle: Record<string, unknown>; markColor: unknown };
    unchecked: Record<string, unknown>;
    error: { boxStyle: Record<string, unknown> };
  };
};

test("checkbox conformance: recipe のキー集合を固定（新キーが増えたら照合の追加を強制）", () => {
  assert.deepEqual(Object.keys(checkboxRecipe.variants).sort(), [
    "default",
    "disabled",
    "indeterminate",
  ]);
  assert.deepEqual(Object.keys(checkboxRecipe.states ?? {}).sort(), [
    "checked",
    "error",
    "unchecked",
  ]);
  assert.deepEqual(Object.keys(checkboxRecipe.variants.default).sort(), [
    "boxStyle",
    "gap",
    "labelStyle",
  ]);
  assert.deepEqual(Object.keys(checkboxRecipe.variants.default.boxStyle).sort(), [
    "backgroundColor",
    "borderColor",
    "borderRadius",
    "borderWidth",
    "height",
    "width",
  ]);
  assert.deepEqual(Object.keys(checkboxRecipe.variants.indeterminate).sort(), ["boxStyle"]);
  assert.deepEqual(Object.keys(checkboxRecipe.variants.disabled).sort(), ["style"]);
  assert.deepEqual(Object.keys(checkboxRecipe.states.checked).sort(), ["boxStyle", "markColor"]);
  assert.deepEqual(Object.keys(checkboxRecipe.states.error).sort(), ["boxStyle"]);
});

test("checkbox conformance: default variant（unchecked）の boxStyle / labelStyle / gap が実装と一致", () => {
  const impl = resolveCheckboxStyle(nativeTheme, "light", { checked: false });
  const recipe = resolveStyleRefs(
    tokens,
    checkboxRecipe.variants.default as unknown as Record<string, unknown>,
  );
  assert.deepEqual(impl.boxStyle, recipe.boxStyle, "default: boxStyle");
  assert.deepEqual(impl.labelStyle, recipe.labelStyle, "default: labelStyle");
  assert.equal(impl.gap, recipe.gap, "default: gap");
});

test("checkbox conformance: indeterminate variant の boxStyle が実装（indeterminate=true）と一致", () => {
  const impl = resolveCheckboxStyle(nativeTheme, "light", { checked: false, indeterminate: true });
  const boxStyle = resolveStyleRefs(tokens, checkboxRecipe.variants.indeterminate.boxStyle);
  assert.deepEqual(impl.boxStyle, boxStyle, "indeterminate: boxStyle");
});

test("checkbox conformance: states.checked の boxStyle 差分 + markColor が実装と一致", () => {
  const impl = resolveCheckboxStyle(nativeTheme, "light", { checked: true });
  const boxStyle = resolveStyleRefs(tokens, checkboxRecipe.states.checked.boxStyle);
  for (const key of Object.keys(checkboxRecipe.states.checked.boxStyle)) {
    assert.deepEqual(
      (impl.boxStyle as Record<string, unknown>)[key],
      boxStyle[key],
      `checked: boxStyle.${key}`,
    );
  }
  const markColor = resolveStyleRefs(tokens, { markColor: checkboxRecipe.states.checked.markColor });
  assert.equal(impl.markColor, markColor.markColor, "checked: markColor");
});

test("checkbox conformance: states.unchecked は差分なし（= default variant そのまま）", () => {
  assert.deepEqual(checkboxRecipe.states.unchecked, {}, "unchecked: recipe に差分がある（実装は差分なし前提）");
});

test("checkbox conformance: states.error の borderColor 差分が実装と一致（checked より優先）", () => {
  const impl = resolveCheckboxStyle(nativeTheme, "light", { checked: false, error: true });
  const boxStyle = resolveStyleRefs(tokens, checkboxRecipe.states.error.boxStyle);
  assert.equal(impl.boxStyle.borderColor, boxStyle.borderColor, "error: boxStyle.borderColor");
  // 契約 stateSpecs の error 優先規定（radio と同じ扱い）: checked と併用してもエラー枠が勝つ
  const both = resolveCheckboxStyle(nativeTheme, "light", { checked: true, error: true });
  assert.equal(both.boxStyle.borderColor, boxStyle.borderColor, "error+checked: error の枠が優先");
  assert.equal(
    both.boxStyle.backgroundColor,
    nativeTheme.color.primary["500"],
    "error+checked: 塗りは checked のまま",
  );
});

test("checkbox conformance: disabled variant の opacity と hitSlop 44 確保が literal（CHECKBOX_SPEC）と一致", () => {
  assert.deepEqual(Object.keys(checkboxRecipe.variants.disabled.style).sort(), ["opacity"]);
  const style = resolveStyleRefs(tokens, checkboxRecipe.variants.disabled.style);
  assert.equal(style.opacity, CHECKBOX_SPEC.disabledOpacity, "disabled: opacity");
  // recipe description の「実タッチ領域は hitSlop で 44 を確保」: box 20 + hitSlop 12×2 = 44
  assert.equal(CHECKBOX_SPEC.boxSize + CHECKBOX_SPEC.hitSlop * 2, 44, "hitSlop: タッチ領域 44pt");
});

test("checkbox conformance: dark mode では semantic 色が dark 側から解決される", () => {
  const impl = resolveCheckboxStyle(nativeTheme, "dark", { checked: false });
  const dark = nativeTheme.color.semantic.dark;
  assert.equal(impl.boxStyle.backgroundColor, dark["input-bg"], "dark: boxStyle.backgroundColor");
  assert.equal(impl.boxStyle.borderColor, dark["border-strong"], "dark: boxStyle.borderColor");
  assert.equal(impl.labelStyle.color, dark["text-default"], "dark: labelStyle.color");
  assert.equal(impl.markColor, dark["text-on-accent"], "dark: markColor");
});
