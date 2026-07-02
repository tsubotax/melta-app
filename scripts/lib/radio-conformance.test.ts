/**
 * radio-conformance.test — recipes/app/radio.recipe.json（melta-contracts）と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の層B（button が模範例）と同型:
 *   pure style resolver（src/components/radio.styles.ts）の出力と recipe の styleRefs を
 *   token 解決（tokens.json を正とする）して突き合わせる。
 *
 * - circleStyle/dotStyle/labelStyle/groupLabelStyle/optionGap は variant 非依存の共通部として
 *   recipe では vertical にのみ載っている（recipe description）→ 実装が全 variant で同値を
 *   返すことも照合する。
 * - states.selected / error は circleStyle への差分。error は selected より優先（契約 stateSpecs）。
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
import {
  RADIO_SPEC,
  resolveRadioCircleStyle,
  resolveRadioGroupStyle,
  type RadioVariant,
} from "../../src/components/radio.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const radioRecipe = loadAppRecipe(contractsRoot, "radio.recipe.json") as AppRecipe & {
  variants: {
    vertical: {
      containerStyle: Record<string, unknown>;
      circleStyle: Record<string, unknown>;
      dotStyle: Record<string, unknown>;
      labelStyle: Record<string, unknown>;
      groupLabelStyle: Record<string, unknown>;
      optionGap: unknown;
    };
    horizontal: { containerStyle: Record<string, unknown> };
    "card-style": {
      containerStyle: Record<string, unknown>;
      cardStyle: Record<string, unknown>;
      cardSelectedStyle: Record<string, unknown>;
    };
  };
  states: {
    selected: { circleStyle: Record<string, unknown> };
    unselected: Record<string, unknown>;
    disabled: { style: Record<string, unknown> };
    error: { circleStyle: Record<string, unknown>; errorTextStyle: Record<string, unknown> };
  };
};

test("radio conformance: recipe のキー集合を固定（新キーが増えたら照合の追加を強制）", () => {
  assert.deepEqual(Object.keys(radioRecipe.variants).sort(), [
    "card-style",
    "horizontal",
    "vertical",
  ]);
  assert.deepEqual(Object.keys(radioRecipe.states ?? {}).sort(), [
    "disabled",
    "error",
    "selected",
    "unselected",
  ]);
  assert.deepEqual(Object.keys(radioRecipe.variants.vertical).sort(), [
    "circleStyle",
    "containerStyle",
    "dotStyle",
    "groupLabelStyle",
    "labelStyle",
    "optionGap",
  ]);
  assert.deepEqual(Object.keys(radioRecipe.variants.horizontal).sort(), ["containerStyle"]);
  assert.deepEqual(Object.keys(radioRecipe.variants["card-style"]).sort(), [
    "cardSelectedStyle",
    "cardStyle",
    "containerStyle",
  ]);
  assert.deepEqual(Object.keys(radioRecipe.states.selected).sort(), ["circleStyle"]);
  assert.deepEqual(Object.keys(radioRecipe.states.error).sort(), [
    "circleStyle",
    "errorTextStyle",
  ]);
});

test("radio conformance: vertical（共通部）の全スロットが実装と一致", () => {
  const group = resolveRadioGroupStyle(nativeTheme, "light", "vertical");
  const circle = resolveRadioCircleStyle(nativeTheme, "light", { selected: false });
  const recipe = resolveStyleRefs(
    tokens,
    radioRecipe.variants.vertical as unknown as Record<string, unknown>,
  );
  assert.deepEqual(group.containerStyle, recipe.containerStyle, "vertical: containerStyle");
  assert.deepEqual({ ...circle }, recipe.circleStyle, "vertical: circleStyle");
  assert.deepEqual(group.dotStyle, recipe.dotStyle, "vertical: dotStyle");
  assert.deepEqual(group.labelStyle, recipe.labelStyle, "vertical: labelStyle");
  assert.deepEqual(group.groupLabelStyle, recipe.groupLabelStyle, "vertical: groupLabelStyle");
  assert.equal(group.optionGap, recipe.optionGap, "vertical: optionGap");
  // vertical / horizontal は card スロットを持たない
  assert.equal(group.cardStyle, undefined, "vertical: cardStyle なし");
  assert.equal(group.cardSelectedStyle, undefined, "vertical: cardSelectedStyle なし");
});

test("radio conformance: horizontal / card-style の containerStyle + card スロットが実装と一致", () => {
  const horizontal = resolveRadioGroupStyle(nativeTheme, "light", "horizontal");
  assert.deepEqual(
    horizontal.containerStyle,
    resolveStyleRefs(tokens, radioRecipe.variants.horizontal.containerStyle),
    "horizontal: containerStyle",
  );

  const card = resolveRadioGroupStyle(nativeTheme, "light", "card-style");
  assert.deepEqual(
    card.containerStyle,
    resolveStyleRefs(tokens, radioRecipe.variants["card-style"].containerStyle),
    "card-style: containerStyle",
  );
  assert.deepEqual(
    card.cardStyle,
    resolveStyleRefs(tokens, radioRecipe.variants["card-style"].cardStyle),
    "card-style: cardStyle",
  );
  assert.deepEqual(
    card.cardSelectedStyle,
    resolveStyleRefs(tokens, radioRecipe.variants["card-style"].cardSelectedStyle),
    "card-style: cardSelectedStyle",
  );
});

test("radio conformance: 共通部（circle/dot/label/groupLabel/optionGap/errorText）が variant 非依存", () => {
  const vertical = resolveRadioGroupStyle(nativeTheme, "light", "vertical");
  for (const variant of ["horizontal", "card-style"] as RadioVariant[]) {
    const other = resolveRadioGroupStyle(nativeTheme, "light", variant);
    assert.deepEqual(other.dotStyle, vertical.dotStyle, `${variant}: dotStyle 共通`);
    assert.deepEqual(other.labelStyle, vertical.labelStyle, `${variant}: labelStyle 共通`);
    assert.deepEqual(other.groupLabelStyle, vertical.groupLabelStyle, `${variant}: groupLabelStyle 共通`);
    assert.equal(other.optionGap, vertical.optionGap, `${variant}: optionGap 共通`);
    assert.deepEqual(other.errorTextStyle, vertical.errorTextStyle, `${variant}: errorTextStyle 共通`);
  }
});

test("radio conformance: states.selected の circleStyle 差分 + dot 表示条件が実装と一致", () => {
  const impl = resolveRadioCircleStyle(nativeTheme, "light", { selected: true });
  const circleStyle = resolveStyleRefs(tokens, radioRecipe.states.selected.circleStyle);
  for (const key of Object.keys(radioRecipe.states.selected.circleStyle)) {
    assert.deepEqual(
      (impl as unknown as Record<string, unknown>)[key],
      circleStyle[key],
      `selected: circleStyle.${key}`,
    );
  }
  // unselected は差分なし宣言（= 基底の circleStyle そのまま）
  assert.deepEqual(radioRecipe.states.unselected, {}, "unselected: recipe に差分がある（実装は差分なし前提）");
});

test("radio conformance: states.error の circleStyle 差分 + errorTextStyle が実装と一致（selected より優先）", () => {
  const impl = resolveRadioCircleStyle(nativeTheme, "light", { selected: false, error: true });
  const circleStyle = resolveStyleRefs(tokens, radioRecipe.states.error.circleStyle);
  assert.equal(impl.borderColor, circleStyle.borderColor, "error: circleStyle.borderColor");
  // 契約 stateSpecs: selected と併用時は error の枠を優先（選択済みでもエラーなら赤枠）
  const both = resolveRadioCircleStyle(nativeTheme, "light", { selected: true, error: true });
  assert.equal(both.borderColor, circleStyle.borderColor, "error+selected: error の枠が優先");

  const group = resolveRadioGroupStyle(nativeTheme, "light", "vertical");
  assert.deepEqual(
    group.errorTextStyle,
    resolveStyleRefs(tokens, radioRecipe.states.error.errorTextStyle),
    "error: errorTextStyle",
  );
});

test("radio conformance: states.disabled の opacity が literal（RADIO_SPEC）と一致", () => {
  assert.deepEqual(Object.keys(radioRecipe.states.disabled.style).sort(), ["opacity"]);
  const style = resolveStyleRefs(tokens, radioRecipe.states.disabled.style);
  assert.equal(style.opacity, RADIO_SPEC.disabledOpacity, "disabled: opacity");
});

test("radio conformance: dark mode では semantic 色が dark 側から解決される", () => {
  const dark = nativeTheme.color.semantic.dark;
  const circle = resolveRadioCircleStyle(nativeTheme, "dark", { selected: false });
  assert.equal(circle.borderColor, dark["border-strong"], "dark: circleStyle.borderColor");
  const group = resolveRadioGroupStyle(nativeTheme, "dark", "card-style");
  assert.equal(group.labelStyle.color, dark["text-default"], "dark: labelStyle.color");
  assert.equal(group.groupLabelStyle.color, dark["text-heading"], "dark: groupLabelStyle.color");
  assert.equal(group.cardStyle?.borderColor, dark["border-default"], "dark: cardStyle.borderColor");
});
