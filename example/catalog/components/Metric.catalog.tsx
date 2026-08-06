/**
 * Metric.catalog — Metric primitive の全 size を実レンダ（設計書 §6）。
 * カード内の主役指標なので、サマリー風に複数 Metric を並べた例も置く（MetricsRow は
 * melta に作らず呼び出し側 compose とする方針、§1。ここは catalog 内の手 compose）。
 */

import { View } from "react-native";
import { Metric } from "melta-app";
import { useTheme } from "melta-app";
import { CONTRACTS } from "melta-app";

export function MetricCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["4"] }}>
      {/* size 別 */}
      <View style={{ flexDirection: "row", gap: theme.spacing["6"], alignItems: "flex-end" }}>
        {CONTRACTS.metric.sizes.map((s) => (
          <Metric key={s} value="78" unit="%" label={`size ${s}`} size={s} />
        ))}
      </View>
      {/* サマリー風（レポートカードの compose イメージ） */}
      <View style={{ flexDirection: "row", gap: theme.spacing["8"] }}>
        <Metric value="78" unit="%" label="進捗率" size="md" />
        <Metric value="1,240" unit="万円" label="予算消化" size="md" />
        <Metric value="12" unit="日" label="残日数" size="md" />
      </View>
    </View>
  );
}
