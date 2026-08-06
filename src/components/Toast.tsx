/**
 * Toast — 一時的な通知メッセージ（feedback）。contract: toast。
 * 4タイプ（success/error/warning/info）。Alert と同系の bg subtle + text 色に elevation.sm を重ねる。
 *
 * - presentational component。表示位置・キュー・自動消滅はアプリ層の責務
 *   （entering/visible/dismissing のアニメ state は Phase 外、recipe description）。
 * - closeButton は契約 anatomy で必須 → onClose を required prop にして型で強制。
 *   Pressable + テキスト ×（accessibilityLabel は既定 "閉じる"、closeAccessibilityLabel で差し替え可能）。
 * - action と × は隣接する 2 つの操作要素。当たり判定が重なると押し違いが起きるので、
 *   横 hitSlop を gap の 1/2 に絞る（toast.styles.ts の TOAST_TAP_TARGET）。
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
import { Text } from "../primitives/Text.js";
import { useTheme } from "../theme/index.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import {
  TOAST_SPEC,
  TOAST_TAP_TARGET,
  resolveToastStyles,
  type ToastVariant,
} from "./toast.styles.js";

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
  /**
   * × ボタンの accessibilityLabel（i18n フック）。既定は日本語 "閉じる"
   * （既存アプリの読み上げを変えないため据え置き）。
   */
  closeAccessibilityLabel?: string;
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
  closeAccessibilityLabel = "閉じる",
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
        // 横 hitSlop は gap/2（= 6）まで。10 のままだと隣の × と当たり判定が 8pt 重なり、
        // 手前に描かれる × が勝って「元に戻す」が押せない（toast.styles.ts の TOAST_TAP_TARGET 参照）。
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={TOAST_TAP_TARGET.hitSlop}
          // 短いラベル（"OK" 等）でも横の実効 44 を割らないよう × と同じ幅下限（背景なし = 見た目不変）
          style={{
            minWidth: TOAST_TAP_TARGET.actionMinWidth,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            variant={TOAST_SPEC.messageFont}
            weight={TOAST_SPEC.messageWeight}
            style={{ color: styles.messageStyle.color, textDecorationLine: "underline" }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
      {/* 最小タップターゲット確保: 横 hitSlop を gap/2 に絞るぶん箱を 32pt に広げて 32+6×2 = 44pt。
          縦は 24 + 10×2 = 44pt（正典パターン）。 */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={closeAccessibilityLabel}
        hitSlop={TOAST_TAP_TARGET.hitSlop}
        style={{
          minWidth: TOAST_TAP_TARGET.closeMinWidth,
          minHeight: TOAST_TAP_TARGET.closeMinHeight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text variant="xs" style={{ color: styles.messageStyle.color }}>
          ×
        </Text>
      </Pressable>
    </View>
  );
}

// conformance test 用の contract メタ（§2 A-3）。scripts/lib/conformance.test.ts が
// 「この宣言が正しい contract を指しているか」を静的スキャンで照合する。
Toast.__contract = CONTRACTS.toast;
