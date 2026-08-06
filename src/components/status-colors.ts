/**
 * status-colors — status 語彙（info / success / warning / error）→ 面の色（bg / text）の解決。
 *
 * Alert / Toast / TextField が同じ写像を各自に持っていた（Alert と Toast は完全重複、TextField は
 * inline の同型ロジック）。status token の light/dark 切替と「error → token 上は danger」の
 * 読み替えは**一箇所**にしないと、片方だけ直して drift する形になるためここへ集約する。
 *
 * react-native を import しない純粋モジュール（各 *.styles.ts と同じ規約）。
 */

import type { NativeTheme, ThemeMode } from "../theme";

/** 契約側の status 語彙。token 側のキーとは error / danger だけ表記が違う。 */
export type StatusVariant = "info" | "success" | "warning" | "error";

/** theme.color.status のキー（token 側の表記）。 */
export type StatusTokenKey = keyof NativeTheme["color"]["status"];

/** 解決結果（subtle な面の背景色と、その上に載る文字色）。 */
export interface StatusSurfaceColors {
  bg: string;
  text: string;
}

/** 契約語彙 → token キー（error は token では danger）。 */
export function toStatusTokenKey(variant: Exclude<StatusVariant, "info">): StatusTokenKey {
  return variant === "error" ? "danger" : variant;
}

/**
 * status token の subtle 面 + text 色を mode で解決する。
 * light は subtleLight / textLight、dark は subtleDark / textDark（recipe description の写像）。
 */
export function resolveStatusTokenColors(
  theme: NativeTheme,
  mode: ThemeMode,
  key: StatusTokenKey,
): StatusSurfaceColors {
  const status = theme.color.status[key];
  return mode === "dark"
    ? { bg: status.subtleDark, text: status.textDark }
    : { bg: status.subtleLight, text: status.textLight };
}

/**
 * status 語彙 → 面の色。
 * info だけ primary.50 / primary.800 固定（status token に info が無い既知の割り切り、web と同じ。
 * mode 非依存）。それ以外は status token を mode で解決する。
 */
export function resolveStatusVariantColors(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: StatusVariant,
): StatusSurfaceColors {
  if (variant === "info") {
    return { bg: theme.color.primary["50"], text: theme.color.primary["800"] };
  }
  return resolveStatusTokenColors(theme, mode, toStatusTokenKey(variant));
}
