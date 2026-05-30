/**
 * Button — CTA / セカンダリ / アイコンボタン（設計書 §1, §4 C-3）。contract: button。
 *
 * - variant 6（contained/outlined/neutral/lighted/danger/subtle）× size 3（small/medium/large）。
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
import type { NativeTheme, ThemeMode, FontSizeKey, SpacingKey } from "../theme";
import { useFocusRing, FocusRing } from "./_internal/focus-ring";
import { CONTRACTS } from "../contracts/contract-types";

type ButtonVariant =
  | "contained"
  | "outlined"
  | "neutral"
  | "lighted"
  | "danger"
  | "subtle";
type ButtonSize = "small" | "medium" | "large";

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
    | { iconOnly: true; accessibilityLabel: string; label?: never }
    | { iconOnly?: false; label: string }
  );

/** size → height / 横 padding / label fontSize / icon box（contract sizes/iconButton と整合）。 */
const SIZE_SPEC: Record<
  ButtonSize,
  { height: number; px: SpacingKey; font: FontSizeKey; iconBox: number }
> = {
  small: { height: 32, px: "3", font: "sm", iconBox: 32 },
  medium: { height: 40, px: "4", font: "base", iconBox: 40 },
  large: { height: 48, px: "6", font: "base", iconBox: 48 },
};

/**
 * variant → 色解決（button.contract tokenRefs の 1:1 写像）。
 * 文字色は variant により semantic 外（primary.500 等）もあるため hex 文字列で返し、
 * Text の style で color 上書きする（Text の color prop は SemanticColors キー限定のため）。
 */
function resolveVariant(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: ButtonVariant,
): { bg?: string; pressedBg?: string; textColor: string; border?: string } {
  const c = theme.color;
  const sem = c.semantic[mode];
  switch (variant) {
    case "contained":
      return { bg: c.primary["500"], pressedBg: c.primary["700"], textColor: sem["text-on-accent"] };
    case "outlined":
      return {
        bg: sem["bg-surface"],
        pressedBg: sem["bg-surface-alt"],
        textColor: sem["text-default"],
        border: sem["border-default"],
      };
    case "neutral":
      return { bg: sem["bg-surface-alt"], pressedBg: sem["border-default"], textColor: sem["text-default"] };
    case "lighted":
      return { bg: c.primary["50"], pressedBg: c.primary["100"], textColor: c.primary["500"] };
    case "danger":
      return { bg: c.status.danger.base, pressedBg: c.status.danger.textLight, textColor: sem["text-on-accent"] };
    case "subtle":
      return { bg: "transparent", pressedBg: sem["bg-surface-alt"], textColor: sem["text-default"] };
  }
}

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
          {iconOnly && leadingIcon == null && trailingIcon == null && null}
          {trailingIcon != null && <View>{trailingIcon}</View>}
        </>
      )}
      <FocusRing visible={focused && !isDisabled} radius={theme.radius.md} />
    </Pressable>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Button.__contract = CONTRACTS.button;
