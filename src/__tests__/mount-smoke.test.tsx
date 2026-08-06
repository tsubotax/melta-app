/**
 * mount-smoke — 全公開コンポーネントの RN mount smoke テスト（公開 P2）。
 *
 * node:test の conformance（値の照合）が拾えない「RN runtime で実際に mount できるか」を担保する。
 * @react-native/jest-preset + Testing Library で render し、tree が生成されることだけを見る
 * （見た目の正しさは styleRefs conformance、実機の見た目は example カタログの担当）。
 *
 * import は公開エントリ（../index）経由 — 利用者と同じ経路で mount できることの証明を兼ねる。
 */

import { describe, test, expect, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import {
  ThemeProvider,
  Text,
  Button,
  Tag,
  Metric,
  Card,
  Surface,
  Image,
  Skeleton,
  EmptyState,
  Stack,
  Row,
  Screen,
  Header,
  Avatar,
  TextField,
  Toggle,
  Checkbox,
  Radio,
  Alert,
  Toast,
  Progress,
  Modal,
  ActionSheet,
  BottomSheet,
} from "../index.js";
// Icon は subpath エントリ（react-native-svg 隔離、src/icons/index.ts 参照）。
// 利用者と同じ「melta-app/icons」相当の経路 = icons barrel 経由で import する。
import { Icon } from "../icons/index.js";

/** implemented 全コンポーネントの代表 render（DU の全分岐は conformance / catalog の担当、ここは 1 mount）。 */
const SMOKE_CASES: Array<[name: string, element: ReactElement]> = [
  ["Text", <Text variant="base">距離 120km</Text>],
  ["Button", <Button label="保存" onPress={() => {}} />],
  [
    "Button (iconOnly)",
    <Button iconOnly accessibilityLabel="追加" leadingIcon={<Text>+</Text>} />,
  ],
  ["Tag (basic)", <Tag label="人気" />],
  ["Tag (filter-chip)", <Tag variant="filter-chip" label="絞り込み" selected onToggle={() => {}} />],
  ["Metric", <Metric value="120" unit="km" label="距離" />],
  [
    "Card (basic)",
    <Card>
      <Text>本文</Text>
    </Card>,
  ],
  [
    "Card (action)",
    // action/link は primaryAction 必須（contract 2.1.0: 面自体は操作要素にしないので、
    // キーボード / スクリーンリーダーからの到達手段を内包する）。
    <Card
      variant="action"
      onPress={() => {}}
      primaryAction={<Button label="開く" onPress={() => {}} />}
    >
      <Text>タップ可能</Text>
    </Card>,
  ],
  [
    "Surface",
    <Surface padding="4">
      <Text>面</Text>
    </Surface>,
  ],
  ["Image", <Image source={{ uri: "https://example.com/x.png" }} aspectRatio={1.5} />],
  ["Skeleton (text)", <Skeleton variant="text" lines={2} />],
  ["Skeleton (card)", <Skeleton variant="card" />],
  ["EmptyState", <EmptyState title="記録がありません" description="最初のタスクを追加" />],
  [
    "Stack",
    <Stack gap="4">
      <Text>上</Text>
      <Text>下</Text>
    </Stack>,
  ],
  [
    "Row",
    <Row gap="2" justify="between" wrap>
      <Text>左</Text>
      <Text>右</Text>
    </Row>,
  ],
  [
    "Screen (scroll)",
    <Screen header={<Header title="フィード" />}>
      <Text>本文</Text>
    </Screen>,
  ],
  [
    "Screen (fixed)",
    <Screen variant="fixed" padding="none">
      <Text>固定</Text>
    </Screen>,
  ],
  ["Header", <Header title="設定" trailing={<Text>閉じる</Text>} />],
  ["Avatar (initials)", <Avatar name="Taro Tanaka" />],
  [
    "Avatar (image + status)",
    <Avatar name="tanaka_pm" source={{ uri: "https://example.com/a.png" }} status="online" />,
  ],
  [
    "Avatar.Group",
    <Avatar.Group>
      <Avatar name="A" size="small" />
      <Avatar name="B" size="small" />
    </Avatar.Group>,
  ],
  ["Icon", <Icon name="like-on" accessibilityLabel="いいね" />],
  ["Icon (decorative sm)", <Icon name="close" size="sm" color="text-muted" />],
  ["TextField", <TextField label="メール" value="" onChangeText={() => {}} helperText="半角英数" />],
  [
    "TextField (error)",
    <TextField label="メール" value="x" onChangeText={() => {}} variant="error" errorText="形式が不正です" />,
  ],
  ["TextField (disabled)", <TextField label="ID" value="fixed" onChangeText={() => {}} disabled />],
  ["Toggle", <Toggle value onValueChange={() => {}} label="通知" />],
  ["Toggle (off large disabled)", <Toggle value={false} onValueChange={() => {}} size="large" disabled />],
  ["Checkbox", <Checkbox label="同意します" checked onChange={() => {}} />],
  ["Checkbox (indeterminate)", <Checkbox label="全選択" checked={false} indeterminate onChange={() => {}} />],
  [
    "Radio",
    <Radio
      label="配送方法"
      options={[
        { label: "標準配送", value: "std" },
        { label: "速達", value: "exp" },
      ]}
      value="std"
      onChange={() => {}}
    />,
  ],
  [
    "Radio (card-style + error)",
    <Radio
      label="プラン"
      variant="card-style"
      options={[
        { label: "Free", value: "free", description: "無料" },
        { label: "Pro", value: "pro", description: "有料" },
      ]}
      value={undefined}
      onChange={() => {}}
      error="選択してください"
    />,
  ],
  ["Alert", <Alert variant="error" title="エラー" message="もう一度お試しください" />],
  ["Alert (info + close)", <Alert variant="info" message="お知らせ" onClose={() => {}} />],
  ["Toast", <Toast variant="success" message="保存しました" onClose={() => {}} />],
  [
    "Toast (action)",
    <Toast variant="warning" message="削除しました" actionLabel="元に戻す" onAction={() => {}} onClose={() => {}} />,
  ],
  ["Progress", <Progress value={65} label="アップロード進捗" />],
  ["Progress (indeterminate)", <Progress variant="indeterminate" label="読み込み中" />],
  [
    "Modal",
    <Modal visible title="確認" onClose={() => {}} footer={<Button label="実行" onPress={() => {}} />}>
      <Text>この操作を実行しますか？</Text>
    </Modal>,
  ],
  [
    "ActionSheet",
    <ActionSheet
      visible
      onClose={() => {}}
      title="操作を選択"
      actions={[
        { label: "共有", onPress: () => {} },
        { label: "削除", onPress: () => {}, destructive: true },
      ]}
    />,
  ],
  [
    "BottomSheet",
    <BottomSheet visible onClose={() => {}} title="絞り込み">
      <Text>フィルタ内容</Text>
    </BottomSheet>,
  ],
];

describe.each(["light", "dark"] as const)("mount smoke（%s mode）", (mode) => {
  test.each(SMOKE_CASES)("%s が mount できる", async (_name, element) => {
    const { toJSON } = await render(<ThemeProvider forcedMode={mode}>{element}</ThemeProvider>);
    expect(toJSON()).toBeTruthy();
  });
});

test("useTheme は ThemeProvider の外では throw する（誤用ガード）", async () => {
  // console.error（React の error boundary ログ）を握りつぶして assert だけ見る
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(render(<Text>裸</Text>)).rejects.toThrow(/ThemeProvider/);
  spy.mockRestore();
});
