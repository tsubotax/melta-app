/**
 * card-conformance.test — recipes/app/card.recipe.json（melta-contracts）と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の層B と同型の styleRefs conformance:
 *   pure style resolver（src/components/card.styles.ts）の出力と recipe の styleRefs を
 *   token 解決（tokens.json を正とする）して突き合わせる。
 *
 * - elevation は iOS shadow* + Android elevation の複合 token で resolveTokenScalar は scalar 化しない。
 *   期待値は nativeTheme.elevation[key]（生成物、freshness は CI 担保済み）を正として、
 *   実装出力に spread されていることを照合する。
 * - action / link は pressedStyle（elevation sm→md）、media は bodyStyle（内側 clip View の padding）を持つ。
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
  CARD_INTERACTIVE,
  resolveCardShape,
  resolveCardBodyStyle,
  type CardVariant,
} from "../../src/components/card.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface CardVariantRecipe {
  style: Record<string, unknown>;
  pressedStyle?: Record<string, unknown>;
  bodyStyle?: Record<string, unknown>;
}

const cardRecipe = loadAppRecipe(contractsRoot, "card.recipe.json") as AppRecipe & {
  variants: Record<string, CardVariantRecipe>;
};

/** recipe の elevation 値（{token:"elevation.sm"} 形式）から theme の elevation キーを取り出す。 */
function elevationKey(value: unknown): keyof typeof nativeTheme.elevation {
  const token = (value as { token?: unknown } | null)?.token;
  assert.equal(typeof token, "string", "elevation は token 参照であること");
  const [group, key] = String(token).split(".");
  assert.equal(group, "elevation", `elevation スロットが別グループの token を指している: ${String(token)}`);
  assert.ok(key in nativeTheme.elevation, `theme に無い elevation キー: ${key}`);
  return key as keyof typeof nativeTheme.elevation;
}

/** impl 出力に nativeTheme.elevation[key]（shadow* + Android elevation）が全部入っていることを照合。 */
function assertElevation(impl: Record<string, unknown>, recipeValue: unknown, label: string): void {
  const expected = nativeTheme.elevation[elevationKey(recipeValue)];
  for (const [k, v] of Object.entries(expected)) {
    assert.deepEqual(impl[k], v, `${label}: elevation → ${k}`);
  }
}

test("card conformance: 全 variant の style 全キーが実装 resolver と recipe で一致", () => {
  for (const [name, variantRecipe] of Object.entries(cardRecipe.variants)) {
    const impl = resolveCardShape(nativeTheme, "light", name as CardVariant) as Record<
      string,
      unknown
    >;
    const style = resolveStyleRefs(tokens, variantRecipe.style);
    for (const key of Object.keys(variantRecipe.style)) {
      if (key === "elevation") {
        assertElevation(impl, variantRecipe.style[key], name);
        continue;
      }
      assert.deepEqual(impl[key], style[key], `${name}: style.${key}`);
    }
    // media は外枠 padding なし（bodyStyle 側が持つ）。recipe にキーが無い場合は実装にも無いこと。
    if (!("padding" in variantRecipe.style)) {
      assert.ok(!("padding" in impl), `${name}: recipe に無い padding が外枠 style に入っている`);
    }
  }
});

test("card conformance: pressedStyle（action/link の elevation sm→md）が実装と一致", () => {
  for (const [name, variantRecipe] of Object.entries(cardRecipe.variants)) {
    const pressed = resolveCardShape(nativeTheme, "light", name as CardVariant, true) as Record<
      string,
      unknown
    >;
    if (!variantRecipe.pressedStyle) {
      // pressedStyle 無し = 非インタラクティブ。pressed でも外枠 style が変わらないこと。
      assert.equal(
        CARD_INTERACTIVE[name as CardVariant],
        false,
        `${name}: pressedStyle 無しなのに実装が interactive`,
      );
      assert.deepEqual(
        pressed,
        resolveCardShape(nativeTheme, "light", name as CardVariant, false),
        `${name}: 非インタラクティブなのに pressed で style が変わる`,
      );
      continue;
    }
    assert.equal(
      CARD_INTERACTIVE[name as CardVariant],
      true,
      `${name}: pressedStyle ありなのに実装が non-interactive`,
    );
    for (const key of Object.keys(variantRecipe.pressedStyle)) {
      // pressedStyle は現状 elevation のみ。別キーが増えたらテストの照合対象を拡張する。
      assert.equal(key, "elevation", `${name}: pressedStyle の未対応キー ${key}（テストを拡張すること）`);
      assertElevation(pressed, variantRecipe.pressedStyle[key], `${name}: pressed`);
    }
  }
});

test("card conformance: bodyStyle（media の内側 clip View padding）が実装と一致", () => {
  for (const [name, variantRecipe] of Object.entries(cardRecipe.variants)) {
    const impl = resolveCardBodyStyle(nativeTheme, name as CardVariant);
    if (!variantRecipe.bodyStyle) {
      assert.equal(impl, undefined, `${name}: recipe に bodyStyle が無いのに実装が body style を持つ`);
      continue;
    }
    assert.ok(impl, `${name}: recipe に bodyStyle があるのに実装が body style を持たない`);
    const body = resolveStyleRefs(tokens, variantRecipe.bodyStyle);
    assert.deepEqual({ ...impl }, body, `${name}: bodyStyle`);
  }
});

test("card conformance: recipe の variant 網羅が実装の型と一致（欠落・過剰なし）", () => {
  const implVariants = new Set<string>([
    "basic",
    "media",
    "action",
    "link",
  ] satisfies CardVariant[]);
  assert.deepEqual(new Set(Object.keys(cardRecipe.variants)), implVariants);
});
