/**
 * safe-area-registry — Screen が使う SafeAreaView 実装の差し替え点（adapter registry）。
 *
 * 本体エントリは依存ゼロ方針（P1）のため、default は RN core の SafeAreaView
 * （deprecated / iOS のみの最小対応）。react-native-safe-area-context を使う利用者は
 * subpath "melta-app/safe-area" の enableSafeAreaContext() をアプリ起動時に一度呼ぶと
 * Screen の SafeArea が context hook + View adapter に差し替わる（optional peer の前例 =
 * Icon × react-native-svg。ただし Screen は本体エントリ所属のため subpath 分離ではなく
 * registry で切り替える）。
 *
 * ⚠️ RN 0.85 は react-native の SafeAreaView プロパティへの getter アクセス時点で
 * deprecation 警告を出す。adapter 登録済みの利用者に警告を出さないため、core への
 * アクセスは「未登録のまま Screen が render された時」まで遅延させる。
 */

import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import * as ReactNative from "react-native";

/** Screen が SafeArea 実装に要求する最小 props（core / safe-area-context 両対応）。 */
export interface SafeAreaViewLikeProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

export type SafeAreaViewLike = ComponentType<SafeAreaViewLikeProps>;

let registered: SafeAreaViewLike | null = null;

/** SafeArea 実装を登録する（Screen の初回 render より前に呼ぶ）。 */
export function setSafeAreaView(component: SafeAreaViewLike): void {
  registered = component;
}

/** 登録済み実装、無ければ RN core SafeAreaView（ここで初めて getter に触れる）。 */
export function resolveSafeAreaView(): SafeAreaViewLike {
  return registered ?? (ReactNative.SafeAreaView as SafeAreaViewLike);
}
