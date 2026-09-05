/**
 * ScreenHeader.catalog — Screen / Header の実レンダ（設計書 §6）。
 * Screen は flex:1 の画面骨格なので、catalog 内では固定高の枠に入れてプレビューする
 * （実画面での使用は ProjectFeedScreen が担当）。
 */

import { Pressable, View } from "react-native";
import { Screen, Header, Stack, Row, Text, Button } from "melta-app";
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
        title="プロジェクトフィード"
        trailing={<Button variant="subtle" size="small" label="編集" onPress={() => {}} />}
      />

      {/* 投稿フォーム相当の文字数と余白を持つ44pt操作で、Headerのslot配置を検査する。 */}
      <Header testID="header-actions" variant="actions" title="作業ログを残す"
        leading={<Pressable accessibilityRole="button" accessibilityLabel="閉じる"
          style={{ minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }} onPress={() => {}}>
          <Text variant="sm">閉</Text>
        </Pressable>}
        trailing={<Row gap="1">{["下書き", "投稿する"].map(label => (
          <Pressable key={label} accessibilityRole="button" accessibilityLabel={label}
            style={{ minWidth: theme.spacing["16"], minHeight: 44, paddingHorizontal: label === "投稿する" ? theme.spacing["4"] : undefined, justifyContent: "center", alignItems: "center" }} onPress={() => {}}>
            <Text variant="sm">{label}</Text>
          </Pressable>
        ))}</Row>} />

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
