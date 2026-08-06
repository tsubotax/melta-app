/**
 * text.styles — Text の pure style resolver（styleRefs conformance 対応で Text.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/text.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/text-conformance.test.ts が行う。
 */

import type { NativeTheme, FontSizeKey, FontWeightKey, FontWeightValue } from "../theme";
// theme index からの runtime import は ThemeProvider → react-native を引くため、
// pure module（line-height.ts / letter-spacing.ts）を直接参照する。
import { clampLineHeight, minRatioOf } from "../theme/line-height";
import { resolveLetterSpacing } from "../theme/letter-spacing";

/** letterSpacing の切替軸（text.recipe description の role prop に対応）。 */
export type TextRole = "heading" | "body";

/** Text の形状 style（mode 非依存部分。文字色は render 時に semantic colors から取る）。 */
export interface TextShape {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight?: FontWeightValue;
}

/**
 * variant / role / weight → 形状解決（text.recipe styleRefs の 1:1 写像）。
 * - fontSize token は複合値（px + lineHeight 比率）。theme 生成時に lineHeight は px 化済み。
 * - letterSpacing は em 比率 token のため fontSize × ratio で pt 化する（resolveLetterSpacing）。
 */
export function resolveTextShape(
  theme: NativeTheme,
  variant: FontSizeKey,
  role: TextRole,
  weight?: FontWeightKey,
): TextShape {
  const fs = theme.typography.fontSize[variant];
  return {
    fontSize: fs.fontSize,
    // 既定 theme は codegen 時点でクランプ済みだが、defineTheme で注入されたカスタム theme の
    // 値はここが最初の防波堤（機序と下限の根拠は theme/line-height.ts）。
    lineHeight: clampLineHeight(fs.fontSize, fs.lineHeight, minRatioOf(theme)),
    letterSpacing: resolveLetterSpacing(fs.fontSize, theme.typography.letterSpacingRatio[role]),
    ...(weight ? { fontWeight: theme.typography.fontWeight[weight] } : null),
  };
}
