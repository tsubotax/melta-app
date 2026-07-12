/**
 * safe-area-adapter — Screen の context hook adapter が初回 render で inset を
 * View padding に反映し、edge 選択と SafeAreaView 相当の加算を保つことを確認する。
 */

/* eslint-disable melta/no-raw-spacing -- device inset の固定値を検証するテスト。 */

import { describe, expect, jest, test } from "@jest/globals";
import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import {
  SafeAreaProvider,
  type EdgeInsets,
  type Metrics,
} from "react-native-safe-area-context";
import { ThemeProvider, Screen, Text } from "../index";
import { enableSafeAreaContext } from "../safe-area";

jest.mock("react-native-safe-area-context", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const InsetsContext = React.createContext<EdgeInsets | null>(null);
  const zeroInsets: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    SafeAreaProvider({
      children,
      initialMetrics,
    }: {
      children?: ReactNode;
      initialMetrics?: Metrics | null;
    }) {
      return React.createElement(
        InsetsContext.Provider,
        { value: initialMetrics?.insets ?? zeroInsets },
        children,
      );
    },
    useSafeAreaInsets() {
      const insets = React.useContext(InsetsContext);
      if (insets == null) throw new Error("SafeAreaProvider is required");
      return insets;
    },
  };
});

const metrics: Metrics = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, right: 2, bottom: 16, left: 3 },
};

function renderScreen(style?: ViewStyle) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider forcedMode="light">
        <Screen variant="fixed" style={style} testID="screen">
          <Text>本文</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe("enableSafeAreaContext", () => {
  test("指定 edge だけを初回 render の padding に反映する", async () => {
    enableSafeAreaContext({ edges: ["top", "left", "right"] });

    const { getByTestId } = await renderScreen();
    const style = StyleSheet.flatten(getByTestId("screen").props.style);

    // 水平は論理キーで出力する（LTR: start=left / end=right）。基底 style の
    // paddingStart/End に物理キーが負けて inset が消えるのを防ぐため
    expect(style).toMatchObject({ paddingTop: 24, paddingEnd: 2, paddingStart: 3 });
    expect(style).not.toHaveProperty("paddingBottom");
  });

  test("引数なしは全 edge を既存 padding に加算する", async () => {
    enableSafeAreaContext();

    const { getByTestId } = await renderScreen({ padding: 4 });
    const style = StyleSheet.flatten(getByTestId("screen").props.style);

    expect(style).toMatchObject({
      paddingTop: 28,
      paddingEnd: 6,
      paddingBottom: 20,
      paddingStart: 7,
    });
  });

  test("基底の論理 padding（paddingStart）を取りこぼさず inset に加算する", async () => {
    enableSafeAreaContext({ edges: ["left"] });

    const { getByTestId } = await renderScreen({ paddingStart: 16 });
    const style = StyleSheet.flatten(getByTestId("screen").props.style);

    // LTR: paddingStart 16 + left inset 3。出力も論理キーなので基底に負けない
    expect(style).toMatchObject({ paddingStart: 19 });
  });

  test("非数値（%）padding は基底として扱えず inset のみになる（公開契約）", async () => {
    enableSafeAreaContext({ edges: ["top"] });

    const { getByTestId } = await renderScreen({ paddingTop: "5%" });
    const style = StyleSheet.flatten(getByTestId("screen").props.style);

    expect(style).toMatchObject({ paddingTop: 24 });
  });
});
