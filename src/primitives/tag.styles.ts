/**
 * tag.styles — Tag の pure style resolver（styleRefs conformance 対応で Tag.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/tag.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/tag-conformance.test.ts が行う。
 */

import type { NativeTheme, ThemeMode, FontSizeKey } from "../theme/index.js";
import { CANONICAL_TAP_TARGET } from "../a11y/tap-target.js";
import { clampLineHeight, minRatioOf } from "../theme/line-height.js";

export type TagVariant = "basic" | "removable" | "filter-chip";

/** label の fontSize token キー（component / resolver / 検算が同じキーを読む SSOT）。 */
export const TAG_SPEC = {
  /** basic / removable の label。 */
  labelFont: "xs",
  /** filter-chip の label（押せる要素なので一段大きい）。 */
  chipLabelFont: "sm",
} as const satisfies { labelFont: FontSizeKey; chipLabelFont: FontSizeKey };

/**
 * removable の × の当たり判定（正典パターン: 視覚 24pt + hitSlop 10 = 実効 44pt）。
 * 親 Tag の高さ（padding 駆動で 34pt 前後）を超えられないので × 自身に持たせる。
 */
export const TAG_REMOVE_TAP_TARGET = CANONICAL_TAP_TARGET;

/**
 * filter-chip（押せる chip 本体）の縦 hitSlop。
 *
 * chip は背景と枠を持つので minHeight で伸ばすと**見た目が変わる**（他 variant と高さが揃わない）。
 * よって視覚寸法は据え置き、当たり判定だけ広げる:
 *   視覚高さ 34pt（paddingVertical 4 × 2 + label sm の lineHeight 26）+ 5 × 2 = 44pt。
 *
 * padding 駆動なので fontScale で視覚高さ自体が伸びる ＝ 拡大時に過剰な当たり判定にならない。
 * ⚠️ literal で持つ（resolveTagFilterChipVisualHeight から導出しない）。導出にすると
 * 寸法変更に hitSlop が黙って追随し、conformance が fail-open になる。
 */
export const TAG_FILTER_CHIP_VERTICAL_HIT_SLOP = 5;

/**
 * filter-chip の視覚高さ（padding 駆動）。conformance が 44pt 到達を検算するための実測値。
 * = paddingVertical × 2 + label（sm）の lineHeight。
 */
export function resolveTagFilterChipVisualHeight(theme: NativeTheme): number {
  const font = theme.typography.fontSize[TAG_SPEC.chipLabelFont];
  const lineHeight = clampLineHeight(font.fontSize, font.lineHeight, minRatioOf(theme));
  return resolveTagBase(theme).paddingVertical * 2 + lineHeight;
}

/** 共通形状（px-3 py-1 gap-1 rounded-full。tag.recipe の全 variant style と共通の寸法キー）。 */
export function resolveTagBase(theme: NativeTheme): {
  gap: number;
  paddingHorizontal: number;
  paddingVertical: number;
  borderRadius: number;
} {
  return {
    gap: theme.spacing["1"],
    paddingHorizontal: theme.spacing["3"],
    paddingVertical: theme.spacing["1"],
    borderRadius: theme.radius.full,
  };
}

/**
 * variant（+ filter-chip の selected 状態）→ 配色 + label fontSize（tag.recipe styleRefs の 1:1 写像）。
 *
 * - selected は contract states active/inactive → prop selected:boolean の写像（filter-chip のみ有効）。
 *   active は bg=primary.50 / border=primary.200 / text=primary.700 の差分、inactive は variant style そのまま。
 * - 文字色は active 時に semantic 外（primary.700）になるため hex 文字列で返し、
 *   Text の style で color 上書きする（Text の color prop は SemanticColors キー限定のため）。
 */
export function resolveTagVariant(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: TagVariant,
  selected = false,
): { bg: string; border?: string; borderWidth?: number; textColor: string; font: FontSizeKey } {
  const c = theme.color;
  const sem = c.semantic[mode];
  switch (variant) {
    case "basic":
    case "removable":
      return { bg: sem["bg-page-alt"], textColor: sem["text-default"], font: TAG_SPEC.labelFont };
    case "filter-chip":
      return selected
        ? {
            bg: c.primary["50"],
            borderWidth: 1,
            border: c.primary["200"],
            textColor: c.primary["700"],
            font: TAG_SPEC.chipLabelFont,
          }
        : {
            bg: sem["bg-surface"],
            borderWidth: 1,
            border: sem["border-default"],
            textColor: sem["text-default"],
            font: TAG_SPEC.chipLabelFont,
          };
  }
}
