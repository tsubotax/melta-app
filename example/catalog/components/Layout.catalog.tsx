/**
 * Layout.catalog — Stack / Row primitive の実レンダ（設計書 §6）。
 * dogfood 不足-1 の解消を目視確認する: 縦積み gap / 横並び / 折返し / justify。
 */

import { View } from "react-native";
import { Stack, Row, Text, Tag, Metric } from "melta-app";
import { useTheme } from "melta-app";

/** 中身の見えるダミー箱。 */
function Box({ label }: { label: string }) {
  const { theme, colors } = useTheme();
  return (
    <View
      style={{
        paddingVertical: theme.spacing["2"],
        paddingHorizontal: theme.spacing["3"],
        borderRadius: theme.radius.sm,
        backgroundColor: colors["bg-surface-alt"],
        borderWidth: 1,
        borderColor: colors["border-default"],
      }}
    >
      <Text variant="sm">{label}</Text>
    </View>
  );
}

export function LayoutCatalog() {
  return (
    <Stack gap="4">
      {/* Stack: 縦積み + gap */}
      <Stack gap="2">
        <Box label="Stack gap=2 (1)" />
        <Box label="Stack gap=2 (2)" />
        <Box label="Stack gap=2 (3)" />
      </Stack>

      {/* Row: 走行サマリー（TouringFeedScreen の生 View 手書きだった並び） */}
      <Row gap="6">
        <Metric value="248.6" unit="km" label="走行距離" size="sm" />
        <Metric value="5:42" unit="h" label="走行時間" size="sm" />
        <Metric value="1,820" unit="m" label="獲得標高" size="sm" />
      </Row>

      {/* Row: タグの折返し */}
      <Row gap="2" wrap>
        {["道東", "絶景", "日帰り", "ワインディング", "海沿い", "キャンプ"].map((t) => (
          <Tag key={t} label={t} />
        ))}
      </Row>

      {/* Row: justify=between（左右振り分け） */}
      <Row justify="between">
        <Text variant="sm" color="text-muted">
          ezo_rider
        </Text>
        <Text variant="sm">justify=between →</Text>
      </Row>
    </Stack>
  );
}
