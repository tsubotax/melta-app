/**
 * metric.styles — Metric の pure style resolver（styleRefs conformance 対応で Metric.tsx から分離）。
 *
 * react-native を import しない純粋モジュール（型 import のみ可）にすることで node テスト
 * （tsx --test）から直接実行できる。recipes/app/metric.recipe.json（melta-contracts の
 * styleRefs）との機械照合は scripts/lib/metric-conformance.test.ts が行う。
 */

import type { FontVariant } from "react-native";
import type { NativeTheme, ThemeMode, FontSizeKey, FontWeightValue } from "../theme";
// theme index からの runtime import は ThemeProvider → react-native を引くため pure module を直接参照
import { DEFAULT_MIN_LINE_HEIGHT_RATIO, clampLineHeight } from "../theme/line-height";

export type MetricSize = "sm" | "md" | "lg";

/**
 * size → value / unit の fontSize token（metric.recipe sizes と整合）。
 * unit は value の1段下の fontSize（ベースライン揃え用）。
 */
export const METRIC_FONT: Record<MetricSize, { value: FontSizeKey; unit: FontSizeKey }> = {
  sm: { value: "lg", unit: "base" },
  md: { value: "2xl", unit: "lg" },
  lg: { value: "3xl", unit: "xl" },
};

export interface MetricStyles {
  /** value（数値本体）: tabular-nums で桁揃え + bold + text-heading。 */
  valueStyle: {
    fontSize: number;
    lineHeight: number;
    fontWeight: FontWeightValue;
    color: string;
    fontVariant: FontVariant[];
  };
  /** unit（単位）: value の1段下 fontSize / medium / text-muted / marginLeft spacing.1。 */
  unitStyle: {
    fontSize: number;
    fontWeight: FontWeightValue;
    color: string;
    marginLeft: number;
  };
  /** label（ラベル）: sm / text-muted。 */
  labelStyle: {
    fontSize: number;
    color: string;
  };
}

/** size → value / unit / label の style 解決（metric.recipe styleRefs の 1:1 写像）。 */
export function resolveMetricStyles(
  theme: NativeTheme,
  mode: ThemeMode,
  size: MetricSize,
): MetricStyles {
  const sem = theme.color.semantic[mode];
  const fontSize = theme.typography.fontSize;
  const font = METRIC_FONT[size];
  return {
    valueStyle: {
      fontSize: fontSize[font.value].fontSize,
      // カスタム theme の未クランプ値への防波堤（text.styles.ts と同じ。根拠は theme/line-height.ts）
      lineHeight: clampLineHeight(
        fontSize[font.value].fontSize,
        fontSize[font.value].lineHeight,
        theme.typography.minLineHeightRatio ?? DEFAULT_MIN_LINE_HEIGHT_RATIO,
      ),
      fontWeight: theme.typography.fontWeight.bold,
      color: sem["text-heading"],
      fontVariant: ["tabular-nums"],
    },
    unitStyle: {
      fontSize: fontSize[font.unit].fontSize,
      fontWeight: theme.typography.fontWeight.medium,
      color: sem["text-muted"],
      marginLeft: theme.spacing["1"],
    },
    labelStyle: {
      fontSize: fontSize.sm.fontSize,
      color: sem["text-muted"],
    },
  };
}
