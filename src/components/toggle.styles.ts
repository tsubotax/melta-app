/**
 * toggle.styles — Toggle の pure style resolver（styleRefs conformance 対応で Toggle.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/toggle.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/toggle-conformance.test.ts が行う。
 *
 * - variant = variantModeledStates（off/on）。component 側で value:boolean から暗黙決定する。
 * - track の寸法・thumbOffset の literal は recipe の値を直書きし、conformance で照合する。
 *   thumb 位置は track に padding=thumbOffset を持たせ、component 側が justifyContent
 *   flex-start / flex-end で寄せる（recipe description の「on 時は右端へ」の RN 表現）。
 * - disabled は state 差分（opacity）。TOGGLE_DISABLED_OPACITY を component が適用し、
 *   conformance が recipe states.disabled と照合する。
 */

import type { NativeTheme, ThemeMode } from "../theme";

/** ON/OFF（toggle.contract の variantModeledStates と 1:1）。 */
export type ToggleVariant = "off" | "on";
export type ToggleSize = "medium" | "large";

/**
 * size → track / thumb 寸法（toggle.recipe sizes と整合）。
 * literal は recipe の値を直書きし、conformance で recipe と照合する。
 */
export const TOGGLE_SIZE_SPEC: Record<
  ToggleSize,
  { trackWidth: number; trackHeight: number; thumbSize: number; thumbOffset: number }
> = {
  medium: { trackWidth: 44, trackHeight: 24, thumbSize: 20, thumbOffset: 2 },
  large: { trackWidth: 56, trackHeight: 28, thumbSize: 24, thumbOffset: 2 },
};

/** disabled state の opacity（recipe states.disabled.style.opacity と照合）。 */
export const TOGGLE_DISABLED_OPACITY = 0.5;

/**
 * variant / size → track + thumb の最終 style 値の解決（toggle.recipe styleRefs の 1:1 写像）。
 * track.padding = thumbOffset（thumb を track 内で浮かせる余白）。
 */
export function resolveToggleStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  { variant, size = "medium" }: { variant: ToggleVariant; size?: ToggleSize },
): {
  track: {
    width: number;
    height: number;
    backgroundColor: string;
    borderRadius: number;
    padding: number;
  };
  thumb: { width: number; height: number; backgroundColor: string; borderRadius: number };
} {
  const c = theme.color;
  const sem = c.semantic[mode];
  const spec = TOGGLE_SIZE_SPEC[size];
  return {
    track: {
      width: spec.trackWidth,
      height: spec.trackHeight,
      backgroundColor: variant === "on" ? c.primary["500"] : sem["border-strong"],
      borderRadius: theme.radius.full,
      padding: spec.thumbOffset,
    },
    thumb: {
      width: spec.thumbSize,
      height: spec.thumbSize,
      backgroundColor: sem["bg-surface"],
      borderRadius: theme.radius.full,
    },
  };
}
