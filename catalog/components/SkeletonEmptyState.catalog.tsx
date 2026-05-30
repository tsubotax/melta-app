/**
 * SkeletonEmptyState.catalog — Skeleton 全 variant + EmptyState を実レンダ（設計書 §6）。
 */

import { View } from "react-native";
import { Skeleton, EmptyState } from "../../src/components";
import { Text } from "../../src/primitives";
import { useTheme } from "../../src/theme";

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
        icon={<Text variant="3xl">🗺️</Text>}
        title="まだ記録がありません"
        description="ツーリングを記録すると、ここにツー活カードが並びます。"
        action={{ label: "記録をはじめる", onPress: () => {} }}
      />
    </View>
  );
}
