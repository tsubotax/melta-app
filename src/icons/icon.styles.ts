/**
 * icon.styles — Icon の pure style resolver（styleRefs conformance 対応で Icon.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/icon.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/icon-conformance.test.ts が行う。
 */

import type { NativeTheme, SemanticColors, ThemeMode } from "../theme";

export type IconSize = "sm" | "md" | "lg";

/** サイズ軸（contract sizes の height と 1:1。width=height の正方形）。 */
const SIZE_TABLE = { sm: 16, md: 20, lg: 24 } as const;

export interface IconStyle {
  width: number;
  height: number;
  color: string;
}

/**
 * size / color → Icon style の解決（icon.recipe styleRefs の 1:1 写像）。
 * デフォルト（size=md / color=text-default）は recipe の default variant と一致させている。
 */
export function resolveIconStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  size: IconSize = "md",
  color: keyof SemanticColors = "text-default",
): IconStyle {
  return {
    width: SIZE_TABLE[size],
    height: SIZE_TABLE[size],
    color: theme.color.semantic[mode][color],
  };
}
