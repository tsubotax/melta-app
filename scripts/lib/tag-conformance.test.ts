/**
 * tag-conformance.test — recipes/app/tag.recipe.json（melta-contracts）と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の層B と同型の styleRefs conformance:
 *   pure style resolver（src/primitives/tag.styles.ts）の出力と recipe の styleRefs を
 *   token 解決（tokens.json を正とする）して突き合わせる。
 *
 * - states.active / inactive は filter-chip variant の selected:boolean への写像（contract §2 mapping）。
 * - states.focus は FocusRing overlay（src/primitives/_internal/focus-ring.tsx）が実体だが、
 *   react-native を runtime import するため node テストから読めない。実装のハードコード値
 *   （borderWidth 2 / theme.color.primary.500）との literal 照合で担保する。
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
  resolveTagBase,
  resolveTagVariant,
  type TagVariant,
} from "../../src/primitives/tag.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface TagVariantRecipe {
  style: Record<string, unknown>;
  textStyle: Record<string, unknown>;
}

const tagRecipe = loadAppRecipe(contractsRoot, "tag.recipe.json") as AppRecipe & {
  variants: Record<string, TagVariantRecipe>;
  states: {
    active: { style: Record<string, unknown>; textStyle: Record<string, unknown> };
    inactive: { style: Record<string, unknown> };
    focus: { style: Record<string, unknown> };
  };
};

/** resolver 出力を recipe の style スロットと同じキー体系（RN style 名）に展開する。 */
function implContainerStyle(variant: TagVariant, selected = false): Record<string, unknown> {
  const v = resolveTagVariant(nativeTheme, "light", variant, selected);
  return {
    ...resolveTagBase(nativeTheme),
    backgroundColor: v.bg,
    ...(v.borderWidth != null ? { borderWidth: v.borderWidth, borderColor: v.border } : null),
  };
}

/** resolver 出力を recipe の textStyle スロットと同じキー体系に展開する。 */
function implTextStyle(variant: TagVariant, selected = false): Record<string, unknown> {
  const v = resolveTagVariant(nativeTheme, "light", variant, selected);
  return {
    fontSize: nativeTheme.typography.fontSize[v.font].fontSize,
    color: v.textColor,
  };
}

test("tag conformance: 全 variant の style / textStyle 全キーが実装 resolver と recipe で一致", () => {
  for (const [name, variantRecipe] of Object.entries(tagRecipe.variants)) {
    const container = implContainerStyle(name as TagVariant);
    const style = resolveStyleRefs(tokens, variantRecipe.style);
    for (const key of Object.keys(variantRecipe.style)) {
      assert.deepEqual(container[key], style[key], `${name}: style.${key}`);
    }

    const text = resolveStyleRefs(tokens, variantRecipe.textStyle);
    const implText = implTextStyle(name as TagVariant);
    for (const key of Object.keys(variantRecipe.textStyle)) {
      assert.deepEqual(implText[key], text[key], `${name}: textStyle.${key}`);
    }
  }
});

test("tag conformance: states.active（filter-chip selected=true）の差分が実装と一致", () => {
  const container = implContainerStyle("filter-chip", true);
  const style = resolveStyleRefs(tokens, tagRecipe.states.active.style);
  for (const key of Object.keys(tagRecipe.states.active.style)) {
    assert.deepEqual(container[key], style[key], `active: style.${key}`);
  }

  const text = resolveStyleRefs(tokens, tagRecipe.states.active.textStyle);
  const implText = implTextStyle("filter-chip", true);
  for (const key of Object.keys(tagRecipe.states.active.textStyle)) {
    assert.deepEqual(implText[key], text[key], `active: textStyle.${key}`);
  }
});

test("tag conformance: states.inactive は差分なし（= 非選択の filter-chip variant style そのまま）", () => {
  // recipe 側: inactive は空（variant style からの差分なし）宣言
  assert.deepEqual(tagRecipe.states.inactive.style, {}, "inactive: recipe に差分がある（実装は差分なし前提）");
  // 実装側: selected=false の解決結果が filter-chip variant style と一致すること
  const container = implContainerStyle("filter-chip", false);
  const variantStyle = resolveStyleRefs(tokens, tagRecipe.variants["filter-chip"].style);
  for (const key of Object.keys(tagRecipe.variants["filter-chip"].style)) {
    assert.deepEqual(container[key], variantStyle[key], `inactive: style.${key}`);
  }
});

test("tag conformance: states.focus が FocusRing 実装値と一致（literal 照合）", () => {
  // FocusRing（_internal/focus-ring.tsx）は borderWidth 2 / theme.color.primary.500 をハードコード。
  // react-native import のため node から読めず、値の literal 照合で recipe との一致を担保する。
  // キー集合も固定（recipe の focus に新キーが増えたら黙って通らず、照合の追加を強制する。Codex L-4）
  assert.deepEqual(
    Object.keys(tagRecipe.states.focus.style).sort(),
    ["borderColor", "borderWidth"],
    "focus: recipe のキー集合が変わった（このテストに照合を追加すること）",
  );
  const focus = resolveStyleRefs(tokens, tagRecipe.states.focus.style);
  assert.equal(focus.borderWidth, 2, "focus: borderWidth（FocusRing の固定値 2）");
  assert.equal(
    focus.borderColor,
    nativeTheme.color.primary["500"],
    "focus: borderColor（FocusRing は theme.color.primary.500）",
  );
});

test("tag conformance: recipe の variant 網羅が実装の型と一致（欠落・過剰なし）", () => {
  const implVariants = new Set<string>([
    "basic",
    "removable",
    "filter-chip",
  ] satisfies TagVariant[]);
  assert.deepEqual(new Set(Object.keys(tagRecipe.variants)), implVariants);
});
