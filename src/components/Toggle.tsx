/**
 * Toggle — ON/OFF スイッチ（contract: toggle）。custom track+thumb 実装。
 *
 * - RN Switch は token 制御（track/thumb 色 + サイズ段階）が弱いため使わない
 *   （recipe description の規約）。Pressable の track + 内側 thumb で組む。
 * - variant（off/on = variantModeledStates）は value:boolean から暗黙決定する。
 * - thumb 位置: track に padding=thumbOffset を持たせ、value で justifyContent
 *   flex-start / flex-end を切り替える（アニメは Phase 外）。
 * - disabled: recipe states.disabled の opacity + accessibilityState.disabled + onPress 無効。
 * - a11y: accessibilityRole="switch" + accessibilityState.checked。label があれば右に表示し、
 *   Pressable 全体がタップ領域 + accessibilityLabel になる。
 * - 色・寸法の決定は pure resolver（toggle.styles.ts）に分離。
 *   recipes/app/toggle.recipe.json との機械照合は scripts/lib/toggle-conformance.test.ts が行う。
 */

import { useMemo } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../primitives/Text";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import {
  resolveToggleStyle,
  TOGGLE_DISABLED_OPACITY,
  type ToggleSize,
  type ToggleVariant,
} from "./toggle.styles";

interface ToggleProps {
  /** 現在値（true=on / false=off。variant はここから暗黙決定）。 */
  value: boolean;
  onValueChange?: (value: boolean) => void;
  /** あれば track の右にラベル表示（Pressable 全体がタップ領域）。 */
  label?: string;
  size?: ToggleSize;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Toggle({
  value,
  onValueChange,
  label,
  size = "medium",
  disabled = false,
  style,
  testID,
}: ToggleProps) {
  const { theme, mode } = useTheme();

  const variant: ToggleVariant = value ? "on" : "off";
  const resolved = useMemo(
    () => resolveToggleStyle(theme, mode, { variant, size }),
    [theme, mode, variant, size],
  );

  return (
    <Pressable
      onPress={() => onValueChange?.(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      testID={testID}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: theme.spacing["2"],
          opacity: disabled ? TOGGLE_DISABLED_OPACITY : 1,
        },
        style,
      ]}
    >
      <View
        style={[
          resolved.track,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: value ? "flex-end" : "flex-start",
          },
        ]}
      >
        <View style={resolved.thumb} />
      </View>
      {label != null && <Text>{label}</Text>}
    </Pressable>
  );
}

// conformance test 用の contract メタ（§2 A-3）。scripts/lib/conformance.test.ts が
// 「この宣言が正しい contract を指しているか」を静的スキャンで照合する。
Toggle.__contract = CONTRACTS.toggle;
