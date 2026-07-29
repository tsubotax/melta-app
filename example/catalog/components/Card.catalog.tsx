/**
 * Card.catalog — Card の全 variant + レポートカード風 compose を実レンダ（設計書 §6）。
 *
 * レポートカードデモ: Card(media) の slot に Image(媒体) + Metric 行(サマリー指標) + Tag を compose。
 * Card 自体は Image/Metric 非依存で、呼び出し側（= ここでは catalog、本番は呼び出し側アプリ）が差し込む（§1）。
 * 画像化(PNG capture) 等のドメイン固有機能は呼び出し側アプリの機能（意思決定2）。ここは見た目まで。
 */

import { View } from "react-native";
import { Card, Image } from "melta-app";
import { Button, Text, Metric, Tag } from "melta-app";
import { useTheme } from "melta-app";

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

      {/* action（pressed で影が深くなる）。
          面自体は操作要素にしないので（contract 2.1.0）、キーボード / スクリーンリーダーからの
          到達手段として primaryAction が必須。 */}
      <Card
        variant="action"
        onPress={() => {}}
        primaryAction={<Button label="詳細を見る" onPress={() => {}} />}
      >
        <Text variant="lg" role="heading" weight="semibold" color="text-heading">
          action カード
        </Text>
        <Text variant="sm" color="text-muted">
          押すと elevation sm→md。
        </Text>
      </Card>

      {/* link（action と同じく Pressable、用途差はリンク遷移） */}
      <Card
        variant="link"
        onPress={() => {}}
        primaryAction={<Button variant="subtle" label="リンク先へ" onPress={() => {}} />}
      >
        <Text variant="lg" role="heading" weight="semibold" color="text-heading">
          link カード
        </Text>
        <Text variant="sm" color="text-muted">
          リンク遷移用。pressed で elevation sm→md。
        </Text>
      </Card>

      {/* レポートカード風（media + Metric 行 + Tag を compose）。
          media variant は非インタラクティブ（見た目デモ）。実際の押下は呼び出し側で Pressable 包む or
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
          東京プロジェクト
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: theme.spacing["6"],
            marginTop: theme.spacing["2"],
          }}
        >
          <Metric value="78" unit="%" label="進捗率" size="sm" />
          <Metric value="1,240" unit="万円" label="予算消化" size="sm" />
          <Metric value="12" unit="日" label="残日数" size="sm" />
        </View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing["2"],
            marginTop: theme.spacing["3"],
          }}
        >
          <Tag label="都市計画" />
          <Tag label="進行中" />
          <Tag label="優先度高" />
        </View>
      </Card>
    </View>
  );
}
