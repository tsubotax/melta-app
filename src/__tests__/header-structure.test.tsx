/** 読み上げ構造と個別操作を検証する。実際のVoiceOver音声やレイアウト計算の代替ではない。 */
import { test, expect, jest } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import { StyleSheet, View } from "react-native";
import { Header, ThemeProvider, Button, Row } from "../index.js";

test("defaultは従来の可視見出しを持つ", async () => {
  const ui = await render(<ThemeProvider><Header title="画面名" /></ThemeProvider>);
  expect(ui.getByRole("header", { name: "画面名" })).toBeTruthy();
  expect(ui.getByText("画面名")).toBeTruthy();
});
test("actionsは見出しを残し、左右の3操作を個別に扱う", async () => {
  const close = jest.fn(), draft = jest.fn(), submit = jest.fn();
  const ui = await render(<ThemeProvider>
    <Header title="作業ログを残す" variant="actions" testID="bar"
      leading={<Button label="閉じる" onPress={close} />}
      trailing={<Row><Button label="下書き" onPress={draft} /><Button label="投稿する" onPress={submit} /></Row>} />
  </ThemeProvider>);
  const heading = ui.getByRole("header", { name: "作業ログを残す" });
  expect(StyleSheet.flatten(heading.parent?.props.style)).toMatchObject({ width: 1, height: 1, overflow: "hidden" });
  expect(ui.getByRole("header", { name: "作業ログを残す" })).toBeTruthy();
  // eslint-disable-next-line melta/no-raw-spacing -- 標準テーマでの実効余白を固定値で検証する。
  expect(StyleSheet.flatten(ui.getByTestId("bar").props.style)).toMatchObject({ paddingVertical: 12, borderBottomWidth: 1 });
  expect(ui.getByTestId("bar").props.accessible).not.toBe(true);
  const buttons = ui.getAllByRole("button");
  expect(buttons).toHaveLength(3);
  for (const button of buttons) await fireEvent.press(button);
  expect(close).toHaveBeenCalledTimes(1);
  expect(draft).toHaveBeenCalledTimes(1);
  expect(submit).toHaveBeenCalledTimes(1);
});
test("actionsでもdisabled操作は発火しない", async () => {
  const submit = jest.fn();
  const ui = await render(<ThemeProvider><Header title="入力" variant="actions"
    trailing={<Button label="投稿する" disabled onPress={submit} />} /></ThemeProvider>);
  await fireEvent.press(ui.getByRole("button", { name: "投稿する", disabled: true }));
  expect(submit).not.toHaveBeenCalled();
});

for (const variant of ["centered", "navigation"] as const) {
  test(`${variant}は長い見出しと戻る操作を独立させ、左右の予約幅を維持する`, async () => {
    const back = jest.fn();
    const title = "とても長い日本語のプロフィール名さんのアトリエ";
    const ui = await render(<ThemeProvider><Header variant={variant} title={title} testID="bar"
      leading={<Button label="戻る" onPress={back} />} /></ThemeProvider>);
    expect(ui.getAllByRole("header")).toHaveLength(1);
    expect(ui.getByRole("header", { name: title })).toBeTruthy();
    expect(ui.getByText(title).props.numberOfLines).toBe(1);
    await fireEvent.press(ui.getByRole("button", { name: "戻る" }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(ui.getByTestId("bar").props.accessible).not.toBe(true);
    expect(StyleSheet.flatten(ui.getByTestId("bar").props.style)).not.toHaveProperty("height");
  });
}
test("中央タイトルのwrapperで読み上げを切り替えても戻る操作を失わない", async () => {
  const back = jest.fn();
  const make = (hidden: boolean) => <ThemeProvider><Header variant="navigation" title="キット名" titleVariant="base"
    leading={<Button label="戻る" onPress={back} />}
    wrapTitle={heading => <View accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"} aria-hidden={hidden}>{heading}</View>} />
  </ThemeProvider>;
  const ui = await render(make(true));
  expect(ui.queryByRole("header", { name: "キット名" })).toBeNull();
  await fireEvent.press(ui.getByRole("button", { name: "戻る" }));
  expect(back).toHaveBeenCalledTimes(1);
  await ui.rerender(make(false));
  expect(ui.getAllByRole("header", { name: "キット名" })).toHaveLength(1);
});
