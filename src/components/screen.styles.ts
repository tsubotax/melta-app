/**
 * screen.styles — Screen の pure style resolver（styleRefs conformance 対応で Screen.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/screen.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/screen-conformance.test.ts が行う。
 */

import type { NativeTheme, SpacingKey, ThemeMode } from "../theme";

/** content の padding（spacing token キー限定 | "none"）。default "4"（recipe に焼いてある）。 */
export type ScreenPadding = SpacingKey | "none";

export interface ScreenStyleProps {
  /** fixed = flex:1 の View / scroll = ScrollView contentContainerStyle。 */
  variant: "fixed" | "scroll";
  /** content の padding。default "4"。 */
  padding?: ScreenPadding;
}

export interface ScreenStyle {
  safeAreaStyle: { flex: 1; backgroundColor: string };
  contentStyle: { flex?: 1; padding?: number };
}

/**
 * variant / padding → 画面骨格 style の解決（screen.recipe styleRefs の 1:1 写像）。
 * - safeAreaStyle は両 variant 共通（flex:1 + bg-page。mode で semantic 解決）。
 * - contentStyle は fixed のみ flex:1 を持つ（scroll は ScrollView が伸びるため不要）。
 * - padding="none" は padding を出力しない。
 */
export function resolveScreenStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  { variant, padding = "4" }: ScreenStyleProps,
): ScreenStyle {
  return {
    safeAreaStyle: { flex: 1, backgroundColor: theme.color.semantic[mode]["bg-page"] },
    contentStyle: {
      ...(variant === "fixed" ? { flex: 1 as const } : null),
      ...(padding !== "none" ? { padding: theme.spacing[padding] } : null),
    },
  };
}
