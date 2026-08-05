/**
 * line-height のユニットテスト（node:test、依存最小）。
 *   実行: npx tsx --test scripts/lib/line-height.test.ts
 *
 * 行間の安全下限（RN Android の字形 clip 対策。根拠は src/theme/line-height.ts のコメント）が
 * resolver 各所で正しく効くことを検査する。消費者 style の上書きに対する最終クランプ
 * （Text.tsx 側）は RN render が要るので src/__tests__/text-lineheight.test.tsx が受け持つ。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MIN_LINE_HEIGHT_RATIO,
  minLineHeightFor,
  clampLineHeight,
} from "../../src/theme/line-height.js";
import { resolveTextShape } from "../../src/primitives/text.styles.js";
import { resolveMetricStyles } from "../../src/primitives/metric.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";
import type { NativeTheme } from "../../src/theme/types.js";

test("minLineHeightFor: 切り上げで下限を割らない（round だと 46.4 → 46 で割る）", () => {
  assert.equal(minLineHeightFor(32, 1.45), 47); // 46.4 → 47（round なら 46 で下限割れ）
  assert.equal(minLineHeightFor(13, 1.45), 19); // 18.85 → 19
  assert.equal(minLineHeightFor(20, 1.45), 29); // ちょうど 29
});

test("clampLineHeight: 詰める方向だけ止める（広げる方向は宣言のまま）", () => {
  assert.equal(clampLineHeight(18, 36, 1.45), 36); // 2.0 宣言はそのまま
  assert.equal(clampLineHeight(13, 18, 1.45), 19); // 1.4 宣言は下限へ
});

test("clampLineHeight: 既定より低い比率の宣言（ラテン専用フォント等）ならクランプしない", () => {
  // CHANGELOG が公開仕様として許可している「下げる宣言」。1.21 なら 13px の 16 は合法のまま
  assert.equal(clampLineHeight(13, 16, 1.21), 16); // ceil(13 × 1.21) = 16 ちょうど
  assert.equal(clampLineHeight(13, 15, 1.21), 16); // 下限未満は 16 へ（下限自体は効き続ける）
});

/** typography だけ差し替えたカスタム theme を作る（他は既定を流用）。 */
function themeWith(typography: Partial<NativeTheme["typography"]>): NativeTheme {
  return {
    ...nativeTheme,
    typography: { ...nativeTheme.typography, ...typography },
  };
}

test("resolveTextShape: カスタム theme の未クランプ値を宣言比率でクランプする", () => {
  // LINE Seed JP 同梱の消費者を模す: 1.61 を宣言し、fontSize 側は詰めた値を持っている
  const theme = themeWith({
    minLineHeightRatio: 1.61,
    fontSize: {
      ...nativeTheme.typography.fontSize,
      xs: { fontSize: 13, lineHeight: 16 }, // 1.23 — modelog 事故時の詰め方
    },
  });
  const shape = resolveTextShape(theme, "xs", "body");
  assert.equal(shape.lineHeight, Math.ceil(13 * 1.61)); // 21
});

test("resolveTextShape: 宣言が無い theme は既定 1.45（日本語安全側）へ倒れる", () => {
  const { minLineHeightRatio: _omit, ...rest } = nativeTheme.typography;
  const theme = { ...nativeTheme, typography: rest } as NativeTheme;
  const shape = resolveTextShape(theme, "xs", "body");
  assert.equal(shape.lineHeight, Math.ceil(13 * DEFAULT_MIN_LINE_HEIGHT_RATIO)); // 19
});

test("resolveTextShape: 既定 theme（クランプ済み）の値はそのまま通る", () => {
  const shape = resolveTextShape(nativeTheme, "base", "body");
  assert.equal(shape.lineHeight, nativeTheme.typography.fontSize.base.lineHeight); // 36
});

test("resolveMetricStyles: valueStyle.lineHeight にも同じ下限が効く", () => {
  const theme = themeWith({
    minLineHeightRatio: 1.61,
    fontSize: {
      ...nativeTheme.typography.fontSize,
      "3xl": { fontSize: 32, lineHeight: 40 }, // 1.25 — 下限 ceil(32 × 1.61) = 52 未満
    },
  });
  const styles = resolveMetricStyles(theme, "light", "lg"); // lg の value は 3xl
  assert.equal(styles.valueStyle.lineHeight, Math.ceil(32 * 1.61)); // 52
});
