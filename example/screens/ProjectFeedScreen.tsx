/**
 * ProjectFeedScreen — dogfood 実画面（設計書 §7 育成フローの起点）。
 *
 * これは catalog の「気楽な compose」ではなく、実プロダクトのカード一覧を melta-app の公開 component
 * **だけ**で本気で組んだ実画面。目的は「画面を組むと何が足りないか」を実地で炙り出すこと。
 * 不足は `🔴 DOGFOOD不足:` でその場マークする（= 次に何を作るかの一次ソース）。
 *
 * 画像化(View→PNG)等のドメイン固有機能は呼び出し側アプリの責務（意思決定2）。ここは見た目まで。
 *
 * ----- dogfood 履歴 -----
 * ✅ 解消済（P3 layout バッチで primitive 化）:
 *   - 不足-1 レイアウト primitive → Stack / Row（gap は token キー）
 *   - 不足-2 Icon システム → Icon（melta-app/icons、Charcoal 35 glyph）
 *   - 不足-3 Screen 骨格 → Screen（SafeArea + header slot + Scroll）+ Header
 *   - 不足-4 Avatar → Avatar（image / initials / status / Group）
 * 🟡 DOGFOOD気付き-5（現状維持）: Card の media slot と header/footer/children の縦順制御は
 *    呼び出し側まかせ。レポートカードの「画像→タイトル→Metric→Tag」の定番並びは
 *    呼び出し側固有 compose（melta に上げない、§7 純度）でよい。境界は正しく機能している。
 */

import { Text, Metric, Tag, Button, Stack, Row } from "melta-app";
import { Card, Image, Skeleton, EmptyState, Screen, Header, Avatar } from "melta-app";
import { Icon } from "melta-app/icons";

interface ProjectReport {
  id: string;
  title: string;
  imageUri: string;
  progressPct: string;
  budgetManYen: string;
  daysLeft: string;
  tags: string[];
  author: string;
}

const FEED: ProjectReport[] = [
  {
    id: "1",
    title: "東京プロジェクト",
    imageUri: "https://placehold.co/600x300/2b70ef/ffffff/png",
    progressPct: "78",
    budgetManYen: "1,240",
    daysLeft: "12",
    tags: ["都市計画", "進行中", "優先度高"],
    author: "tanaka_pm",
  },
  {
    id: "2",
    title: "大阪プロジェクト",
    imageUri: "https://placehold.co/600x300/059669/ffffff/png",
    progressPct: "45",
    budgetManYen: "680",
    daysLeft: "60",
    tags: ["広域交通計画", "レビュー待ち", "2週間"],
    author: "tanaka_pm",
  },
];

/** レポートカード1枚（呼び出し側固有 compose、melta の Card slot に primitive を差し込む、§7 純度）。 */
function ReportCard({ item }: { item: ProjectReport }) {
  return (
    <Card
      variant="media"
      media={<Image source={{ uri: item.imageUri }} aspectRatio={2} accessibilityLabel={item.title} />}
    >
      <Stack gap="3">
        <Text variant="lg" role="heading" weight="bold" color="text-heading">
          {item.title}
        </Text>

        {/* サマリー指標（旧: 生 View 手書き → Row。不足-1 解消） */}
        <Row gap="6">
          <Metric value={item.progressPct} unit="%" label="進捗率" size="sm" />
          <Metric value={item.budgetManYen} unit="万円" label="予算消化" size="sm" />
          <Metric value={item.daysLeft} unit="日" label="残日数" size="sm" />
        </Row>

        {/* タグの折返し横並び（旧: 生 View → Row wrap） */}
        <Row gap="2" wrap>
          {item.tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </Row>

        {/* 担当者 + アクション（旧: Avatar 無し・絵文字 Icon 代用 → Avatar + Icon。不足-2 / -4 解消） */}
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

export function ProjectFeedScreen({ state = "ready" }: { state?: FeedState }) {
  // 旧: SafeAreaView + ScrollView + ヘッダー手書き → Screen + Header（不足-3 解消）
  return (
    <Screen
      variant={state === "empty" ? "fixed" : "scroll"}
      padding={state === "empty" ? "none" : "4"}
      header={<Header title="プロジェクトフィード" />}
    >
      {state === "empty" ? (
        <EmptyState
          icon={<Icon name="info" size="lg" color="text-muted" />}
          title="まだプロジェクトがありません"
          description="プロジェクトを登録すると、ここにレポートカードが並びます。"
          action={{ label: "プロジェクトを登録", onPress: () => {} }}
        />
      ) : (
        <Stack gap="4">
          {state === "loading"
            ? // ローディング: Skeleton card を3枚
              [0, 1, 2].map((i) => <Skeleton key={i} variant="card" />)
            : FEED.map((item) => <ReportCard key={item.id} item={item} />)}
        </Stack>
      )}
    </Screen>
  );
}
