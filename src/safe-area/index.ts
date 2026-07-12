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
 * ⚠️ 前提: アプリの root に SafeAreaProvider が必要（無いと useSafeAreaInsets が throw
 * する）。初回 render から正しい inset を使うには Provider に initialMetrics も渡す。
 * React Navigation / Expo Router 利用時は Provider が設置済みのことが多い。
 *
 * ⚠️ 公開契約: safe-area と合成する padding は数値のみサポート。"5%" 等の非数値は
 * 基底値として扱えず、対象 edge の padding は inset 値に置き換わる（RNSAC native も
 * percentage padding 未サポートのため、より弱い保証を契約化はしない）。
 */

import { createElement, useMemo } from "react";
import { I18nManager, StyleSheet, View, type ViewStyle } from "react-native";
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
  const num = (value: unknown): number | null => (typeof value === "number" ? value : null);

  // 基底 padding の解決は Yoga の優先順位（論理 > 物理 > 軸 > 全体）に合わせる。
  // 論理キー（paddingStart/End）を読まないと、基底が論理指定のとき取りこぼす。
  const isRTL = I18nManager.isRTL;
  const baseVertical = (edge: "top" | "bottom"): number =>
    num(edge === "top" ? flat.paddingTop : flat.paddingBottom) ??
    num(flat.paddingVertical) ??
    num(flat.padding) ??
    0;
  const baseHorizontal = (edge: "left" | "right"): number =>
    num(flat[(edge === "left") === !isRTL ? "paddingStart" : "paddingEnd"]) ??
    num(edge === "left" ? flat.paddingLeft : flat.paddingRight) ??
    num(flat.paddingHorizontal) ??
    num(flat.padding) ??
    0;

  // 水平方向は論理キーで出力する。物理キー（paddingLeft/Right）で上書きすると、
  // 基底 style 側に paddingStart/End があるとき論理キーが Yoga 上で勝ち、
  // inset の加算結果ごと無視されるため。
  const out: ViewStyle = {};
  if (edges.has("top")) out.paddingTop = baseVertical("top") + insets.top;
  if (edges.has("bottom")) out.paddingBottom = baseVertical("bottom") + insets.bottom;
  if (edges.has("left")) {
    out[isRTL ? "paddingEnd" : "paddingStart"] = baseHorizontal("left") + insets.left;
  }
  if (edges.has("right")) {
    out[isRTL ? "paddingStart" : "paddingEnd"] = baseHorizontal("right") + insets.right;
  }
  return out;
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
