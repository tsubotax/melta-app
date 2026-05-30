/**
 * TouringFeedScreen — dogfood 実画面（設計書 §7 育成フローの起点）。
 *
 * これは catalog の「気楽な compose」ではなく、D2I のツー活カード一覧を melta-app の公開 component
 * **だけ**で本気で組んだ実画面。目的は「画面を組むと何が足りないか」を実地で炙り出すこと。
 * 不足は `🔴 DOGFOOD不足:` でその場マークする（= 次に何を作るかの一次ソース）。
 *
 * 画像化(View→PNG)・軌跡描画・通過スポット連携は D2I/mobile 側機能（意思決定2）。ここは見た目まで。
 *
 * ----- dogfood で判明した不足（このファイルを書きながら記録） -----
 * 🔴 DOGFOOD不足-1: レイアウト primitive が無い（Stack/Row/Spacer）。
 *    画面の縦積み・横並び・gap を全部 生 <View style={{ flexDirection, gap }}> で手書きしている。
 *    DS なのに「箱の並べ方」だけ生 RN に落ちるのは穴。melta に Stack/Row(gap は token)が要る。
 * 🔴 DOGFOOD不足-2: Icon システムが無い。
 *    Button の leadingIcon / EmptyState の icon は ReactNode 受けだが、アイコンセット自体が無いので
 *    絵文字(🗺️ 等)や生 Text で代用している。実アプリには 閉じる/矢印/地図ピン/ハート 等の統一 Icon が要る。
 * 🔴 DOGFOOD不足-3: Screen 骨格（SafeArea + Header + Scroll）の primitive が無い。
 *    SafeAreaView + ScrollView + ヘッダーを毎画面 手書きになる。melta に Screen/Header があると dogfood が早い。
 * 🔴 DOGFOOD不足-4: Avatar が無い（投稿者表示）。Image を circle に clip すれば作れるが、
 *    radius=full + 固定サイズの Avatar は頻出なので primitive 化候補。
 * 🟡 DOGFOOD気付き-5: Card の media slot に Image を入れると、Card header/footer/children と media の
 *    縦順制御が呼び出し側まかせ。ツー活カードの「画像→タイトル→Metric→Tag」の定番並びは
 *    D2I 固有 compose（melta に上げない、§7 純度）でよい。境界は正しく機能している。
 */

import { SafeAreaView, ScrollView, View } from "react-native";
import { Text, Metric, Tag, Button } from "../src/primitives";
import { Card, Image, Skeleton, EmptyState } from "../src/components";
import { useTheme } from "../src/theme";

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
  const { theme, colors } = useTheme();
  return (
    <Card
      variant="media"
      media={<Image source={{ uri: item.imageUri }} aspectRatio={2} accessibilityLabel={item.title} />}
    >
      <Text variant="lg" role="heading" weight="bold" color="text-heading">
        {item.title}
      </Text>

      {/* 🔴 DOGFOOD不足-1: この横並び+gap が生 View 手書き（MetricsRow があれば1行） */}
      <View style={{ flexDirection: "row", gap: theme.spacing["6"], marginTop: theme.spacing["3"] }}>
        <Metric value={item.distanceKm} unit="km" label="走行距離" size="sm" />
        <Metric value={item.durationH} unit="h" label="走行時間" size="sm" />
        <Metric value={item.climbM} unit="m" label="獲得標高" size="sm" />
      </View>

      {/* 🔴 DOGFOOD不足-1: タグの折返し横並びも生 View */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.spacing["2"],
          marginTop: theme.spacing["3"],
        }}
      >
        {item.tags.map((t) => (
          <Tag key={t} label={t} />
        ))}
      </View>

      {/* 投稿者 + アクション。🔴 DOGFOOD不足-4: Avatar 無いので投稿者名のみ */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: theme.spacing["4"],
        }}
      >
        <Text variant="sm" color="text-muted">
          {item.author}
        </Text>
        {/* 🔴 DOGFOOD不足-2: Icon 無いので絵文字代用 */}
        <Button
          variant="subtle"
          size="small"
          label="シェア"
          leadingIcon={<Text style={{ color: colors["text-default"] }}>↗</Text>}
          onPress={() => {}}
        />
      </View>
    </Card>
  );
}

type FeedState = "loading" | "ready" | "empty";

export function TouringFeedScreen({ state = "ready" }: { state?: FeedState }) {
  const { theme, colors } = useTheme();

  return (
    // 🔴 DOGFOOD不足-3: Screen 骨格（SafeArea+Header+Scroll）が毎回手書き
    <SafeAreaView style={{ flex: 1, backgroundColor: colors["bg-page"] }}>
      {/* ヘッダー 🔴 DOGFOOD不足-3 */}
      <View
        style={{
          paddingHorizontal: theme.spacing["4"],
          paddingVertical: theme.spacing["3"],
          borderBottomWidth: 1,
          borderBottomColor: colors["border-default"],
        }}
      >
        <Text variant="xl" role="heading" weight="bold" color="text-heading">
          ツー活フィード
        </Text>
      </View>

      {state === "empty" ? (
        <EmptyState
          icon={<Text variant="3xl">🗺️</Text>}
          title="まだ記録がありません"
          description="ツーリングを記録すると、ここにツー活カードが並びます。"
          action={{ label: "記録をはじめる", onPress: () => {} }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.spacing["4"], gap: theme.spacing["4"] }}>
          {state === "loading"
            ? // ローディング: Skeleton card を3枚
              [0, 1, 2].map((i) => <Skeleton key={i} variant="card" />)
            : FEED.map((item) => <TouringCard key={item.id} item={item} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
