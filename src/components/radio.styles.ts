/**
 * radio.styles — Radio（RadioGroup）の pure style resolver（styleRefs conformance 対応で
 * Radio.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/radio.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/radio-conformance.test.ts が行う。
 *
 * recipe の構造メモ: circleStyle/dotStyle/labelStyle/groupLabelStyle/optionGap は
 * variant 非依存の共通部として vertical にのみ載っている（recipe description）。
 * 実装ではこの共通部を variant に関わらず同値で返す（conformance が variant 間一致を照合）。
 */

import type { FontWeightValue, NativeTheme, ThemeMode } from "../theme/index.js";
import { MIN_TAP_TARGET } from "../a11y/tap-target.js";

export type RadioVariant = "vertical" | "horizontal" | "card-style";

/**
 * recipe 由来の literal 値テーブル（token 化されていない数値。conformance が recipe と照合する）。
 *
 * `optionMinHeight` だけは recipe 外の a11y 手当て（A11Y_MIN_TAP_TARGET_44）。
 * option 行の視覚高さは label（base）の lineHeight 36pt しかなく 44pt に届かないが、
 * option 行は**背景を持たない**（card-style を除く。card は padding 16×2 で既に 68pt）ので
 * hitSlop ではなく minHeight で下げ止める — 見た目は変わらず、hitSlop の重なりも原理的に起きない。
 */
export const RADIO_SPEC = {
  circleSize: 20,
  circleBorderWidth: 2,
  dotSize: 10,
  cardBorderWidth: 1,
  disabledOpacity: 0.5,
  optionMinHeight: MIN_TAP_TARGET,
} as const;

export interface RadioGroupResolved {
  /** variant 別レイアウト（vertical/card-style は縦積み、horizontal は wrap する横並び）。 */
  containerStyle: { flexDirection: "column" | "row"; flexWrap?: "wrap"; gap: number };
  /** selected 時に circle 内へ表示する内側ドット。 */
  dotStyle: { width: number; height: number; borderRadius: number; backgroundColor: string };
  /** option label（recipe の labelStyle スロットと 1:1。実装は Text primitive の base/text-default で同値）。 */
  labelStyle: { fontSize: number; color: string };
  /** groupLabel = fieldset の legend 相当（FORM_FIELDSET_LEGEND_REQUIRED で必須）。 */
  groupLabelStyle: { fontSize: number; fontWeight: FontWeightValue; color: string; marginBottom: number };
  /** 各 option 内の circle と label の間隔。 */
  optionGap: number;
  /** states.error のエラーメッセージ（danger.text-light は recipe 指定どおり mode 非依存）。 */
  errorTextStyle: { fontSize: number; color: string; marginTop: number };
  /** card-style のみ: 各 option を包む枠付きカード。 */
  cardStyle?: { borderWidth: number; borderColor: string; borderRadius: number; padding: number };
  /** card-style のみ: selected 時にカードへ重ねる差分。 */
  cardSelectedStyle?: { borderColor: string; backgroundColor: string };
}

/**
 * variant → グループ全体の style 解決（radio.recipe styleRefs の 1:1 写像）。
 * circle は selected/error の state 差分を持つため resolveRadioCircleStyle に分離。
 */
export function resolveRadioGroupStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: RadioVariant,
): RadioGroupResolved {
  const sem = theme.color.semantic[mode];
  const containerStyle: RadioGroupResolved["containerStyle"] =
    variant === "horizontal"
      ? { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["4"] }
      : { flexDirection: "column", gap: theme.spacing["3"] };
  return {
    containerStyle,
    dotStyle: {
      width: RADIO_SPEC.dotSize,
      height: RADIO_SPEC.dotSize,
      borderRadius: theme.radius.full,
      backgroundColor: theme.color.primary["500"],
    },
    labelStyle: {
      fontSize: theme.typography.fontSize.base.fontSize,
      color: sem["text-default"],
    },
    groupLabelStyle: {
      fontSize: theme.typography.fontSize.sm.fontSize,
      fontWeight: theme.typography.fontWeight.medium,
      color: sem["text-heading"],
      marginBottom: theme.spacing["3"],
    },
    optionGap: theme.spacing["2"],
    errorTextStyle: {
      fontSize: theme.typography.fontSize.xs.fontSize,
      color: theme.color.status.danger.textLight,
      marginTop: theme.spacing["2"],
    },
    ...(variant === "card-style"
      ? {
          cardStyle: {
            borderWidth: RADIO_SPEC.cardBorderWidth,
            borderColor: sem["border-default"],
            borderRadius: theme.radius.md,
            padding: theme.spacing["4"],
          },
          cardSelectedStyle: {
            borderColor: theme.color.primary["500"],
            backgroundColor: theme.color.primary["50"],
          },
        }
      : null),
  };
}

/**
 * 状態 → radioCircle の style 解決（variant 非依存の共通部 + states.selected / states.error 差分）。
 * error は selected より優先（契約 stateSpecs: 選択済みでもエラーなら赤枠）。
 */
export function resolveRadioCircleStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  { selected, error = false }: { selected: boolean; error?: boolean },
): {
  width: number;
  height: number;
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  alignItems: "center";
  justifyContent: "center";
} {
  const sem = theme.color.semantic[mode];
  return {
    width: RADIO_SPEC.circleSize,
    height: RADIO_SPEC.circleSize,
    borderWidth: RADIO_SPEC.circleBorderWidth,
    borderColor: error
      ? theme.color.status.danger.base
      : selected
        ? theme.color.primary["500"]
        : sem["border-strong"],
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  };
}
