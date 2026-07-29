/**
 * single-dark.theme — 単一 colorScheme（dark のみ）の theme fixture。
 *
 * 「light テーマを作らないことが意図的な設計判断」であるブランドを想定した**匿名の**検証用データ。
 * 特定の消費者の preset を melta に同梱しない（公開 DS に個別ブランドの都合を持ち込まない）。
 * 必要なのは capability の**形**（= color.semantic が dark しか持たない）だけなので、値は任意。
 *
 * 置き場所が src/ でなく scripts/ なのは2つの理由から:
 *   1. package.json の files は `src` を丸ごと同梱し、除外は test ファイルの glob だけ
 *      → src に置くと fixture が npm 公開物に混ざる
 *   2. eslint の melta/no-raw-color は src 配下の .ts/.tsx のみを対象にしており、
 *      生の hex を持つ fixture は src では error になる
 *
 * **jest（test:rn）からこのファイルを読むときは拡張子なしで import すること。**
 * scripts/lib の規約は `.js` 付きだが、jest-resolve は `.js` → `.ts` を引けない。
 * 逆に node（tsx --test）側は両方引けるので、拡張子なしが唯一の共通解になる。
 * このファイル自身が持つのは型 import だけ（実行時 import ゼロ）なので、
 * ここでは規約どおり `.js` 付きで書ける。
 */

import type { ThemeOptions } from "../../../src/theme/define-theme.js";
import type { SemanticColors } from "../../../src/theme/types.js";

const darkSemantic: SemanticColors = {
  "bg-page": "#0b0b0c",
  "bg-page-alt": "#121214",
  "bg-surface": "#161619",
  "bg-surface-alt": "#1d1d21",
  "text-heading": "#f2f2f4",
  "text-default": "#e4e4e8",
  "text-muted": "#9a9aa2",
  "border-default": "#2a2a2f",
  "border-strong": "#3d3d44",
  "input-bg": "#161619",
  "input-border": "#2a2a2f",
  "text-accent": "#e4e4e8",
  "text-on-accent": "#0b0b0c",
};

const flat = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

/**
 * dark しか宣言していない theme。`defineTheme()` に通すと capabilities.colorScheme は
 * "single-dark" に導出される。
 *
 * 注: accent（primary パレット / text-accent）・status の light 値・elevation は
 * 単一 dark でも現状 **必須のまま**。この fixture もそれらを埋めている。①の射程は
 * colorScheme 軸だけで、他の軸の capability 化は後続で扱う。
 */
export const singleDarkThemeOptions: ThemeOptions = {
  id: "fixture-single-dark",
  color: {
    primary: {
      "50": "#f4f4f5",
      "100": "#e4e4e7",
      "200": "#d4d4d8",
      "300": "#a1a1aa",
      "400": "#71717a",
      "500": "#52525b",
      "600": "#3f3f46",
      "700": "#27272a",
      "800": "#1f1f23",
      "900": "#18181b",
      "950": "#09090b",
    },
    body: "#e4e4e8",
    semantic: { dark: darkSemantic },
    status: {
      success: {
        base: "#3fb950",
        subtleLight: "#e8f5e9",
        textLight: "#1b5e20",
        subtleDark: "#12261a",
        textDark: "#3fb950",
      },
      warning: {
        base: "#d29922",
        subtleLight: "#fff8e1",
        textLight: "#7a5b00",
        subtleDark: "#2a2110",
        textDark: "#d29922",
      },
      danger: {
        base: "#f85149",
        subtleLight: "#ffebee",
        textLight: "#8b1a15",
        subtleDark: "#2b1416",
        textDark: "#f85149",
      },
    },
  },
  typography: {
    fontFamily: {},
    fontSize: {
      xxs: { fontSize: 9, lineHeight: 14 },
      xs: { fontSize: 11, lineHeight: 16 },
      sm: { fontSize: 12, lineHeight: 18 },
      base: { fontSize: 13, lineHeight: 20 },
      lg: { fontSize: 15, lineHeight: 20 },
      xl: { fontSize: 17, lineHeight: 22 },
      "2xl": { fontSize: 19, lineHeight: 25 },
      "3xl": { fontSize: 34, lineHeight: 34 },
    },
    fontWeight: { normal: "400", medium: "500", semibold: "600", bold: "700" },
    letterSpacingRatio: { heading: -0.02, body: 0 },
  },
  spacing: {
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 20,
    "6": 24,
    "8": 32,
    "10": 40,
    "12": 48,
    "14": 56,
    "16": 64,
  },
  radius: { sm: 4, md: 8, lg: 12, full: 9999 },
  elevation: { none: flat, sm: flat, md: flat, overlay: flat },
  motion: {
    duration: { fast: 150, normal: 200, slow: 300 },
    easing: { default: [0.4, 0, 0.2, 1], in: [0.4, 0, 1, 1], out: [0, 0, 0.2, 1] },
  },
  zIndex: { base: 0, dropdown: 20, sticky: 30, overlay: 40, modal: 50 },
};

/** light だけを宣言した theme（single-light の導出と clamp の検証用）。 */
export const singleLightThemeOptions: ThemeOptions = {
  ...singleDarkThemeOptions,
  id: "fixture-single-light",
  color: { ...singleDarkThemeOptions.color, semantic: { light: darkSemantic } },
};
