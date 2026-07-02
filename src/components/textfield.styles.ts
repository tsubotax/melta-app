/**
 * textfield.styles — TextField の pure style resolver（styleRefs conformance 対応で TextField.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/textfield.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/textfield-conformance.test.ts が行う。
 *
 * - variant は入力の検証状態（default/error/success/disabled = 契約の variant 語彙）。
 *   disabled は component 側で prop disabled=true から上書きされる（TextField.tsx 参照）。
 * - label/helperText/errorText は variant 非依存の共通部（recipe は default にのみ載せる規約、
 *   実装は全 variant で同じものを返す）。
 * - status 色（error の bg / errorText の文字色）は mode で subtle-light/dark・text-light/dark を
 *   切り替える（semantic 色を semantic[mode] で引くのと同じ規約。recipe は light 側を encode）。
 * - focus は state 差分（borderColor のみ）。resolveTextFieldFocusStyle で別関数にし、
 *   conformance が recipe states.focus と照合する。
 */

import type {
  NativeTheme,
  ThemeMode,
  FontSizeKey,
  FontWeightValue,
  SpacingKey,
} from "../theme";

/** 検証状態（textfield.contract の variant 語彙と 1:1）。 */
export type TextFieldVariant = "default" | "error" | "success" | "disabled";
export type TextFieldSize = "small" | "medium" | "large";

/**
 * size → height / 横 padding / 入力文字 fontSize（textfield.recipe sizes と整合）。
 * height の literal は recipe の値を直書きし、conformance で recipe と照合する。
 */
export const TEXTFIELD_SIZE_SPEC: Record<
  TextFieldSize,
  { height: number; px: SpacingKey; font: FontSizeKey }
> = {
  small: { height: 36, px: "3", font: "sm" },
  medium: { height: 42, px: "3", font: "base" },
  large: { height: 48, px: "3", font: "lg" },
};

/** resolver の出力（label → input → helperText / errorText の縦構成の各パート）。 */
export interface TextFieldResolvedStyle {
  input: {
    height: number;
    paddingHorizontal: number;
    fontSize: number;
    borderWidth: number;
    borderColor: string;
    backgroundColor: string;
    borderRadius: number;
    /** 入力文字色。recipe description の「disabled のテキスト色は text-muted」を担う。 */
    color: string;
  };
  label: {
    fontSize: number;
    fontWeight: FontWeightValue;
    color: string;
    marginBottom: number;
  };
  helperText: { fontSize: number; color: string; marginTop: number };
  errorText: { fontSize: number; color: string; marginTop: number };
}

/**
 * variant / size → 最終 style 値の解決（textfield.recipe styleRefs の 1:1 写像）。
 * デフォルト（variant=default / size=medium）は component の prop デフォルトと一致させている。
 */
export function resolveTextFieldStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  {
    variant = "default",
    size = "medium",
  }: { variant?: TextFieldVariant; size?: TextFieldSize } = {},
): TextFieldResolvedStyle {
  const c = theme.color;
  const sem = c.semantic[mode];
  const spec = TEXTFIELD_SIZE_SPEC[size];

  // variant → border / bg（recipe variants.*.inputStyle の写像）
  const colors = (() => {
    switch (variant) {
      case "default":
        return { borderColor: sem["input-border"], backgroundColor: sem["input-bg"] };
      case "error":
        return {
          borderColor: c.status.danger.base,
          backgroundColor:
            mode === "light" ? c.status.danger.subtleLight : c.status.danger.subtleDark,
        };
      case "success":
        return { borderColor: c.status.success.base, backgroundColor: sem["input-bg"] };
      case "disabled":
        return { borderColor: sem["border-default"], backgroundColor: sem["bg-page-alt"] };
    }
  })();

  return {
    input: {
      height: spec.height,
      paddingHorizontal: theme.spacing[spec.px],
      fontSize: theme.typography.fontSize[spec.font].fontSize,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      color: variant === "disabled" ? sem["text-muted"] : sem["text-default"],
      ...colors,
    },
    label: {
      fontSize: theme.typography.fontSize.sm.fontSize,
      fontWeight: theme.typography.fontWeight.medium,
      color: sem["text-heading"],
      marginBottom: theme.spacing["2"],
    },
    helperText: {
      fontSize: theme.typography.fontSize.xs.fontSize,
      color: sem["text-muted"],
      marginTop: theme.spacing["1"],
    },
    errorText: {
      fontSize: theme.typography.fontSize.xs.fontSize,
      color: mode === "light" ? c.status.danger.textLight : c.status.danger.textDark,
      marginTop: theme.spacing["1"],
    },
  };
}

/**
 * focus state の inputStyle 差分（recipe states.focus の写像。borderColor のみ —
 * web の ring は RN 非対応、border 幅を変えるとレイアウトシフトするため色だけ）。
 */
export function resolveTextFieldFocusStyle(theme: NativeTheme): { borderColor: string } {
  return { borderColor: theme.color.primary["500"] };
}
