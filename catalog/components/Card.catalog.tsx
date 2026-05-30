/**
 * Card.catalog — Card の全 variant + ツー活カード風 compose を実レンダ（設計書 §6）。
 *
 * ツー活カードデモ: Card(media) の slot に Image(媒体) + Metric 行(走行サマリー) + Tag を compose。
 * Card 自体は Image/Metric 非依存で、呼び出し側（= ここでは catalog、本番は D2I）が差し込む（§1）。
 * 軌跡描画 / 通過スポット連携 / 画像化(PNG capture) は D2I 側機能（意思決定2）。ここは見た目まで。
 */

import { View } from "react-native";
import { Card, Image } from "../../src/components";
import { Text, Metric, Tag } from "../../src/primitives";
import { useTheme } from "../../src/theme";

export function CardCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["4"] }}>
      {/* basic */}
      <Card variant="basic">
        <Text variant="lg" role="heading" weight="semibold" color="text-heading">
          basic カード
        </Text>
        <Text variant="sm" color="text-muted">
          非インタラクティブなコンテナ。
        </Text>
      </Card>

      {/* action（pressed で影が深くなる） */}
      <Card variant="action" onPress={() => {}} accessibilityLabel="アクションカード">
        <Text variant="lg" role="heading" weight="semibold" color="text-heading">
          action カード
        </Text>
        <Text variant="sm" color="text-muted">
          押すと elevation sm→md。
        </Text>
      </Card>

      {/* link（action と同じく Pressable、用途差はリンク遷移） */}
      <Card variant="link" onPress={() => {}} accessibilityLabel="リンクカード">
        <Text variant="lg" role="heading" weight="semibold" color="text-heading">
          link カード
        </Text>
        <Text variant="sm" color="text-muted">
          リンク遷移用。pressed で elevation sm→md。
        </Text>
      </Card>

      {/* ツー活カード風（media + Metric 行 + Tag を compose）。
          media variant は非インタラクティブ（見た目デモ）。実際の押下は D2I 側で Pressable 包む or
          action/link と組合せる設計議論が必要（contract は variant 排他なので Phase1 は見た目まで）。 */}
      <Card
        variant="media"
        media={
          <Image
            source={{ uri: "https://placehold.co/600x300/2b70ef/ffffff/png" }}
            aspectRatio={2}
          />
        }
      >
        <Text variant="lg" role="heading" weight="bold" color="text-heading">
          道東ぐるり 248km
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: theme.spacing["6"],
            marginTop: theme.spacing["2"],
          }}
        >
          <Metric value="248.6" unit="km" label="走行距離" size="sm" />
          <Metric value="5:42" unit="h" label="走行時間" size="sm" />
          <Metric value="1,820" unit="m" label="獲得標高" size="sm" />
        </View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing["2"],
            marginTop: theme.spacing["3"],
          }}
        >
          <Tag label="道東" />
          <Tag label="絶景" />
          <Tag label="日帰り" />
        </View>
      </Card>
    </View>
  );
}
