/**
 * Toast — 一時的な通知メッセージ（feedback）。contract: toast。
 * 4タイプ（success/error/warning/info）。Alert と同系の bg subtle + text 色に elevation.sm を重ねる。
 *
 * - presentational component。表示位置・キュー・自動消滅はアプリ層の責務
 *   （entering/visible/dismissing のアニメ state は Phase 外、recipe description）。
 * - closeButton は契約 anatomy で必須 → onClose を required prop にして型で強制。
 *   Pressable + テキスト ×（accessibilityLabel="閉じる" 必須）。
 * - a11y（§2 web→RN mapping）: web の role=status + aria-live=polite を
 *   accessibilityLiveRegion="polite"（Android のみ有効）に落とす。
 * - elevation は theme.elevation.sm（iOS shadow* + Android elevation の複合値）を container に
 *   spread（Surface と同じ扱い）。
 * - 色・寸法の決定は pure resolver（toast.styles.ts）に分離。dark mode は resolver が
 *   status.*.subtleDark / textDark を解決（info のみ primary 固定）。
 *   recipes/app/toast.recipe.json との機械照合は scripts/lib/toast-conformance.test.ts が行う。
 */

import { useMemo } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../primitives/Text";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import { TOAST_SPEC, resolveToastStyles, type ToastVariant } from "./toast.styles";

interface ToastProps {
  /** 通知タイプ（contract variant）。 */
  variant: ToastVariant;
  /** 本文（必須）。 */
  message: string;
  /** 補足説明（任意。message の下に縦積み）。 */
  description?: string;
  /** 閉じるボタン（契約 anatomy で必須）。 */
  onClose: () => void;
  /** あれば message の後にアクションテキスト（onAction とセットで有効）。 */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Toast({
  variant,
  message,
  description,
  onClose,
  actionLabel,
  onAction,
  style,
  testID,
}: ToastProps) {
  const { theme, mode } = useTheme();
  const styles = useMemo(() => resolveToastStyles(theme, mode, variant), [theme, mode, variant]);

  return (
    <View
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[styles.containerStyle, styles.elevation, style]}
    >
      <View style={{ flex: 1, gap: theme.spacing["1"] }}>
        <Text
          variant={TOAST_SPEC.messageFont}
          weight={TOAST_SPEC.messageWeight}
          style={{ color: styles.messageStyle.color }}
        >
          {message}
        </Text>
        {description != null && (
          // description の style は recipe 外（anatomy の description? slot）。message と同色・同サイズ、weight 無し。
          <Text variant={TOAST_SPEC.messageFont} style={{ color: styles.messageStyle.color }}>
            {description}
          </Text>
        )}
      </View>
      {actionLabel != null && onAction != null && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10}>
          <Text
            variant={TOAST_SPEC.messageFont}
            weight={TOAST_SPEC.messageWeight}
            style={{ color: styles.messageStyle.color, textDecorationLine: "underline" }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
      {/* 最小タップターゲット確保: min 24 + hitSlop（Tag removable と同じ手当て）。 */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="閉じる"
        hitSlop={10}
        style={{ minWidth: 24, minHeight: 24, alignItems: "center", justifyContent: "center" }}
      >
        <Text variant="xs" style={{ color: styles.messageStyle.color }}>
          ×
        </Text>
      </Pressable>
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Toast.__contract = CONTRACTS.toast;
