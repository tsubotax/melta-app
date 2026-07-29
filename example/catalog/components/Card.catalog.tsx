/**
 * Card.catalog — Card の全 variant + レポートカード風 compose を実レンダ（設計書 §6）。
 *
 * レポートカードデモ: Card(media) の slot に Image(媒体) + Metric 行(サマリー指標) + Tag を compose。
 * Card 自体は Image/Metric 非依存で、呼び出し側（= ここでは catalog、本番は呼び出し側アプリ）が差し込む（§1）。
 * 画像化(PNG capture) 等のドメイン固有機能は呼び出し側アプリの機能（意思決定2）。ここは見た目まで。
 */

import { useState } from "react";
import { View } from "react-native";
import { Card, Image } from "melta-app";
import { Button, Text, Metric, Tag } from "melta-app";
import { useTheme } from "melta-app";

/**
 * 二重発火の手動 smoke（native の実機確認用）。
 *
 * jest（RNTL）の fireEvent は responder negotiation を再現しないので、実機で
 * 「primaryAction を押したときに面の onPress も発火しないか」は目で確かめるしかない。
 * 面と primaryAction に独立したカウンタを出し、**primaryAction を1回タップして
 * 内側だけ +1**（面のカウンタが動かない）ことを iOS / Android で確認する。
 */
function NestedPressSmoke() {
  const { theme } = useTheme();
  const [surface, setSurface] = useState(0);
  const [action, setAction] = useState(0);
  return (
    <Card
      variant="action"
      onPress={() => setSurface((n) => n + 1)}
      primaryAction={
        <Button label="primaryAction を押す" onPress={() => setAction((n) => n + 1)} />
      }
    >
      <Text variant="lg" role="heading" weight="semibold" color="text-heading">
        二重発火 smoke
      </Text>
      <Text variant="sm" color="text-muted">
        面: {surface} 回 / primaryAction: {action} 回
      </Text>
      <Text variant="xs" color="text-muted">
        ボタンを1回押して「面」が増えなければ正常。増えたら二重発火。
      </Text>
    </Card>
  );
}

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

      <NestedPressSmoke />

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
