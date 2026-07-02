/**
 * Button — CTA / セカンダリ / アイコンボタン（設計書 §1, §4 C-3）。contract: button。
 *
 * - variant 7（contained/outlined/brand-outline/neutral/lighted/danger/subtle）× size 3（small/medium/large）。
 * - iconOnly は discriminated union で accessibilityLabel 必須を型強制（§4、label 排他）。
 * - states（§2 mapping）: hover→pressed（背景を pressed 色に）、focus→FocusRing overlay（共通 helper）、
 *   disabled→prop（opacity + 非活性）、loading→Spinner + disabled 相当。
 * - 色は variant ごとに NativeTheme から解決（button.contract tokenRefs を 1:1 で写像）。
 *   contained の pressed は hover-bg=primary.700（contract に native readable token あり、唯一）。
 *   他 variant の pressed 視覚変化は contract が Tailwind のみ＝Phase1 non-conformant（§2 M-1）、
 *   ここでは pressed 時に薄い overlay を敷く近似に留め、Phase2 で contract に pressed-* token 追加。
 * - height は contract sizes（small32/medium40/large48）。
 */

import { useMemo, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "./Text";
import { useTheme } from "../theme";
import { useFocusRing, FocusRing } from "./_internal/focus-ring";
import { CONTRACTS } from "../contracts/contract-types";
import { SIZE_SPEC, resolveVariant, type ButtonVariant, type ButtonSize } from "./button.styles";

interface ButtonBase {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

type ButtonProps = ButtonBase &
  (
    // iconOnly は leadingIcon 必須（空ボタンを型で排除、§4 の最小 DU を保ちつつ icon 1個必須）。
    | { iconOnly: true; accessibilityLabel: string; leadingIcon: ReactNode; label?: never }
    | { iconOnly?: false; label: string }
  );

export function Button(props: ButtonProps) {
  const { theme, mode } = useTheme();
  const {
    variant = "contained",
    size = "medium",
    leadingIcon,
    trailingIcon,
    disabled = false,
    loading = false,
    onPress,
    style,
    testID,
  } = props;
  const { focused, focusHandlers } = useFocusRing();

  const spec = SIZE_SPEC[size];
  const colors = useMemo(() => resolveVariant(theme, mode, variant), [theme, mode, variant]);
  const isDisabled = disabled || loading;
  const iconOnly = props.iconOnly === true;

  return (
    <Pressable
      {...focusHandlers}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={iconOnly ? props.accessibilityLabel : undefined}
      testID={testID}
      style={({ pressed }) => [
        {
          height: spec.height,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing["2"],
          borderRadius: theme.radius.md,
          backgroundColor: pressed && !isDisabled ? colors.pressedBg : colors.bg,
          ...(iconOnly
            ? { width: spec.iconBox }
            : { paddingHorizontal: theme.spacing[spec.px] }),
          ...(colors.border != null ? { borderWidth: 1, borderColor: colors.border } : null),
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textColor} />
      ) : (
        <>
          {leadingIcon != null && <View>{leadingIcon}</View>}
          {!iconOnly && (
            <Text variant={spec.font} weight="medium" style={{ color: colors.textColor }}>
              {props.label}
            </Text>
          )}
          {trailingIcon != null && <View>{trailingIcon}</View>}
        </>
      )}
      <FocusRing visible={focused && !isDisabled} radius={theme.radius.md} />
    </Pressable>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Button.__contract = CONTRACTS.button;
