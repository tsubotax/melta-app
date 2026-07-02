/**
 * toast.styles — Toast の pure style resolver（styleRefs conformance 対応で Toast.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/toast.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/toast-conformance.test.ts が行う。
 *
 * - Alert と同系の bg subtle + text 色に elevation.sm を重ねる（浮いている通知、recipe description）。
 *   elevation は iOS shadow* + Android elevation の複合 token のため containerStyle と分けて返し、
 *   呼び出し側が [containerStyle, elevation, style] の順で合成する（Surface と同じ扱い）。
 * - dark mode は status.*.subtleDark / textDark 側を解決する。info variant のみ primary 固定
 *   （dark token が無い既知の割り切り、alert と同じ）。
 */

import type {
  ElevationKey,
  ElevationStyle,
  FontSizeKey,
  FontWeightKey,
  FontWeightValue,
  NativeTheme,
  RadiusKey,
  SpacingKey,
  ThemeMode,
} from "../theme";

export type ToastVariant = "success" | "error" | "warning" | "info";

/**
 * 構成キー（token キー）。component は Text にこのキーをそのまま渡し、resolver は同じキーから
 * style 値を解決する（component と resolver が別々のキーを持って drift する事故を防ぐ SSOT）。
 */
export const TOAST_SPEC = {
  padding: "4",
  gap: "3",
  radius: "md",
  elevation: "sm",
  messageFont: "sm",
  messageWeight: "medium",
} as const satisfies {
  padding: SpacingKey;
  gap: SpacingKey;
  radius: RadiusKey;
  elevation: ElevationKey;
  messageFont: FontSizeKey;
  messageWeight: FontWeightKey;
};

/**
 * slot 構成（toast.recipe 各 variant の containerStyle / messageStyle と 1:1。
 * containerStyle 内の elevation 参照だけは複合 token のため別 slot に分離して返す）。
 */
export interface ToastStyles {
  containerStyle: {
    backgroundColor: string;
    borderRadius: number;
    padding: number;
    flexDirection: "row";
    alignItems: "center";
    gap: number;
  };
  /** iOS shadow* + Android elevation の複合値。container へ spread する。 */
  elevation: ElevationStyle;
  /** compose する Text primitive（message）へ渡す値の解決結果 */
  messageStyle: {
    color: string;
    fontSize: number;
    fontWeight: FontWeightValue;
  };
}

/**
 * variant → bg / text 色の解決。
 * - info: primary.50 / primary.800 固定（mode 非依存）。
 * - success / error / warning: status token（error は status キー上は danger）。
 *   light は subtleLight / textLight、dark は subtleDark / textDark（recipe description の写像）。
 */
export function resolveToastColors(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: ToastVariant,
): { bg: string; text: string } {
  if (variant === "info") {
    return { bg: theme.color.primary["50"], text: theme.color.primary["800"] };
  }
  const status = theme.color.status[variant === "error" ? "danger" : variant];
  return mode === "dark"
    ? { bg: status.subtleDark, text: status.textDark }
    : { bg: status.subtleLight, text: status.textLight };
}

/** variant → 全 slot の style 解決（toast.recipe styleRefs の 1:1 写像）。 */
export function resolveToastStyles(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: ToastVariant,
): ToastStyles {
  const { bg, text } = resolveToastColors(theme, mode, variant);
  return {
    containerStyle: {
      backgroundColor: bg,
      borderRadius: theme.radius[TOAST_SPEC.radius],
      padding: theme.spacing[TOAST_SPEC.padding],
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing[TOAST_SPEC.gap],
    },
    elevation: theme.elevation[TOAST_SPEC.elevation],
    messageStyle: {
      color: text,
      fontSize: theme.typography.fontSize[TOAST_SPEC.messageFont].fontSize,
      fontWeight: theme.typography.fontWeight[TOAST_SPEC.messageWeight],
    },
  };
}
