/**
 * TextField — テキスト入力フィールド（contract: textfield）。RN TextInput の薄いラッパ。
 *
 * - label 必須（FORM_NO_LABEL_OMIT）。label（labelStyle）→ input → helperText / errorText の縦構成。
 * - variant は検証状態（default/error/success）。disabled=true で variant を "disabled" に上書きし、
 *   editable=false + accessibilityState.disabled を併せて適用する（recipe description の規約）。
 * - error 時は errorText を必ずテキストで表示する（FORM_NO_COLOR_ONLY_ERROR = 色だけで伝えない）。
 *   RN には aria-describedby 相当が無いため、(a) errorText を input の accessibilityLabel に合成
 *   （再フォーカス時に読み上げ）、(b) errorText 側に accessibilityLiveRegion="polite"（Android は
 *   出現時に通知。iOS の即時通知が要る画面は submit 時に announceForAccessibility を併用する —
 *   docs/patterns.md 参照）。
 * - focus は内部 state（onFocus/onBlur）で recipe states.focus の inputStyle 差分
 *   （borderColor=primary.500）を重ねる。disabled 時は focus スタイルを付けない。
 *   外部の onFocus/onBlur は RN の event ごと常に透過する（内部の視覚 state と分離）。
 * - 色・寸法の決定は pure resolver（textfield.styles.ts）に分離。
 *   recipes/app/textfield.recipe.json との機械照合は scripts/lib/textfield-conformance.test.ts が行う。
 * - RN TextInput へ透過するのは入力メソッド系 props（keyboardType / autoCapitalize / autoCorrect /
 *   maxLength / returnKeyType / onSubmitEditing / onBlur / onFocus）のみ。style 系 props は
 *   透過しない（token 純度維持）。
 */

import { useMemo, useState } from "react";
import {
  Platform,
  TextInput,
  View,
  Text as RNText,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import {
  resolveTextFieldStyle,
  resolveTextFieldFocusStyle,
  type TextFieldSize,
} from "./textfield.styles";

/**
 * Android の EditText は固定 height と組み合わさると既定の縦 padding で文字が
 * 上寄り・下端切れになるため、縦 padding を殺して縦センターに揃える。
 * textAlignVertical は Android 専用、paddingVertical: 0 は iOS の見た目を変えない
 * （iOS の単一行入力は元々縦センター）。
 * さらに Android では Noto CJK のフォントメトリクス由来で文字インクが
 * 1dp 強下寄りになる（Pixel 実機ピクセル実測 +2.7px/density2.5。
 * includeFontPadding: false は gravity center 下では無効なことも実測済み）ため、
 * paddingBottom の光学ナッジで打ち消す（gravity center は残り高さの中央に置くので
 * paddingBottom p で p/2 上がる）。
 * recipe（styleRefs）の写像ではなく RN 実装の補正なので resolver には置かない。
 */
/* eslint-disable melta/no-raw-spacing -- spacing の選択ではなく EditText 既定 padding の打ち消しと CJK 光学ナッジ（実測由来の固定値） */
/** OS 毎の補正値を返す純関数（jest は Platform=ios 固定のため、Android 分岐はこれを直接検証する）。 */
export function resolveInputVerticalFix(os: typeof Platform.OS): TextStyle {
  return {
    paddingVertical: 0,
    ...(os === "android" ? { paddingBottom: 2 } : null),
    textAlignVertical: "center",
  };
}
/* eslint-enable melta/no-raw-spacing */

const INPUT_VERTICAL_FIX = resolveInputVerticalFix(Platform.OS);

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
  /** キーボード種別（RN TextInput へ透過）。 */
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  maxLength?: number;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  /** blur 時コールバック（blur 検証用）。RN の event ごと透過し、内部の focus スタイル制御と分離。 */
  onBlur?: TextInputProps["onBlur"];
  onFocus?: TextInputProps["onFocus"];
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
  keyboardType,
  autoCapitalize,
  autoCorrect,
  maxLength,
  returnKeyType,
  onSubmitEditing,
  onBlur,
  onFocus,
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
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={showError ? `${label}。エラー: ${errorText}` : label}
        accessibilityState={{ disabled }}
        onFocus={(e) => {
          if (!disabled) setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[resolved.input, INPUT_VERTICAL_FIX, focused && !disabled ? focusStyle : null]}
      />
      {helperText != null && !showError && (
        <RNText style={resolved.helperText}>{helperText}</RNText>
      )}
      {showError && (
        <RNText accessibilityLiveRegion="polite" style={resolved.errorText}>
          {errorText}
        </RNText>
      )}
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
TextField.__contract = CONTRACTS.textfield;
