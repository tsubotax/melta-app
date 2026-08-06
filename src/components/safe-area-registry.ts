/**
 * safe-area-registry — SafeArea 実装の差し替え点（adapter registry）。
 *
 * 本体エントリは依存ゼロ方針（P1）のため、default は RN core の SafeAreaView
 * （deprecated / iOS のみの最小対応）。react-native-safe-area-context を使う利用者は
 * subpath "melta-app/safe-area" の enableSafeAreaContext() をアプリ起動時に一度呼ぶと
 * SafeArea が context hook + View adapter に差し替わる（optional peer の前例 =
 * Icon × react-native-svg。ただし Screen / シート系は本体エントリ所属のため subpath 分離
 * ではなく registry で切り替える）。
 *
 * 登録するのは**コンポーネントではなくファクトリ**（edges → コンポーネント）。
 * 消費者ごとに必要な edge が違うため（Screen = 既定 or prop 指定 / ActionSheet・BottomSheet =
 * 下端固定なので bottom + 左右のみ）、edges をグローバル 1 個で持てない。
 *
 * ⚠️ 生成物は edges の正規化キーで memo する。resolveSafeAreaView() は render 中に
 * 呼ばれるので、毎回新しいコンポーネント型を返すと React が別 type とみなして
 * subtree を unmount/remount する（state・入力中のテキストが消える）。
 *
 * ⚠️ RN 0.85 は react-native の SafeAreaView プロパティへの getter アクセス時点で
 * deprecation 警告を出す。adapter 登録済みの利用者に警告を出さないため、core への
 * アクセスは「未登録のまま render された時」まで遅延させる。
 */

import type { ComponentType, ReactNode } from "react";
import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";
import * as ReactNative from "react-native";

/**
 * safe-area を適用する辺。react-native-safe-area-context の `Edge` と同値の union を
 * 本体エントリ側に持つ（optional peer を型でも引かないため）。
 */
export type SafeAreaEdge = "top" | "right" | "bottom" | "left";

/** 全 edge（未指定時の既定）。正規化の順序定義も兼ねる。 */
export const ALL_SAFE_AREA_EDGES = [
  "top",
  "right",
  "bottom",
  "left",
] as const satisfies readonly SafeAreaEdge[];

/** 消費者（Screen / シート系）が SafeArea 実装に要求する最小 props（core / safe-area-context 両対応）。 */
export interface SafeAreaViewLikeProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** iOS: 背後の要素を a11y ツリーから隠す（modal 内のシートで使う）。 */
  accessibilityViewIsModal?: boolean;
  /** touch を claim して親（overlay）へ流さないために使う。 */
  onStartShouldSetResponder?: (event: GestureResponderEvent) => boolean;
  children?: ReactNode;
}

export type SafeAreaViewLike = ComponentType<SafeAreaViewLikeProps>;

/** edges を受け取って SafeAreaView 相当を返すファクトリ（正規化済みの edges が渡る）。 */
export type SafeAreaViewFactory = (edges: readonly SafeAreaEdge[]) => SafeAreaViewLike;

let factory: SafeAreaViewFactory | null = null;
let defaultEdges: readonly SafeAreaEdge[] = ALL_SAFE_AREA_EDGES;
/** 正規化 edges キー → 生成済みコンポーネント（参照安定のための memo）。 */
const memo = new Map<string, SafeAreaViewLike>();

/** edges を「重複排除 + 固定順」に正規化する（["bottom","left"] と ["left","bottom"] を同一視）。 */
function normalizeEdges(edges: readonly SafeAreaEdge[]): readonly SafeAreaEdge[] {
  const requested = new Set<SafeAreaEdge>(edges);
  return ALL_SAFE_AREA_EDGES.filter((edge) => requested.has(edge));
}

/**
 * SafeArea 実装のファクトリを登録する（初回 render より前に呼ぶ）。
 *
 * @param create edges → コンポーネントのファクトリ。同じ edges 集合には同じ参照が返るよう
 *   registry 側が memo するので、ファクトリ自体は毎回新規生成でよい。
 * @param edges edges 未指定の消費者（= Screen の既定）に使う edge 集合。default は全 edge。
 */
export function setSafeAreaView(
  create: SafeAreaViewFactory,
  edges: readonly SafeAreaEdge[] = ALL_SAFE_AREA_EDGES,
): void {
  factory = create;
  defaultEdges = normalizeEdges(edges);
  memo.clear(); // 再登録で古い実装が memo に残らないようにする
}

/**
 * edges に対応する SafeArea 実装を返す。同じ edges 集合には常に同じ参照を返す（memo）。
 *
 * @param edges 適用する辺。省略時は登録時の既定 edges（未登録なら全 edge）。
 *
 * ⚠️ 未登録時のフォールバックは RN core の SafeAreaView で、**edges は無視される**
 * （core は「安全域と交差する辺すべて」に padding を入れる仕様で、辺を選べない。
 * さらに Android では `Platform.select` により素の View = 完全 no-op）。
 * edges 指定を実際に効かせたい場合は "melta-app/safe-area" の enableSafeAreaContext() が要る。
 */
export function resolveSafeAreaView(edges?: readonly SafeAreaEdge[]): SafeAreaViewLike {
  if (factory == null) return ReactNative.SafeAreaView as SafeAreaViewLike;

  const normalized = edges == null ? defaultEdges : normalizeEdges(edges);
  const key = normalized.join(",");
  const cached = memo.get(key);
  if (cached != null) return cached;

  const created = factory(normalized);
  memo.set(key, created);
  return created;
}
