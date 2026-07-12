/**
 * melta-app/safe-area — react-native-safe-area-context adapter の subpath エントリ。
 *
 * 本体エントリ（"melta-app"）から分離している理由: このファイルだけが
 * react-native-safe-area-context（optional peerDependency）に依存するため。
 * Metro は import を静的に解決するので、本体エントリに含めると未 install の
 * 利用者がバンドルできなくなる（分離の前例 = melta-app/icons × react-native-svg）。
 *
 * 使い方: アプリの entry で一度呼ぶ（Screen の初回 render より前）。
 *
 *   import { enableSafeAreaContext } from "melta-app/safe-area";
 *   enableSafeAreaContext();
 *
 * これで Screen の SafeArea が useSafeAreaInsets() + View の adapter に切り替わる。
 * Provider の context 値を render 中に同期参照して padding を付けるため、native
 * SafeAreaView の layout/state 更新を待たず、初回 render から inset が反映される。
 *
 * ⚠️ 前提: アプリの root に SafeAreaProvider が必要。初回 render から正しい inset を
 * 使うには Provider に initialMetrics も渡す。React Navigation / Expo Router 利用時は
 * Provider が設置済みのことが多い。
 */

import { createElement, useMemo } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import {
  useSafeAreaInsets,
  type Edge,
  type EdgeInsets,
} from "react-native-safe-area-context";
import {
  setSafeAreaView,
  type SafeAreaViewLike,
  type SafeAreaViewLikeProps,
} from "../components/safe-area-registry";

const ALL_EDGES = ["top", "right", "bottom", "left"] as const satisfies readonly Edge[];

/** enableSafeAreaContext() の設定。edges 省略時は従来相当の全 edge。 */
export interface EnableSafeAreaContextOptions {
  /** Screen に適用する edge。tab bar 等が担当する edge は除外する。 */
  edges?: readonly Edge[];
}

function additivePadding(
  style: SafeAreaViewLikeProps["style"],
  insets: EdgeInsets,
  edges: ReadonlySet<Edge>,
): ViewStyle {
  const flat = StyleSheet.flatten(style) ?? {};

  const base = (edge: Edge): number => {
    const edgeValue = flat[`padding${edge[0].toUpperCase()}${edge.slice(1)}` as keyof ViewStyle];
    const axisValue =
      edge === "top" || edge === "bottom" ? flat.paddingVertical : flat.paddingHorizontal;
    const value = edgeValue ?? axisValue ?? flat.padding;
    return typeof value === "number" ? value : 0;
  };

  return {
    ...(edges.has("top") ? { paddingTop: base("top") + insets.top } : null),
    ...(edges.has("right") ? { paddingRight: base("right") + insets.right } : null),
    ...(edges.has("bottom") ? { paddingBottom: base("bottom") + insets.bottom } : null),
    ...(edges.has("left") ? { paddingLeft: base("left") + insets.left } : null),
  };
}

function createContextSafeAreaView(selectedEdges: readonly Edge[]): SafeAreaViewLike {
  const edges = new Set(selectedEdges);

  function ContextSafeAreaView({ style, ...props }: SafeAreaViewLikeProps) {
    const insets = useSafeAreaInsets();
    const paddingStyle = useMemo(
      () => additivePadding(style, insets, edges),
      [style, insets.top, insets.right, insets.bottom, insets.left],
    );

    return createElement(View, { ...props, style: [style, paddingStyle] });
  }

  ContextSafeAreaView.displayName = "MeltaContextSafeAreaView";
  return ContextSafeAreaView;
}

/** Screen の SafeArea を context 同期参照の View adapter に切り替える。 */
export function enableSafeAreaContext(options: EnableSafeAreaContextOptions = {}): void {
  setSafeAreaView(createContextSafeAreaView(options.edges ?? ALL_EDGES));
}
