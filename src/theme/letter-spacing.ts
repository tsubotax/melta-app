/**
 * letter-spacing — letterSpacingRatio（em 相当の比率）→ RN の letterSpacing(pt) の解決。
 *
 * theme/index.ts は ThemeProvider（react-native 依存）を re-export するので、pure style resolver や
 * node テストから index 経由でこの helper を引くと RN を巻き込んでしまう。そのため実体は
 * line-height.ts と同じく **pure module** に置き、index.ts は re-export だけする
 * （公開 API の位置と名前は不変）。以前は index.ts に実体があり、pure 側は同じ式を直書きしていた。
 */

/**
 * letterSpacingRatio（em 相当の比率）を、適用先の fontSize から RN の letterSpacing(pt) に解決する。
 * 例: resolveLetterSpacing(18, theme.typography.letterSpacingRatio.body)
 * theme.typography.letterSpacingRatio.* をそのまま style.letterSpacing に入れる誤用を避けるための helper。
 */
export function resolveLetterSpacing(fontSize: number, ratio: number): number {
  return fontSize * ratio;
}
