/**
 * NativeTheme — melta の design contracts(melta-contracts の tokens.json)を
 * React Native 向けに正規化した theme の型。
 *
 * 生成は scripts/generate-native-theme.ts（純粋変換は scripts/lib/normalize-tokens.ts）。
 * web 形式 → RN 形式の正規化規則は requirements-melta-app.md §4 を参照。
 */

import type { ViewStyle } from "react-native";

/**
 * 表示モード。ThemeProvider が OS の colorScheme / forcedMode / theme の能力から解決する。
 * （define-theme.ts と ThemeProvider.tsx の相互 import を避けるため型の実体はここに置く）
 */
export type ThemeMode = "light" | "dark";

/** primary パレット（50〜950）。値は hex 文字列。 */
export type PrimaryScale =
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900"
  | "950";

/** semantic カラー（light / dark で同じキー集合を持つ）。値は色文字列。 */
export interface SemanticColors {
  "bg-page": string;
  "bg-page-alt": string;
  "bg-surface": string;
  "bg-surface-alt": string;
  "text-heading": string;
  "text-default": string;
  "text-muted": string;
  "border-default": string;
  "border-strong": string;
  "input-bg": string;
  "input-border": string;
  "text-accent": string;
  "text-on-accent": string;
}

/** status カラー（success / warning / danger）。light/dark の subtle・text を保持。 */
export interface StatusColors {
  base: string;
  subtleLight: string;
  textLight: string;
  subtleDark: string;
  textDark: string;
}

export interface ThemeColor {
  primary: Record<PrimaryScale, string>;
  body: string;
  semantic: { light: SemanticColors; dark: SemanticColors };
  status: { success: StatusColors; warning: StatusColors; danger: StatusColors };
}

export type FontSizeKey = "xxs" | "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
export type FontWeightKey = "normal" | "medium" | "semibold" | "bold";
/** RN の fontWeight は文字列。tokens の数値(400 等)を文字列化したもの。 */
export type FontWeightValue = "400" | "500" | "600" | "700";

export interface FontSizeEntry {
  /** px 数値（tokens.json の px をそのまま採用） */
  fontSize: number;
  /** fontSize × lineHeight比率 を px に丸めた値 */
  lineHeight: number;
}

export interface ThemeTypography {
  /**
   * 初期は system default（未指定 = OS デフォルトフォント）。RN の fontFamily は string 一本で
   * web の fallback 配列のようには効かず、Inter 等を焼くと expo-font でのロード必須になり実機で崩れる。
   * Inter / JetBrains Mono の embed は expo-font を導入し、generator へ font マップを渡す形になる（未着手）。
   * それまでは sans/mono とも未指定（= OS の sans / monospace）にする。
   */
  fontFamily: { sans?: string; mono?: string };
  fontSize: Record<FontSizeKey, FontSizeEntry>;
  fontWeight: Record<FontWeightKey, FontWeightValue>;
  /**
   * letterSpacing の em ratio を数値で保持する（px ではない）。
   * tokens は em（fontSize 相対）だが RN の letterSpacing は絶対 pt のため token 単体では px 換算できない。
   * 適用側は `resolveLetterSpacing(fontSize, ratio)`（= fontSize × ratio）で pt を算出すること。
   * 名前を `Ratio` 付きにしているのは、ratio をそのまま style.letterSpacing に入れる誤用を防ぐため。
   * （requirements §4 の「px に換算」からの意図的な乖離。理由はこのコメントの通り）
   */
  letterSpacingRatio: { heading: number; body: number };
  /**
   * 使用フォントが要求する最小行間比（(ascent + descent) / unitsPerEm）。
   * これを下回る lineHeight は RN Android で字形の描画領域を削り、濁点などが欠ける
   * （機序と既定値 1.45 の根拠は theme/line-height.ts のコメント）。
   * style resolver は `clampLineHeight()` でこの比率を下限として適用する。
   * 未宣言は DEFAULT_MIN_LINE_HEIGHT_RATIO（1.45 = Android system 日本語フォント基準）へ倒れる。
   * フォントを同梱する消費者は実測値を宣言する（例: LINE Seed JP = 1.61）。
   */
  minLineHeightRatio?: number;
}

/**
 * elevation 1段。iOS は shadow* を、Android は elevation を読む（互いに無視するので
 * 1つの ViewStyle に同居させて spread すれば両 OS に効く）。
 */
export type ElevationStyle = Pick<
  ViewStyle,
  "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation"
>;

/** iOS 側の shadow props だけ（Android elevation は別途 mapping table で決める）。 */
export type ShadowStyle = Omit<ElevationStyle, "elevation">;

export type ElevationKey = "none" | "sm" | "md" | "overlay";

export type SpacingKey =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "8"
  | "10"
  | "12"
  | "14"
  | "16";

export type RadiusKey = "sm" | "md" | "lg" | "full";

export interface ThemeMotion {
  /** ms 数値 */
  duration: { fast: number; normal: number; slow: number };
  /** cubic-bezier の 4 引数（Easing.bezier(...) に展開して使う） */
  easing: {
    default: [number, number, number, number];
    in: [number, number, number, number];
    out: [number, number, number, number];
  };
}

export interface NativeTheme {
  color: ThemeColor;
  typography: ThemeTypography;
  spacing: Record<SpacingKey, number>;
  radius: Record<RadiusKey, number>;
  elevation: Record<ElevationKey, ElevationStyle>;
  motion: ThemeMotion;
  zIndex: { base: number; dropdown: number; sticky: number; overlay: number; modal: number };
}
