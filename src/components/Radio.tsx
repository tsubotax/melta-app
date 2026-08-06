/**
 * Radio — 単一選択フォームコントロール。contract: radio。
 *
 * - 契約どおり fieldset 相当の RadioGroup として実装する（コンポーネント名は Radio、
 *   recipe description 参照）。groupLabel（= legend 相当の label prop）必須
 *   （FORM_FIELDSET_LEGEND_REQUIRED を props 型で強制）。
 * - variant はレイアウト: vertical（標準）/ horizontal（wrap する横並び）/ card-style
 *   （各 option を枠付きカードにする。web の grid 2col は RN では縦積みに読み替え）。
 * - RN にネイティブ radio が無いため各 option は Pressable + 描画（circle + 内側 dot）。
 *   option 行は minHeight 44pt（RADIO_SPEC.optionMinHeight）で実効タップ標的を確保する。
 * - states（contract → prop の写像）: selected/unselected → value との一致、
 *   error → error?: string（circle の borderColor 差分 + errorText 表示。selected と併用時は
 *   error を優先 = 契約 stateSpecs）、disabled → グループ全体 or option 個別（opacity 0.5 + 非活性）。
 *   focus は非対応（recipe にも focus 差分なし）。
 * - a11y: グループに accessibilityRole="radiogroup"、各 option に "radio" +
 *   accessibilityState={{ checked, disabled }}。
 * - 色・寸法の決定は pure resolver（radio.styles.ts）に分離。
 *   recipes/app/radio.recipe.json との機械照合は scripts/lib/radio-conformance.test.ts が行う。
 */

import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/Text.js";
import { useTheme } from "../theme/index.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import {
  RADIO_SPEC,
  resolveRadioCircleStyle,
  resolveRadioGroupStyle,
  type RadioVariant,
} from "./radio.styles.js";

export interface RadioOption {
  label: string;
  value: string;
  /** label の下に出す補足（text-muted の小テキスト。card-style で使う想定）。 */
  description?: string;
  /** この option だけ操作不可にする。 */
  disabled?: boolean;
}

export interface RadioProps {
  /** グループラベル（fieldset の legend 相当。必須 = FORM_FIELDSET_LEGEND_REQUIRED）。 */
  label: string;
  options: RadioOption[];
  /** 選択中の option の value（未選択は undefined）。 */
  value: string | undefined;
  onChange: (value: string) => void;
  variant?: RadioVariant;
  /** エラーメッセージ。指定時は circle が danger 枠になりメッセージを表示する。 */
  error?: string;
  /** グループ全体を操作不可にする。 */
  disabled?: boolean;
  testID?: string;
}

export function Radio({
  label,
  options,
  value,
  onChange,
  variant = "vertical",
  error,
  disabled = false,
  testID,
}: RadioProps) {
  const { theme, mode } = useTheme();
  const hasError = error != null && error !== "";
  const group = useMemo(() => resolveRadioGroupStyle(theme, mode, variant), [theme, mode, variant]);
  // circle は selected × error の 2 値。option ごとに再計算しないよう両方を先に解決しておく。
  const circles = useMemo(
    () => ({
      unselected: resolveRadioCircleStyle(theme, mode, { selected: false, error: hasError }),
      selected: resolveRadioCircleStyle(theme, mode, { selected: true, error: hasError }),
    }),
    [theme, mode, hasError],
  );

  return (
    <View testID={testID} style={disabled ? { opacity: RADIO_SPEC.disabledOpacity } : undefined}>
      {/* groupLabel（sm/medium/text-heading = recipe groupLabelStyle と同値）。 */}
      <Text
        variant="sm"
        weight="medium"
        color="text-heading"
        style={{ marginBottom: group.groupLabelStyle.marginBottom }}
      >
        {label}
      </Text>
      <View accessibilityRole="radiogroup" style={group.containerStyle}>
        {options.map((option) => {
          const selected = option.value === value;
          const optionDisabled = disabled || option.disabled === true;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              disabled={optionDisabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: optionDisabled }}
              accessibilityLabel={option.label}
              style={[
                // 実効タップ標的 44pt（A11Y_MIN_TAP_TARGET_44）。option 行は背景を持たないので
                // minHeight で下げ止める（視覚不変・隣接 option と当たり判定が重ならない）。
                { minHeight: RADIO_SPEC.optionMinHeight, justifyContent: "center" },
                variant === "card-style"
                  ? [group.cardStyle, selected ? group.cardSelectedStyle : null]
                  : null,
                // グループ disabled は外側 View の opacity で表現済み。二重にしない。
                option.disabled === true && !disabled
                  ? { opacity: RADIO_SPEC.disabledOpacity }
                  : null,
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  // description 付きは複数行になるので circle を先頭行に寄せる。
                  alignItems: option.description != null ? "flex-start" : "center",
                  gap: group.optionGap,
                }}
              >
                <View style={selected ? circles.selected : circles.unselected}>
                  {selected ? <View style={group.dotStyle} /> : null}
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text variant="base" color="text-default">
                    {option.label}
                  </Text>
                  {option.description != null ? (
                    <Text variant="sm" color="text-muted">
                      {option.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {hasError ? (
        // danger.text-light は SemanticColors 外なので style で上書き（Button の textColor と同じ扱い）。
        // View の liveRegion で出現を通知（melta Text は a11y props を透過しないため）。
        <View accessibilityLiveRegion="polite">
          <Text
            variant="xs"
            style={{ color: group.errorTextStyle.color, marginTop: group.errorTextStyle.marginTop }}
          >
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// conformance test 用の contract メタ（§2 A-3）。scripts/lib/conformance.test.ts が
// 「この宣言が正しい contract を指しているか」を静的スキャンで照合する。
Radio.__contract = CONTRACTS.radio;
