/**
 * button.styles — Button の pure style resolver（P4 conformance 対応で Button.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/button.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/recipe-conformance.test.ts が行う。
 */

import type { NativeTheme, ThemeMode, FontSizeKey, SpacingKey } from "../theme";

export type ButtonVariant =
  | "contained"
  | "outlined"
  | "brand-outline"
  | "neutral"
  | "lighted"
  | "danger"
  | "subtle";
export type ButtonSize = "small" | "medium" | "large";

/** size → height / 横 padding / label fontSize / icon box（contract sizes/iconButton と整合）。 */
export const SIZE_SPEC: Record<
  ButtonSize,
  { height: number; px: SpacingKey; font: FontSizeKey; iconBox: number }
> = {
  small: { height: 32, px: "3", font: "sm", iconBox: 32 },
  medium: { height: 40, px: "4", font: "base", iconBox: 40 },
  large: { height: 48, px: "6", font: "base", iconBox: 48 },
};

/**
 * variant → 色解決（button.contract tokenRefs の 1:1 写像）。
 * 文字色は variant により semantic 外（primary.500 等）もあるため hex 文字列で返し、
 * Text の style で color 上書きする（Text の color prop は SemanticColors キー限定のため）。
 */
export function resolveVariant(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: ButtonVariant,
): { bg?: string; pressedBg?: string; textColor: string; border?: string } {
  const c = theme.color;
  const sem = c.semantic[mode];
  switch (variant) {
    case "contained":
      return { bg: c.primary["500"], pressedBg: c.primary["700"], textColor: sem["text-on-accent"] };
    case "outlined":
      return {
        bg: sem["bg-surface"],
        pressedBg: sem["bg-surface-alt"],
        textColor: sem["text-default"],
        border: sem["border-default"],
      };
    case "brand-outline":
      return {
        bg: sem["bg-surface"],
        pressedBg: c.primary["50"],
        textColor: c.primary["500"],
        border: c.primary["500"],
      };
    case "neutral":
      return { bg: sem["bg-surface-alt"], pressedBg: sem["border-default"], textColor: sem["text-default"] };
    case "lighted":
      return { bg: c.primary["50"], pressedBg: c.primary["100"], textColor: c.primary["600"] };
    case "danger":
      return { bg: c.status.danger.base, pressedBg: c.status.danger.textLight, textColor: sem["text-on-accent"] };
    case "subtle":
      return { bg: "transparent", pressedBg: sem["bg-surface-alt"], textColor: sem["text-default"] };
  }
}
