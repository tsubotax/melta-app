/**
 * safe-area-adapter — context hook adapter が初回 render で inset を View padding に反映し、
 * edge 選択と SafeAreaView 相当の加算を保つことを確認する。
 *
 * edge の決まり方は 3 段（後者が勝つ）: enableSafeAreaContext の既定 → Screen の edges prop →
 * シート系が固定で持つ edge（bottom + 左右）。ここではその全段を押さえる。
 */

/* eslint-disable melta/no-raw-spacing -- device inset の固定値を検証するテスト。 */

import { describe, expect, jest, test } from "@jest/globals";
import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import {
  SafeAreaProvider,
  type Edge,
  type EdgeInsets,
  type Metrics,
} from "react-native-safe-area-context";
import { ThemeProvider, Screen, Text, ActionSheet, BottomSheet } from "../index.js";
import { enableSafeAreaContext } from "../safe-area/index.js";

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

function renderScreen(style?: ViewStyle, edges?: readonly Edge[]) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider forcedMode="light">
        <Screen variant="fixed" style={style} edges={edges} testID="screen">
          <Text>本文</Text>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** toJSON の host tree を辿って style を集める（シート系は testID を差せない層を見たいため）。 */
type JsonNode = { props?: Record<string, unknown>; children?: (JsonNode | string)[] | null } | string | null;

function collectStyles(node: JsonNode, out: ViewStyle[] = []): ViewStyle[] {
  if (node == null || typeof node === "string") return out;
  const style = node.props?.style;
  if (style != null) out.push(StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {});
  for (const child of node.children ?? []) collectStyles(child, out);
  return out;
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

  test("Screen の edges prop が既定 edges を上書きする", async () => {
    enableSafeAreaContext(); // アプリ既定は全 edge

    const { getByTestId } = await renderScreen(undefined, ["top"]);
    const style = StyleSheet.flatten(getByTestId("screen").props.style);

    expect(style).toMatchObject({ paddingTop: 24 });
    expect(style).not.toHaveProperty("paddingBottom");
    expect(style).not.toHaveProperty("paddingStart");
  });
});

describe("シート系の safe-area", () => {
  // アプリ既定を top だけにしても、下端に出るシートは自前の edge（bottom + 左右）を使う
  test("ActionSheet は既定 edges に引きずられず bottom inset を入れる", async () => {
    enableSafeAreaContext({ edges: ["top"] });

    const { toJSON } = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider forcedMode="light">
          <ActionSheet
            visible
            onClose={() => {}}
            actions={[{ label: "共有", onPress: () => {} }]}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const styles = collectStyles(toJSON() as JsonNode);
    expect(styles.some((s) => s.paddingBottom === metrics.insets.bottom)).toBe(true);
    expect(styles.some((s) => s.paddingTop === metrics.insets.top)).toBe(false);
  });

  test("BottomSheet は既定 edges に引きずられず bottom inset を入れる", async () => {
    enableSafeAreaContext({ edges: ["top"] });

    const { toJSON } = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider forcedMode="light">
          <BottomSheet visible onClose={() => {}} title="絞り込み">
            <Text>フィルタ</Text>
          </BottomSheet>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    const styles = collectStyles(toJSON() as JsonNode);
    expect(styles.some((s) => s.paddingBottom === metrics.insets.bottom)).toBe(true);
    expect(styles.some((s) => s.paddingTop === metrics.insets.top)).toBe(false);
  });
});
