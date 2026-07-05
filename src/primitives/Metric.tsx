/**
 * Metric — 数値 + 単位 + ラベルの指標表示 primitive（設計書 §1、意思決定3）。
 * contract: metric（app 先行定義）。カード内の主要指標表示に使う（進捗率 / 予算 / 残日数 等）。
 *
 * - value は tabular（fontVariant:["tabular-nums"]）で桁揃え。Text primitive は fontVariant を
 *   公開しないので、value は RN Text を直接使う。
 * - size(sm/md/lg) は value の fontSize token にマップ（contract の height は想定行高、実 fontSize は
 *   pure resolver（metric.styles.ts）で token 解決する。metric.contract intent 参照）。
 * - unit は value の1段下の fontSize でベースライン揃え。label は muted。
 * - a11y: value+unit+label を1つの accessibilityLabel に合成して読み上げる（contract a11y）。
 */

import { useMemo } from "react";
import { Text as RNText, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { CONTRACTS, type SizeOf } from "../contracts/contract-types";
import { resolveMetricStyles } from "./metric.styles";

type MetricSize = SizeOf<"metric">; // "sm" | "md" | "lg"

interface MetricProps {
  /** 整形済みの数値文字列（整形は呼び出し側）。 */
  value: string;
  /** 単位（"%" / "万円" / "日" 等）。 */
  unit?: string;
  /** ラベル（"進捗率" 等）。 */
  label?: string;
  size?: MetricSize;
  align?: "start" | "center";
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Metric({
  value,
  unit,
  label,
  size = "md",
  align = "start",
  style,
  testID,
}: MetricProps) {
  const { theme, mode } = useTheme();

  // 決定ロジックは pure resolver（metric.styles.ts）に分離済み — recipe との機械照合対象。
  const styles = useMemo(() => resolveMetricStyles(theme, mode, size), [theme, mode, size]);

  const a11yLabel = [value, unit, label].filter(Boolean).join(" ");

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={a11yLabel}
      style={[{ alignItems: align === "center" ? "center" : "flex-start" }, style]}
    >
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <RNText style={styles.valueStyle}>{value}</RNText>
        {unit != null && <RNText style={styles.unitStyle}>{unit}</RNText>}
      </View>
      {label != null && <RNText style={styles.labelStyle}>{label}</RNText>}
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Metric.__contract = CONTRACTS.metric;
