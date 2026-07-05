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

      {/* Row: サマリー指標（ProjectFeedScreen の生 View 手書きだった並び） */}
      <Row gap="6">
        <Metric value="78" unit="%" label="進捗率" size="sm" />
        <Metric value="1,240" unit="万円" label="予算消化" size="sm" />
        <Metric value="12" unit="日" label="残日数" size="sm" />
      </Row>

      {/* Row: タグの折返し */}
      <Row gap="2" wrap>
        {["都市計画", "進行中", "優先度高", "レビュー待ち", "予算超過", "完了"].map((t) => (
          <Tag key={t} label={t} />
        ))}
      </Row>

      {/* Row: justify=between（左右振り分け） */}
      <Row justify="between">
        <Text variant="sm" color="text-muted">
          tanaka_pm
        </Text>
        <Text variant="sm">justify=between →</Text>
      </Row>
    </Stack>
  );
}
