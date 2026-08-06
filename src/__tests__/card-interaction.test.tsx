/**
 * card-interaction — 押せる Card（variant=action / link）の押下の振る舞い。
 *
 * contract 2.1.0 は「カード面自体を操作要素にしない / 主アクションの操作要素を内包する」を
 * 要求しており、面と `primaryAction` が**入れ子の押下可能物**になる。この構造で一番怖いのは
 * **内側を押したときに外側も発火する（二重遷移）**こと。
 *
 * - web（react-native-web 0.21.2）は `PressResponder.onClick` が必ず `stopPropagation()` を
 *   呼んでから `onPress` を発火するのでバブルしない（dist をソース読解して確認済み）
 * - native は responder system が「一番内側が勝つ」だが、実測で固定しておく
 *
 * ## ⚠️ このテストが保証しないこと（過大評価しないための明記）
 *
 * RNTL の `fireEvent.press` は **イベント伝播も native の responder negotiation も実行しない**。
 * 押した要素から親へ遡って**最初に見つけた `onPress` を1つ直接呼ぶ**だけ。したがってここで
 * 確かめられるのは「**RNTL が primaryAction のハンドラを選び、Card のハンドラを直接は呼ばない**」
 * という**構造**であって、実機で親子の両方が発火しないことの証明ではない。
 *
 * 実機（iOS / Android）の二重発火は example カタログの手動 smoke（面と primaryAction に
 * 独立したカウンタを出し、primaryAction を1回タップして内側だけ +1 になることを見る）で確認する。
 * web は react-native-web の `PressResponder.onClick` が必ず `stopPropagation()` を呼んでから
 * `onPress` を発火することをソース読解で確認済み（dist/modules/usePressEvents/PressResponder.js）。
 */

import { describe, test, expect, jest, afterEach } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider, Card, Button, Text } from "../index.js";

function renderCard(onCardPress: () => void, onActionPress: () => void) {
  return render(
    <ThemeProvider forcedMode="light">
      <Card
        variant="action"
        testID="card"
        onPress={onCardPress}
        primaryAction={<Button testID="primary" label="開く" onPress={onActionPress} />}
      >
        <Text>本文</Text>
      </Card>
    </ThemeProvider>,
  );
}

describe("押せる Card の押下", () => {
  // assertion が落ちた場合も spy を確実に戻す（落ちた1件が後続を巻き添えにしないため）。
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("RNTL は primaryAction のハンドラを選び、面のハンドラを直接は呼ばない", async () => {
    const onCardPress = jest.fn();
    const onActionPress = jest.fn();
    const { getByTestId } = await renderCard(onCardPress, onActionPress);

    fireEvent.press(getByTestId("primary"));

    expect(onActionPress).toHaveBeenCalledTimes(1);
    expect(onCardPress).not.toHaveBeenCalled();
  });

  test("面を押すと面の onPress だけが発火する", async () => {
    const onCardPress = jest.fn();
    const onActionPress = jest.fn();
    const { getByTestId } = await renderCard(onCardPress, onActionPress);

    fireEvent.press(getByTestId("card"));

    expect(onCardPress).toHaveBeenCalledTimes(1);
    expect(onActionPress).not.toHaveBeenCalled();
  });

  test("面は a11y ツリーで子を畳まない（内包する操作要素が個別に到達できる）", async () => {
    const { getByTestId } = await renderCard(
      () => {},
      () => {},
    );
    // accessible={false} なので、子の Button が独立した操作要素として残る
    expect(getByTestId("card").props.accessible).toBe(false);
    expect(getByTestId("primary").props.accessibilityRole).toBe("button");
  });

  // 検査の中身（どの props で何を報告するか）は scripts/lib/card-validate.test.ts が
  // 純関数として網羅する。ここで見るのは「report が実際に画面から出てくるか」の1本だけ。
  //
  // ⚠️ ラッチは module スコープでメッセージ単位。同じ違反を先に別のテストや render が
  // 踏むと、ここは空振りして静かに検出力を失う。だから警告系のテストは1本に絞っている。
  test("契約違反が dev で報告される（型を持たない利用者向けの防御）", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const Loose = Card as unknown as (props: Record<string, unknown>) => React.ReactElement;
    await render(
      <ThemeProvider forcedMode="light">
        <Loose variant="action" onPress={() => {}} testID="card">
          <Text>本文</Text>
        </Loose>
      </ThemeProvider>,
    );
    const messages = errorSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((m) => m.includes("primaryAction"))).toBe(true);
    expect(messages.some((m) => m.includes("スクリーンリーダー"))).toBe(true);
    errorSpy.mockRestore();
  });

  test("面は article を名乗り、button は名乗らない", async () => {
    const { getByTestId } = await renderCard(
      () => {},
      () => {},
    );
    const card = getByTestId("card");
    expect(card.props.role).toBe("article");
    expect(card.props.accessibilityRole).toBeUndefined();
  });
});
