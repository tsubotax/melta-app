/**
 * melta-app theme エントリ。
 * 型は types.ts、値は native-theme.ts（melta-contracts から自動生成）。
 * 消費者ブランドの theme を注入する口は define-theme.ts（`defineTheme`）。
 */

export * from "./types";
export { nativeTheme } from "./native-theme";
export { ThemeProvider, useTheme } from "./ThemeProvider";
export type { ThemeContextValue, ThemeMode } from "./ThemeProvider";
export {
  defineTheme,
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

/**
 * letterSpacingRatio（em 相当の比率）を、適用先の fontSize から RN の letterSpacing(pt) に解決する。
 * 例: resolveLetterSpacing(18, theme.typography.letterSpacingRatio.body)
 * theme.typography.letterSpacingRatio.* をそのまま style.letterSpacing に入れる誤用を避けるための helper。
 */
export function resolveLetterSpacing(fontSize: number, ratio: number): number {
  return fontSize * ratio;
}
