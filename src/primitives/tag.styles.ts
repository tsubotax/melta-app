/**
 * tag.styles — Tag の pure style resolver（styleRefs conformance 対応で Tag.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/tag.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/tag-conformance.test.ts が行う。
 */

import type { NativeTheme, ThemeMode, FontSizeKey } from "../theme";

export type TagVariant = "basic" | "removable" | "filter-chip";

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
      return { bg: sem["bg-page-alt"], textColor: sem["text-default"], font: "xs" };
    case "filter-chip":
      return selected
        ? {
            bg: c.primary["50"],
            borderWidth: 1,
            border: c.primary["200"],
            textColor: c.primary["700"],
            font: "sm",
          }
        : {
            bg: sem["bg-surface"],
            borderWidth: 1,
            border: sem["border-default"],
            textColor: sem["text-default"],
            font: "sm",
          };
  }
}
