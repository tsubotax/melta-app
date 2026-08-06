/**
 * toast.styles — Toast の pure style resolver（styleRefs conformance 対応で Toast.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/toast.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/toast-conformance.test.ts が行う。
 *
 * - Alert と同系の bg subtle + text 色に elevation.sm を重ねる（浮いている通知、recipe description）。
 *   elevation は iOS shadow* + Android elevation の複合 token のため containerStyle と分けて返し、
 *   呼び出し側が [containerStyle, elevation, style] の順で合成する（Surface と同じ扱い）。
 * - status 色（mode ごとの subtle / text、info の primary 固定）の解決は status-colors.ts が SSOT
 *   （Alert と同じ写像を共有する）。
 */

import type {
  ElevationKey,
  ElevationStyle,
  FontSizeKey,
  FontWeightKey,
  FontWeightValue,
  NativeTheme,
  RadiusKey,
  SpacingKey,
  ThemeMode,
} from "../theme/index.js";
import { resolveStatusVariantColors, type StatusVariant } from "./status-colors.js";
import { CANONICAL_TAP_TARGET } from "../a11y/tap-target.js";

/** toast.contract の variant 語彙（status 共通語彙と 1:1）。 */
export type ToastVariant = StatusVariant;

/**
 * 構成キー（token キー）。component は Text にこのキーをそのまま渡し、resolver は同じキーから
 * style 値を解決する（component と resolver が別々のキーを持って drift する事故を防ぐ SSOT）。
 */
export const TOAST_SPEC = {
  padding: "4",
  gap: "3",
  radius: "md",
  elevation: "sm",
  messageFont: "sm",
  messageWeight: "medium",
} as const satisfies {
  padding: SpacingKey;
  gap: SpacingKey;
  radius: RadiusKey;
  elevation: ElevationKey;
  messageFont: FontSizeKey;
  messageWeight: FontWeightKey;
};

/**
 * 右端に並ぶ 2 つの操作要素（action テキストと × ボタン）の当たり判定。
 *
 * **既存バグの修正**: 以前は両方とも hitSlop 10（全方向）で、両者の間隔は gap = spacing.3 = 12pt
 * しかなかった。左右 10 + 10 = 20pt の当たり判定が 12pt の隙間に食い込み、**20 − 12 = 8pt ぶん
 * 重なって**いた（重なった帯では手前に描画された × が勝つ ＝ action を押したつもりが閉じる）。
 *
 * 規約（AGENTS.md）: **横方向の hitSlop は隣接要素との gap の 1/2 を超えない**。
 * gap 12 → 片側 6pt。これで両者の当たり判定はちょうど接し、重ならない。
 * 縦は隣接する操作要素が無いので 10pt を維持する（正典パターンと同じ）。
 *
 * 横を 6 に削ると × の実効幅が 24 + 6×2 = 36pt と 44pt を割るため、**箱の下限を 32pt に広げて**
 * 32 + 6×2 = 44pt を確保する（× は背景を持たないので幅を広げても見た目は変わらない）。
 * action 側はテキスト幅が可変で静的に決められないため、縦のみ 44pt を保証する。
 */
export const TOAST_TAP_TARGET = {
  /** action / × 共通の hitSlop（横だけ gap/2 = 6 に絞る）。 */
  hitSlop: { top: 10, bottom: 10, left: 6, right: 6 },
  /** × の箱の幅の下限（横 hitSlop を削ったぶん canonical の 24 から広げる。32 + 6×2 = 44）。 */
  closeMinWidth: 32,
  /** × の箱の高さ下限（正典パターンと同値）。 */
  closeMinHeight: CANONICAL_TAP_TARGET.minHeight,
} as const;

/**
 * slot 構成（toast.recipe 各 variant の containerStyle / messageStyle と 1:1。
 * containerStyle 内の elevation 参照だけは複合 token のため別 slot に分離して返す）。
 */
export interface ToastStyles {
  containerStyle: {
    backgroundColor: string;
    borderRadius: number;
    padding: number;
    flexDirection: "row";
    alignItems: "center";
    gap: number;
  };
  /** iOS shadow* + Android elevation の複合値。container へ spread する。 */
  elevation: ElevationStyle;
  /** compose する Text primitive（message）へ渡す値の解決結果 */
  messageStyle: {
    color: string;
    fontSize: number;
    fontWeight: FontWeightValue;
  };
}

/** variant → 全 slot の style 解決（toast.recipe styleRefs の 1:1 写像）。 */
export function resolveToastStyles(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: ToastVariant,
): ToastStyles {
  const { bg, text } = resolveStatusVariantColors(theme, mode, variant);
  return {
    containerStyle: {
      backgroundColor: bg,
      borderRadius: theme.radius[TOAST_SPEC.radius],
      padding: theme.spacing[TOAST_SPEC.padding],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing[TOAST_SPEC.gap],
    },
    elevation: theme.elevation[TOAST_SPEC.elevation],
    messageStyle: {
      color: text,
      fontSize: theme.typography.fontSize[TOAST_SPEC.messageFont].fontSize,
      fontWeight: theme.typography.fontWeight[TOAST_SPEC.messageWeight],
    },
  };
}
