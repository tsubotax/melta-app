/**
 * safe-area-adapter — Screen の context hook adapter が初回 render で inset を
 * View padding に反映し、edge 選択と SafeAreaView 相当の加算を保つことを確認する。
 */

/* eslint-disable melta/no-raw-spacing -- device inset の固定値を検証するテスト。 */

import { describe, expect, jest, test } from "@jest/globals";
import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
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

function renderScreen(style?: { padding?: number }) {
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

    expect(style).toMatchObject({ paddingTop: 24, paddingRight: 2, paddingLeft: 3 });
    expect(style).not.toHaveProperty("paddingBottom");
  });

  test("引数なしは全 edge を既存 padding に加算する", async () => {
    enableSafeAreaContext();

    const { getByTestId } = await renderScreen({ padding: 4 });
    const style = StyleSheet.flatten(getByTestId("screen").props.style);

    expect(style).toMatchObject({
      paddingTop: 28,
      paddingRight: 6,
      paddingBottom: 20,
      paddingLeft: 7,
    });
  });
});
