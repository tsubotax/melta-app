/**
 * Checkbox — 複数選択フォームコントロール（form-input 第1弾）。contract: checkbox。
 *
 * - RN にネイティブ checkbox が無いため Pressable（行全体タップ）+ 描画で実装する。
 *   checkmark は rotate した View の L 字 border、indeterminate は横棒
 *   （react-native-svg 非依存 = 本体エントリの依存ゼロ維持。recipe description 参照）。
 * - box は 20px（web の 16px より大きいのはタッチ前提）。実効タップ標的は行の
 *   minHeight 44 で確保する（規約 10-(b): 背景を持たない行は hitSlop でなく寸法）。
 * - label 必須（FORM_NO_LABEL_OMIT を props 型で強制）。label は Text primitive
 *   （base/text-default = recipe labelStyle と同値）。
 * - states（contract → prop の写像）: checked/unchecked → checked:boolean、
 *   indeterminate → indeterminate:boolean（variant "indeterminate"。a11y は "mixed"）、
 *   error → error:boolean（borderColor 差分、checked より優先）、disabled → prop
 *   （opacity 0.5 + 非活性）。focus は非対応（recipe にも focus 差分なし）。
 * - 色・寸法の決定は pure resolver（checkbox.styles.ts）に分離。
 *   recipes/app/checkbox.recipe.json との機械照合は scripts/lib/checkbox-conformance.test.ts が行う。
 */

import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/Text.js";
import { useTheme } from "../theme/index.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import { CHECKBOX_SPEC, resolveCheckboxStyle } from "./checkbox.styles.js";

/** checkmark / 横棒の幾何値（recipe に token 化されていない描画トリック側の定数）。 */
const CHECKMARK = { width: 10, height: 6, borderWidth: 2, offsetY: -1 } as const;
const INDETERMINATE_BAR = { width: 10, height: 2 } as const;

export interface CheckboxProps {
  /** ラベル（必須。FORM_NO_LABEL_OMIT）。 */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** true で不確定状態（親子関係の一部選択）。mark は横棒、a11y は "mixed"。 */
  indeterminate?: boolean;
  disabled?: boolean;
  /** バリデーションエラー（box の borderColor が danger になる）。 */
  error?: boolean;
  testID?: string;
}

export function Checkbox({
  label,
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  error = false,
  testID,
}: CheckboxProps) {
  const { theme, mode } = useTheme();
  const resolved = useMemo(
    () => resolveCheckboxStyle(theme, mode, { checked, indeterminate, error }),
    [theme, mode, checked, indeterminate, error],
  );

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: indeterminate ? "mixed" : checked, disabled }}
      accessibilityLabel={label}
      testID={testID}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: resolved.gap,
        // 実効タップ標的 44pt。背景を持たない行なので hitSlop でなく minHeight（規約 10-(b)、
        // 縦積みの隣接行と当たり判定が重ならない）
        minHeight: CHECKBOX_SPEC.rowMinHeight,
        opacity: disabled ? CHECKBOX_SPEC.disabledOpacity : 1,
      }}
    >
      <View style={[resolved.boxStyle, { alignItems: "center", justifyContent: "center" }]}>
        {indeterminate ? (
          // 横棒（一部選択）。markColor = text-on-accent（states.checked.markColor と同源）。
          <View
            style={{
              width: INDETERMINATE_BAR.width,
              height: INDETERMINATE_BAR.height,
              backgroundColor: resolved.markColor,
            }}
          />
        ) : checked ? (
          // L 字 border を -45deg 回転させた checkmark（svg 非依存の描画トリック）。
          <View
            style={{
              width: CHECKMARK.width,
              height: CHECKMARK.height,
              borderLeftWidth: CHECKMARK.borderWidth,
              borderBottomWidth: CHECKMARK.borderWidth,
              borderColor: resolved.markColor,
              marginTop: CHECKMARK.offsetY,
              transform: [{ rotate: "-45deg" }],
            }}
          />
        ) : null}
      </View>
      <Text variant="base" color="text-default">
        {label}
      </Text>
    </Pressable>
  );
}

// conformance test 用の contract メタ（§2 A-3）。scripts/lib/conformance.test.ts が
// 「この宣言が正しい contract を指しているか」を静的スキャンで照合する。
Checkbox.__contract = CONTRACTS.checkbox;
