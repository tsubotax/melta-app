/**
 * TextField — テキスト入力フィールド（contract: textfield）。RN TextInput の薄いラッパ。
 *
 * - label 必須（FORM_NO_LABEL_OMIT）。label（labelStyle）→ input → helperText / errorText の縦構成。
 * - variant は検証状態（default/error/success）。disabled=true で variant を "disabled" に上書きし、
 *   editable=false + accessibilityState.disabled を併せて適用する（recipe description の規約）。
 * - error 時は errorText を必ずテキストで表示する（FORM_NO_COLOR_ONLY_ERROR = 色だけで伝えない）。
 *   RN には aria-describedby 相当が無いため、accessibilityState ではなく Text の実表示で伝える。
 * - focus は内部 state（onFocus/onBlur）で recipe states.focus の inputStyle 差分
 *   （borderColor=primary.500）を重ねる。disabled 時は focus させない。
 * - 色・寸法の決定は pure resolver（textfield.styles.ts）に分離。
 *   recipes/app/textfield.recipe.json との機械照合は scripts/lib/textfield-conformance.test.ts が行う。
 */

import { useMemo, useState } from "react";
import {
  TextInput,
  View,
  Text as RNText,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import {
  resolveTextFieldStyle,
  resolveTextFieldFocusStyle,
  type TextFieldSize,
} from "./textfield.styles";

interface TextFieldProps {
  /** ラベル（必須。placeholder だけの入力欄を作らせない = FORM_NO_LABEL_OMIT）。 */
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  /** 検証状態。disabled は prop（下の disabled）で表現するため variant には含めない。 */
  variant?: "default" | "error" | "success";
  /** true で variant を "disabled" に上書き + editable=false + accessibilityState.disabled。 */
  disabled?: boolean;
  size?: TextFieldSize;
  /** 補足テキスト（error 表示中は errorText を優先して非表示）。 */
  helperText?: string;
  /** variant="error" 時に表示するエラーメッセージ（色だけでなくテキストで伝える）。 */
  errorText?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  variant = "default",
  disabled = false,
  size = "medium",
  helperText,
  errorText,
  style,
  testID,
}: TextFieldProps) {
  const { theme, mode, colors } = useTheme();
  const [focused, setFocused] = useState(false);

  // disabled prop が variant を上書き（契約の variant 語彙 "disabled" への写像）。
  const effectiveVariant = disabled ? "disabled" : variant;
  const resolved = useMemo(
    () => resolveTextFieldStyle(theme, mode, { variant: effectiveVariant, size }),
    [theme, mode, effectiveVariant, size],
  );
  const focusStyle = useMemo(() => resolveTextFieldFocusStyle(theme), [theme]);

  const showError = effectiveVariant === "error" && errorText != null;

  return (
    <View style={style} testID={testID}>
      <RNText style={resolved.label}>{label}</RNText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors["text-muted"]}
        editable={!disabled}
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        onFocus={() => {
          if (!disabled) setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        style={[resolved.input, focused && !disabled ? focusStyle : null]}
      />
      {helperText != null && !showError && (
        <RNText style={resolved.helperText}>{helperText}</RNText>
      )}
      {showError && <RNText style={resolved.errorText}>{errorText}</RNText>}
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
TextField.__contract = CONTRACTS.textfield;
