/**
 * text-conformance.test — recipes/app/text.recipe.json と実装 resolver の機械照合（層B）。
 *
 * button（recipe-conformance.test.ts 層B）と同型。pure resolver（src/primitives/text.styles.ts）の
 * 出力と recipe の styleRefs を token 解決して突き合わせる。
 * - fontSize token は複合値（px + lineHeight 比率）。lineHeight は px × 比率（丸め）を期待値側で再現。
 * - letterSpacing は em 比率 token。実装は fontSize × ratio で pt 化するので、期待値側も同じ掛け算を再現。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveContractsRoot,
  loadAppRecipe,
  resolveStyleRefs,
  walkTokenPath,
  type AppRecipe,
} from "./recipe-conformance.js";
import { resolveTextShape } from "../../src/primitives/text.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";
import {
  DEFAULT_MIN_LINE_HEIGHT_RATIO,
  clampLineHeight,
} from "../../src/theme/line-height.js";
import type { FontSizeKey } from "../../src/theme/types.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface TextVariantRecipe {
  style: { fontSize: { token: string }; letterSpacing: { token: string } };
}

const textRecipe = loadAppRecipe(contractsRoot, "text.recipe.json") as AppRecipe & {
  variants: Record<string, TextVariantRecipe>;
};

test("text conformance: 全 variant の fontSize / lineHeight / letterSpacing が実装 resolver と recipe で一致", () => {
  for (const [name, variantRecipe] of Object.entries(textRecipe.variants)) {
    assert.ok(
      nativeTheme.typography.fontSize[name as FontSizeKey],
      `実装（theme.typography.fontSize）に無い variant: ${name}`,
    );
    // recipe style のキー集合を固定（新キーが増えたら黙って通らず、照合の追加を強制する。Codex L-1）
    assert.deepEqual(
      Object.keys(variantRecipe.style).sort(),
      ["fontSize", "letterSpacing"],
      `${name}: recipe style のキー集合が変わった（このテストに照合を追加すること）`,
    );
    const impl = resolveTextShape(nativeTheme, name as FontSizeKey, "body");
    const style = resolveStyleRefs(tokens, variantRecipe.style) as {
      fontSize: number;
      letterSpacing: number;
    };

    // fontSize: token の px がそのまま実装値
    assert.equal(style.fontSize, impl.fontSize, `${name}: fontSize`);

    // lineHeight: fontSize token は複合値。px × lineHeight 比率（丸め）を、行間の安全下限
    // （minLineHeightRatio、切り上げ）でクランプした値を期待値側で再現（normalize-tokens と同式。
    // 下限の根拠は src/theme/line-height.ts）
    const fsNode = walkTokenPath(tokens, variantRecipe.style.fontSize.token) as {
      px: number;
      lineHeight: string;
    };
    assert.equal(
      clampLineHeight(
        fsNode.px,
        Math.round(fsNode.px * Number.parseFloat(fsNode.lineHeight)),
        nativeTheme.typography.minLineHeightRatio ?? DEFAULT_MIN_LINE_HEIGHT_RATIO,
      ),
      impl.lineHeight,
      `${name}: lineHeight`,
    );

    // letterSpacing: em 比率 token（resolveStyleRefs は ratio を返す）→ fontSize × ratio で pt 化
    assert.equal(style.fontSize * style.letterSpacing, impl.letterSpacing, `${name}: letterSpacing`);
  }
});

test("text conformance: role=heading の letterSpacing が typography.letterSpacing.heading と一致", () => {
  // recipe の variants は default の body を encode（recipe description 参照）。heading 側の ratio も
  // token（typography.letterSpacing.heading）と実装（letterSpacingRatio.heading）で同源であることを照合する。
  const ratio = resolveStyleRefs(tokens, { v: { token: "typography.letterSpacing.heading" } })
    .v as number;
  for (const name of Object.keys(textRecipe.variants)) {
    const impl = resolveTextShape(nativeTheme, name as FontSizeKey, "heading");
    assert.equal(impl.fontSize * ratio, impl.letterSpacing, `${name}: heading letterSpacing`);
  }
});

test("text conformance: recipe の variant 網羅が実装のサポート集合と一致（欠落・過剰なし）", () => {
  // 実装のサポート面 = theme.typography.fontSize のキー（variant はそのまま fontSize 段階を引く）
  const implVariants = new Set(Object.keys(nativeTheme.typography.fontSize));
  assert.deepEqual(new Set(Object.keys(textRecipe.variants)), implVariants);
});
