/**
 * button.styles — Button の pure style resolver（styleRefs conformance 対応で Button.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/button.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/recipe-conformance.test.ts が行う（層B）。
 *
 * ⚠️ このファイルは resolver 機構の**最初の実装**で、戻り値が slot 単位に揃っていない
 * （色だけを返し、寸法は component 側で組む）。現行の書き方は AGENTS.md「style resolver の規約」
 * を参照すること — 新規 / 改修は alert.styles.ts・textfield.styles.ts の形に寄せる。
 */

import type { NativeTheme, ThemeMode, FontSizeKey, SpacingKey } from "../theme/index.js";

export type ButtonVariant =
  | "contained"
  | "outlined"
  | "brand-outline"
  | "neutral"
  | "lighted"
  | "danger"
  | "subtle";
export type ButtonSize = "small" | "medium" | "large";

/**
 * size → 最小高さ / 横 padding / label fontSize / icon box（contract sizes/iconButton と整合）。
 *
 * `minHeight`（`height` ではない）なのは fontScale 対策。label は Text primitive の
 * lineHeight（base = 36pt）で伸びるため、height 固定だと fontScale 1.12x あたりから
 * medium（40pt）で文字がクリップする。recipe 側も 0.7.0 で `minHeight` に変わっている。
 * iconOnly だけは正方形を保つため width/height 固定のまま（recipe の iconOnlyWidth/iconOnlyHeight）。
 */
export const BUTTON_SIZE_SPEC: Record<
  ButtonSize,
  { minHeight: number; px: SpacingKey; font: FontSizeKey; iconBox: number }
> = {
  small: { minHeight: 32, px: "3", font: "sm", iconBox: 32 },
  medium: { minHeight: 40, px: "4", font: "base", iconBox: 40 },
  large: { minHeight: 48, px: "6", font: "base", iconBox: 48 },
};

/**
 * size → 縦方向の片側 hitSlop（実効タップ標的 44pt 確保。A11Y_MIN_TAP_TARGET_44）。
 *
 * 視覚寸法は据え置き、当たり判定だけを広げる:
 *   small  32 + 6*2 = 44 / medium 40 + 2*2 = 44 / large 48（既に 44 以上なので 0）
 *
 * ⚠️ literal で持つ（BUTTON_SIZE_SPEC から自動導出しない）。導出にすると視覚寸法を変えたときに
 * hitSlop が黙って追随してしまい、conformance が構造的に fail-open になる。
 */
export const BUTTON_VERTICAL_HIT_SLOP: Record<ButtonSize, number> = {
  small: 6,
  medium: 2,
  large: 0,
};

/** Pressable の hitSlop（RN の Insets）。 */
export interface ButtonHitSlop {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
}

/**
 * size / iconOnly → Pressable に渡す hitSlop。0 のときは undefined（prop を付けない）。
 *
 * - labeled: **縦だけ**。横は付けない — Row の gap 0 で隣接した Button 同士の当たり判定が
 *   重なって押し違いが起きるため（横方向は padding で既に広い）。
 * - iconOnly: 幅も 32/40 と狭い正方形なので**横にも同値**を付ける（左右の隣接は
 *   iconOnly ボタンを gap 0 で並べない前提。並べる場合は消費者側で gap を取る）。
 */
export function resolveButtonHitSlop(
  size: ButtonSize,
  iconOnly: boolean,
): ButtonHitSlop | undefined {
  const slop = BUTTON_VERTICAL_HIT_SLOP[size];
  if (slop === 0) return undefined;
  return iconOnly
    ? { top: slop, bottom: slop, left: slop, right: slop }
    : { top: slop, bottom: slop };
}

/**
 * variant → 色解決（button.contract tokenRefs の 1:1 写像）。
 * 文字色は variant により semantic 外（primary.500 等）もあるため hex 文字列で返し、
 * Text の style で color 上書きする（Text の color prop は SemanticColors キー限定のため）。
 */
export function resolveButtonColors(
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
