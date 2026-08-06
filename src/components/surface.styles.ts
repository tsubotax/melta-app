/**
 * surface.styles — Surface の pure style resolver（styleRefs conformance 対応で Surface.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/surface.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/surface-conformance.test.ts が行う。
 */

import type {
  ElevationKey,
  ElevationStyle,
  NativeTheme,
  RadiusKey,
  SemanticColors,
  SpacingKey,
  ThemeMode,
} from "../theme/index.js";

/** Surface の見た目 props（すべて token キー限定。デフォルトは recipe default variant と 1:1）。 */
export interface SurfaceStyleProps {
  bg?: keyof SemanticColors;
  radius?: RadiusKey;
  elevation?: ElevationKey;
  padding?: SpacingKey;
}

/**
 * props → 最終 style 値の解決。
 * base（背景・角丸・padding）と elevation（iOS shadow* + Android elevation の複合値）を
 * 分けて返し、呼び出し側が [base, elevation, style] の順で合成する（従来の適用順を維持）。
 * デフォルト（bg=bg-surface / radius=lg / elevation=none、padding は無し）は
 * recipe（surface.recipe.json）の default variant と一致させている。
 */
export function resolveSurfaceStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  { bg = "bg-surface", radius = "lg", elevation = "none", padding }: SurfaceStyleProps = {},
): {
  base: { backgroundColor: string; borderRadius: number; padding?: number };
  elevation: ElevationStyle;
} {
  return {
    base: {
      backgroundColor: theme.color.semantic[mode][bg],
      borderRadius: theme.radius[radius],
      ...(padding != null ? { padding: theme.spacing[padding] } : null),
    },
    elevation: theme.elevation[elevation],
  };
}
