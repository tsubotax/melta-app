/**
 * SurfaceImage.catalog — Surface + Image を実レンダ（設計書 §6）。
 * Surface はライブラリ化（公開 P1）で正式 export に昇格（契約・recipe を持つ implemented のため）。
 */

import { View } from "react-native";
import { Surface } from "melta-app";
import { Image } from "melta-app";
import { Text } from "melta-app";
import { useTheme } from "melta-app";

export function SurfaceImageCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["4"] }}>
      {/* Surface: elevation 別 */}
      <View style={{ flexDirection: "row", gap: theme.spacing["3"] }}>
        {(["none", "sm", "md"] as const).map((e) => (
          <Surface key={e} elevation={e} padding="4" style={{ flex: 1 }}>
            <Text variant="sm" color="text-muted">
              elevation {e}
            </Text>
          </Surface>
        ))}
      </View>
      {/* Image: aspectRatio + radius + fallback */}
      <Image
        source={{ uri: "https://placehold.co/600x300/2b70ef/ffffff/png" }}
        aspectRatio={2}
        radius="lg"
        accessibilityLabel="サンプル画像"
      />
      <Image
        source={{ uri: "https://invalid.example/broken.png" }}
        aspectRatio={3}
        radius="md"
        fallback={
          <Surface
            bg="bg-surface-alt"
            radius="md"
            padding="4"
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text variant="sm" color="text-muted">
              画像を読み込めません（fallback）
            </Text>
          </Surface>
        }
      />
    </View>
  );
}
