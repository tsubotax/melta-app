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
} from "../index";

/** implemented 全コンポーネントの代表 render（DU の全分岐は conformance / catalog の担当、ここは 1 mount）。 */
const SMOKE_CASES: Array<[name: string, element: ReactElement]> = [
  ["Text", <Text variant="base">走行 120km</Text>],
  ["Button", <Button label="保存" onPress={() => {}} />],
  [
    "Button (iconOnly)",
    <Button iconOnly accessibilityLabel="追加" leadingIcon={<Text>+</Text>} />,
  ],
  ["Tag (basic)", <Tag label="日帰り" />],
  ["Tag (filter-chip)", <Tag variant="filter-chip" label="絞り込み" selected onToggle={() => {}} />],
  ["Metric", <Metric value="120" unit="km" label="走行距離" />],
  [
    "Card (basic)",
    <Card>
      <Text>本文</Text>
    </Card>,
  ],
  [
    "Card (action)",
    <Card variant="action" onPress={() => {}}>
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
  ["EmptyState", <EmptyState title="記録がありません" description="最初のツーリングを追加" />],
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
