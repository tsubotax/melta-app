/**
 * screen-scroll-props — Screen の scrollViewProps / scrollViewRef passthrough を検証する。
 *
 * 主眼:
 *   a. 消費者の prop が内部 ScrollView に**届く**（Screen を使うと ScrollView を触れなくなる、を潰す）
 *   b. contentContainerStyle は DS の padding と**配列合成**される（素の spread なら padding が消える）
 *   c. scrollEventThrottle の既定 16（iOS 既定 0 だと onScroll が 1 ドラッグ 1 発しか来ない）
 *   d. variant="fixed" では黙って捨てず dev warn を出す
 */

/* eslint-disable melta/no-raw-spacing -- passthrough の合成結果を検証する固定値。 */

import { createRef } from "react";
import { describe, expect, jest, test } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { ScrollView, StyleSheet } from "react-native";
import { ThemeProvider, Screen, Text, nativeTheme } from "../index.js";

/** DS 既定 padding（padding="4"）。合成後も残ることを確認する基準値。 */
const DEFAULT_PADDING = nativeTheme.spacing["4"];

describe("Screen scrollViewProps", () => {
  test("渡した props が内部 ScrollView に届く（onScroll / keyboardShouldPersistTaps）", async () => {
    const onScroll = jest.fn();
    const { getByTestId } = await render(
      <ThemeProvider forcedMode="light">
        <Screen
          scrollViewProps={{ testID: "sv", onScroll, keyboardShouldPersistTaps: "handled" }}
        >
          <Text>本文</Text>
        </Screen>
      </ThemeProvider>,
    );

    const scrollView = getByTestId("sv");
    expect(scrollView.props.keyboardShouldPersistTaps).toBe("handled");

    fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 0, y: 12 } } });
    expect(onScroll).toHaveBeenCalled();
  });

  test("contentContainerStyle は DS の padding を残したまま後勝ちで合成される", async () => {
    const { getByTestId } = await render(
      <ThemeProvider forcedMode="light">
        <Screen scrollViewProps={{ testID: "sv", contentContainerStyle: { paddingBottom: 96 } }}>
          <Text>本文</Text>
        </Screen>
      </ThemeProvider>,
    );

    const style = StyleSheet.flatten(getByTestId("sv").props.contentContainerStyle);
    // DS の padding が丸ごと消えない（素の spread だとここが落ちる）＋ 個別指定は後勝ち
    expect(style).toMatchObject({ padding: DEFAULT_PADDING, paddingBottom: 96 });
  });

  test("scrollEventThrottle は既定 16 で、消費者が上書きできる", async () => {
    const { getByTestId, rerender } = await render(
      <ThemeProvider forcedMode="light">
        <Screen scrollViewProps={{ testID: "sv" }}>
          <Text>本文</Text>
        </Screen>
      </ThemeProvider>,
    );
    expect(getByTestId("sv").props.scrollEventThrottle).toBe(16);

    await rerender(
      <ThemeProvider forcedMode="light">
        <Screen scrollViewProps={{ testID: "sv", scrollEventThrottle: 32 }}>
          <Text>本文</Text>
        </Screen>
      </ThemeProvider>,
    );
    expect(getByTestId("sv").props.scrollEventThrottle).toBe(32);
  });

  test("scrollViewRef が内部 ScrollView を指す", async () => {
    const ref = createRef<ScrollView>();
    await render(
      <ThemeProvider forcedMode="light">
        <Screen scrollViewRef={ref}>
          <Text>本文</Text>
        </Screen>
      </ThemeProvider>,
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.scrollTo).toBe("function");
  });

  test('variant="fixed" に渡したら黙って無視せず dev warn する', async () => {
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await render(
      <ThemeProvider forcedMode="light">
        <Screen variant="fixed" scrollViewProps={{ testID: "sv" }}>
          <Text>本文</Text>
        </Screen>
      </ThemeProvider>,
    );

    expect(spy).toHaveBeenCalledWith(expect.stringContaining("scrollViewProps"));
    spy.mockRestore();
  });
});
