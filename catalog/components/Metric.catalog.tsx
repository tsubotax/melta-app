/**
 * Metric.catalog — Metric primitive の全 size を実レンダ（設計書 §6）。
 * ツー活カードの主役なので、走行サマリー風に複数 Metric を並べた例も置く（MetricsRow は
 * Phase1 では melta に作らず D2I compose、§1。ここは catalog 内の手 compose）。
 */

import { View } from "react-native";
import { Metric } from "../../src/primitives";
import { useTheme } from "../../src/theme";
import { CONTRACTS } from "../../src/contracts/contract-types";

export function MetricCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["4"] }}>
      {/* size 別 */}
      <View style={{ flexDirection: "row", gap: theme.spacing["6"], alignItems: "flex-end" }}>
        {CONTRACTS.metric.sizes.map((s) => (
          <Metric key={s} value="123.4" unit="km" label={`size ${s}`} size={s} />
        ))}
      </View>
      {/* 走行サマリー風（D2I ツー活カードの compose イメージ） */}
      <View style={{ flexDirection: "row", gap: theme.spacing["8"] }}>
        <Metric value="248.6" unit="km" label="走行距離" size="md" />
        <Metric value="5:42" unit="h" label="走行時間" size="md" />
        <Metric value="1,820" unit="m" label="獲得標高" size="md" />
      </View>
    </View>
  );
}
