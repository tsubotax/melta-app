/**
 * Alert — インラインアラート通知（feedback）。contract: alert。
 * Info / Success / Warning / Error の4タイプ。Text の compose + 任意 icon slot / 閉じるボタン。
 *
 * - RN では border を持たず bg subtle + text 色で表現（status token に border 用の中間色が無い、
 *   recipe description）。COLOR_ONLY_FORBIDDEN は title/message のテキストと icon slot で担保する設計。
 * - icon は ReactNode slot（EmptyState 前例。Icon を差すなら melta-app/icons を利用者が opt-in）。
 * - × の accessibilityLabel は既定 "閉じる"（closeAccessibilityLabel で差し替え可能）。
 *   当たり判定は正典パターン（24 + hitSlop 10 = 44pt）。
 * - a11y（§2 web→RN mapping）: web の role=alert(error/warning) / status(info/success) を、
 *   error/warning → accessibilityRole="alert"、info/success → accessibilityLiveRegion="polite"
 *   （Android のみ有効。RN に status role が無いための写像）に落とす。
 * - 色・寸法の決定は pure resolver（alert.styles.ts）に分離。dark mode は resolver が
 *   status.*.subtleDark / textDark を解決（info のみ primary 固定）。
 *   recipes/app/alert.recipe.json との機械照合は scripts/lib/alert-conformance.test.ts が行う。
 */

import { useMemo, type ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../primitives/Text.js";
import { useTheme } from "../theme/index.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import {
  ALERT_CLOSE_TAP_TARGET,
  ALERT_SPEC,
  resolveAlertStyles,
  type AlertVariant,
} from "./alert.styles.js";

interface AlertProps {
  /** 通知タイプ（contract variant）。 */
  variant: AlertVariant;
  /** 見出し（任意）。 */
  title?: string;
  /** 本文（必須）。 */
  message: string;
  /** 先頭の icon slot（デフォルト無し）。 */
  icon?: ReactNode;
  /** あれば右端に閉じるボタン（Pressable の ×）を出す。 */
  onClose?: () => void;
  /**
   * × ボタンの accessibilityLabel（i18n フック）。既定は日本語 "閉じる"
   * （既存アプリの読み上げを変えないため据え置き）。
   */
  closeAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Alert({
  variant,
  title,
  message,
  icon,
  onClose,
  closeAccessibilityLabel = "閉じる",
  style,
  testID,
}: AlertProps) {
  const { theme, mode } = useTheme();
  const styles = useMemo(() => resolveAlertStyles(theme, mode, variant), [theme, mode, variant]);
  const urgent = variant === "error" || variant === "warning";

  return (
    <View
      accessibilityRole={urgent ? "alert" : undefined}
      accessibilityLiveRegion={urgent ? undefined : "polite"}
      testID={testID}
      style={[styles.containerStyle, style]}
    >
      {icon != null && <View>{icon}</View>}
      <View style={{ flex: 1, gap: theme.spacing["1"] }}>
        {title != null && (
          <Text
            variant={ALERT_SPEC.titleFont}
            weight={ALERT_SPEC.titleWeight}
            style={{ color: styles.titleStyle.color }}
          >
            {title}
          </Text>
        )}
        <Text variant={ALERT_SPEC.messageFont} style={{ color: styles.messageStyle.color }}>
          {message}
        </Text>
      </View>
      {onClose != null && (
        // 最小タップターゲット確保: 正典パターン 24 + hitSlop 10 = 実効 44pt（Tag removable と同型）。
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeAccessibilityLabel}
          hitSlop={ALERT_CLOSE_TAP_TARGET.hitSlop}
          style={{
            minWidth: ALERT_CLOSE_TAP_TARGET.minWidth,
            minHeight: ALERT_CLOSE_TAP_TARGET.minHeight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text variant="xs" style={{ color: styles.messageStyle.color }}>
            ×
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// conformance test 用の contract メタ（§2 A-3）。scripts/lib/conformance.test.ts が
// 「この宣言が正しい contract を指しているか」を静的スキャンで照合する。
Alert.__contract = CONTRACTS.alert;
