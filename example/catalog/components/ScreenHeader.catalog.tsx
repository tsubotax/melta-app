/**
 * ScreenHeader.catalog — Screen / Header の実レンダ（設計書 §6）。
 * Screen は flex:1 の画面骨格なので、catalog 内では固定高の枠に入れてプレビューする
 * （実画面での使用は TouringFeedScreen が担当）。
 */

import { View } from "react-native";
import { Screen, Header, Stack, Text, Button } from "melta-app";
import { useTheme } from "melta-app";

export function ScreenHeaderCatalog() {
  const { theme, colors } = useTheme();
  const frame = {
    height: 220,
    borderWidth: 1,
    borderColor: colors["border-default"],
    borderRadius: theme.radius.md,
    overflow: "hidden" as const,
  };
  return (
    <Stack gap="4">
      {/* Header 単体（leading / trailing slot） */}
      <Header
        title="ツー活フィード"
        trailing={<Button variant="subtle" size="small" label="編集" onPress={() => {}} />}
      />

      {/* Screen(scroll) + header slot のミニプレビュー */}
      <View style={frame}>
        <Screen header={<Header title="scroll 画面" />}>
          <Stack gap="2">
            <Text variant="sm">Screen variant=&quot;scroll&quot; + header slot。</Text>
            <Text variant="sm" color="text-muted">
              content は ScrollView（padding は prop、default spacing.4）。
            </Text>
          </Stack>
        </Screen>
      </View>

      {/* Screen(fixed) のミニプレビュー */}
      <View style={frame}>
        <Screen variant="fixed">
          <Text variant="sm">Screen variant=&quot;fixed&quot;（flex:1 の View）。</Text>
        </Screen>
      </View>
    </Stack>
  );
}
