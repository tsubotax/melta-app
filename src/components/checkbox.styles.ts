/**
 * checkbox.styles — Checkbox の pure style resolver（styleRefs conformance 対応で Checkbox.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/checkbox.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/checkbox-conformance.test.ts が行う。
 */

import type { NativeTheme, ThemeMode } from "../theme/index.js";

/**
 * recipe 由来の literal 値テーブル（token 化されていない数値。conformance が recipe と照合する）。
 * - box は 20px（web の 16px より大きいのはタッチ前提、recipe description）
 * - hitSlop は (44 - box 20) / 2 = 12。行全体 Pressable に足して実効タップ標的 44pt を確保
 *   （A11Y_MIN_TAP_TARGET_44。横断方針と正典パターンは src/a11y/tap-target.ts）
 */
export const CHECKBOX_SPEC = {
  boxSize: 20,
  boxBorderWidth: 2,
  disabledOpacity: 0.5,
  hitSlop: 12,
} as const;

/** 見た目（色）に効く状態入力。disabled は opacity のみで色を変えないため含めない。 */
export interface CheckboxStateInput {
  checked: boolean;
  /** true で variant "indeterminate"。box の塗りは checked と同じ、mark が横棒になる。 */
  indeterminate?: boolean;
  /** true で states.error の borderColor 差分。checked より優先（選択済みでもエラーなら赤枠）。 */
  error?: boolean;
}

export interface CheckboxResolved {
  /** box（20px の四角）。recipe の boxStyle スロットと 1:1。 */
  boxStyle: {
    width: number;
    height: number;
    borderWidth: number;
    borderColor: string;
    borderRadius: number;
    backgroundColor: string;
  };
  /** label（recipe の labelStyle スロットと 1:1。実装は Text primitive の base/text-default で同値）。 */
  labelStyle: { fontSize: number; color: string };
  /** box と label の間隔。 */
  gap: number;
  /** checkmark（L 字 border）/ indeterminate 横棒の色（states.checked.markColor）。 */
  markColor: string;
}

/**
 * 状態 → 最終 style 値の解決（checkbox.recipe styleRefs の 1:1 写像）。
 * - 塗り（bg/border = primary.500）は checked / indeterminate 共通（recipe の variants.indeterminate
 *   boxStyle と states.checked boxStyle が同値であることは conformance が recipe 側で担保）。
 * - error は borderColor のみ上書き（states.error）。
 */
export function resolveCheckboxStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  { checked, indeterminate = false, error = false }: CheckboxStateInput,
): CheckboxResolved {
  const sem = theme.color.semantic[mode];
  const filled = checked || indeterminate;
  return {
    boxStyle: {
      width: CHECKBOX_SPEC.boxSize,
      height: CHECKBOX_SPEC.boxSize,
      borderWidth: CHECKBOX_SPEC.boxBorderWidth,
      borderColor: error
        ? theme.color.status.danger.base
        : filled
          ? theme.color.primary["500"]
          : sem["border-strong"],
      borderRadius: theme.radius.sm,
      backgroundColor: filled ? theme.color.primary["500"] : sem["input-bg"],
    },
    labelStyle: {
      fontSize: theme.typography.fontSize.base.fontSize,
      color: sem["text-default"],
    },
    gap: theme.spacing["2"],
    markColor: sem["text-on-accent"],
  };
}
