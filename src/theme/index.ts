/**
 * melta-app theme エントリ。
 * 型は types.ts、値は native-theme.ts（melta-contracts から自動生成）。
 * 消費者ブランドの theme を注入する口は define-theme.ts（`defineTheme`）。
 */

export * from "./types";
export { nativeTheme } from "./native-theme";
export { ThemeProvider, useTheme } from "./ThemeProvider";
export type { ThemeContextValue, ThemeMode } from "./ThemeProvider";
export { defineTheme } from "./define-theme";
export {
  DEFAULT_MIN_LINE_HEIGHT_RATIO,
  minLineHeightFor,
  clampLineHeight,
} from "./line-height";
/**
 * letterSpacingRatio（em 相当の比率）を適用先の fontSize から letterSpacing(pt) に解決する helper。
 * 実体は pure module（./letter-spacing）。resolver 側は index を経由せず直接 import する
 * （index は ThemeProvider = react-native を引くため）。
 */
export { resolveLetterSpacing } from "./letter-spacing";
/**
 * 以下は theme の解決規則を外から検証・再利用するためのヘルパ。
 * **@experimental — 安定 API ではない。** 挙動・シグネチャ・メッセージは予告なく変わりうる。
 * アプリの実行時ロジックが依存する場合は、useTheme().capabilities を使うほうが安全。
 */
export {
  validateTheme,
  resolveMode,
  supportedModes,
  deriveColorScheme,
  declaredModes,
} from "./define-theme";
export type {
  ColorSchemeCapability,
  ResolvedCapabilities,
  ResolvedNativeTheme,
  ThemeModeViolation,
  ThemeOptions,
} from "./define-theme";
