/**
 * SkeletonEmptyState.catalog — Skeleton 全 variant + EmptyState を実レンダ（設計書 §6）。
 */

import { View } from "react-native";
import { Skeleton, EmptyState } from "melta-app";
import { Text } from "melta-app";
import { useTheme } from "melta-app";

export function SkeletonEmptyStateCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["4"] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing["4"] }}>
        <Skeleton variant="circle" />
        <View style={{ flex: 1 }}>
          <Skeleton variant="text" lines={3} />
        </View>
      </View>
      <Skeleton variant="card" />
      <EmptyState
        icon={<Text variant="3xl">📋</Text>}
        title="まだプロジェクトがありません"
        description="プロジェクトを登録すると、ここにレポートカードが並びます。"
        action={{ label: "プロジェクトを登録", onPress: () => {} }}
      />
    </View>
  );
}
