/**
 * TouringFeedScreen — dogfood 実画面（設計書 §7 育成フローの起点）。
 *
 * これは catalog の「気楽な compose」ではなく、D2I のツー活カード一覧を melta-app の公開 component
 * **だけ**で本気で組んだ実画面。目的は「画面を組むと何が足りないか」を実地で炙り出すこと。
 * 不足は `🔴 DOGFOOD不足:` でその場マークする（= 次に何を作るかの一次ソース）。
 *
 * 画像化(View→PNG)・軌跡描画・通過スポット連携は D2I/mobile 側機能（意思決定2）。ここは見た目まで。
 *
 * ----- dogfood 履歴 -----
 * ✅ 解消済（P3 layout バッチで primitive 化）:
 *   - 不足-1 レイアウト primitive → Stack / Row（gap は token キー）
 *   - 不足-2 Icon システム → Icon（melta-app/icons、Charcoal 35 glyph）
 *   - 不足-3 Screen 骨格 → Screen（SafeArea + header slot + Scroll）+ Header
 *   - 不足-4 Avatar → Avatar（image / initials / status / Group）
 * 🟡 DOGFOOD気付き-5（現状維持）: Card の media slot と header/footer/children の縦順制御は
 *    呼び出し側まかせ。ツー活カードの「画像→タイトル→Metric→Tag」の定番並びは
 *    D2I 固有 compose（melta に上げない、§7 純度）でよい。境界は正しく機能している。
 */

import { Text, Metric, Tag, Button, Stack, Row } from "melta-app";
import { Card, Image, Skeleton, EmptyState, Screen, Header, Avatar } from "melta-app";
import { Icon } from "melta-app/icons";

interface TouringActivity {
  id: string;
  title: string;
  imageUri: string;
  distanceKm: string;
  durationH: string;
  climbM: string;
  tags: string[];
  author: string;
}

const FEED: TouringActivity[] = [
  {
    id: "1",
    title: "道東ぐるり 摩周湖・屈斜路湖",
    imageUri: "https://placehold.co/600x300/2b70ef/ffffff/png",
    distanceKm: "248.6",
    durationH: "5:42",
    climbM: "1,820",
    tags: ["道東", "絶景", "日帰り"],
    author: "ezo_rider",
  },
  {
    id: "2",
    title: "宗谷岬→エサヌカ線 北の果て",
    imageUri: "https://placehold.co/600x300/059669/ffffff/png",
    distanceKm: "312.0",
    durationH: "7:10",
    climbM: "640",
    tags: ["道北", "直線", "1泊2日"],
    author: "ezo_rider",
  },
];

/** ツー活カード1枚（D2I 固有 compose、melta の Card slot に primitive を差し込む、§7 純度）。 */
function TouringCard({ item }: { item: TouringActivity }) {
  return (
    <Card
      variant="media"
      media={<Image source={{ uri: item.imageUri }} aspectRatio={2} accessibilityLabel={item.title} />}
    >
      <Stack gap="3">
        <Text variant="lg" role="heading" weight="bold" color="text-heading">
          {item.title}
        </Text>

        {/* 走行サマリー（旧: 生 View 手書き → Row。不足-1 解消） */}
        <Row gap="6">
          <Metric value={item.distanceKm} unit="km" label="走行距離" size="sm" />
          <Metric value={item.durationH} unit="h" label="走行時間" size="sm" />
          <Metric value={item.climbM} unit="m" label="獲得標高" size="sm" />
        </Row>

        {/* タグの折返し横並び（旧: 生 View → Row wrap） */}
        <Row gap="2" wrap>
          {item.tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </Row>

        {/* 投稿者 + アクション（旧: Avatar 無し・絵文字 Icon 代用 → Avatar + Icon。不足-2 / -4 解消） */}
        <Row justify="between">
          <Row gap="2">
            <Avatar name={item.author} size="small" />
            <Text variant="sm" color="text-muted">
              {item.author}
            </Text>
          </Row>
          <Button
            variant="subtle"
            size="small"
            label="シェア"
            leadingIcon={<Icon name="share-ios" size="sm" />}
            onPress={() => {}}
          />
        </Row>
      </Stack>
    </Card>
  );
}

type FeedState = "loading" | "ready" | "empty";

export function TouringFeedScreen({ state = "ready" }: { state?: FeedState }) {
  // 旧: SafeAreaView + ScrollView + ヘッダー手書き → Screen + Header（不足-3 解消）
  return (
    <Screen
      variant={state === "empty" ? "fixed" : "scroll"}
      padding={state === "empty" ? "none" : "4"}
      header={<Header title="ツー活フィード" />}
    >
      {state === "empty" ? (
        <EmptyState
          icon={<Icon name="discovery" size="lg" color="text-muted" />}
          title="まだ記録がありません"
          description="ツーリングを記録すると、ここにツー活カードが並びます。"
          action={{ label: "記録をはじめる", onPress: () => {} }}
        />
      ) : (
        <Stack gap="4">
          {state === "loading"
            ? // ローディング: Skeleton card を3枚
              [0, 1, 2].map((i) => <Skeleton key={i} variant="card" />)
            : FEED.map((item) => <TouringCard key={item.id} item={item} />)}
        </Stack>
      )}
    </Screen>
  );
}
