/**
 * card.styles — Card の pure style resolver（styleRefs conformance 対応で Card.tsx から分離）。
 *
 * react-native を import しない純粋モジュール（型 import のみ）にすることで node テスト
 * （tsx --test）から直接実行できる。recipes/app/card.recipe.json（melta-contracts の styleRefs）
 * との機械照合は scripts/lib/card-conformance.test.ts が行う。
 */

import type { ViewStyle } from "react-native";
import type { NativeTheme, ThemeMode, ElevationKey } from "../theme/index.js";

export type CardVariant = "basic" | "media" | "action" | "link";

/** variant → インタラクティブ（Pressable）か。action/link のみ true（recipe pressedStyle の有無と対応）。 */
export const CARD_INTERACTIVE: Record<CardVariant, boolean> = {
  basic: false,
  media: false,
  action: true,
  link: true,
};

/**
 * Card の外枠 style を一元生成（card.recipe variants.style の 1:1 写像、
 * 非インタラクティブ View / インタラクティブ Pressable の両分岐で共有）。
 *
 * - pressed は action/link のみ elevation sm→md（recipe pressedStyle、contract hover→pressed mapping）。
 * - 注: overflow:hidden は付けない。iOS は shadow(elevation) と overflow:hidden が同居すると影が
 *   消えるため（contract は media でも elevation.sm 要求）。media のクリップは内側の clip View で行う。
 * - media は内側 clip View が padding を持つ（resolveCardBodyStyle / recipe bodyStyle）ので外枠は padding なし。
 */
export function resolveCardShape(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: CardVariant,
  pressed = false,
): ViewStyle {
  const sem = theme.color.semantic[mode];
  const elevation: ElevationKey = pressed && CARD_INTERACTIVE[variant] ? "md" : "sm";
  return {
    backgroundColor: sem["bg-surface"],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: sem["border-default"],
    // media は内側 clip View が padding を持つので外枠は padding なし。
    ...(variant === "media" ? null : { padding: theme.spacing["6"] }),
    ...theme.elevation[elevation],
  };
}

/** media の body padding（内側 clip View 側が持つ。recipe bodyStyle の写像）。media 以外は undefined。 */
export function resolveCardBodyStyle(
  theme: NativeTheme,
  variant: CardVariant,
): { padding: number } | undefined {
  return variant === "media" ? { padding: theme.spacing["6"] } : undefined;
}
