/**
 * Modal — フォーカストラップとバックドロップを備えたモーダルダイアログ。
 * contract: modal（feedback）。RN core Modal（transparent + fade）に overlay + panel を載せる。
 *
 * - variant（confirmation/form/alert）は意味分類で style は共通（contract / recipe と同じ）。
 * - size は panel の maxWidth（タブレット以上で効く。モバイルは width 100% - overlay padding が先）。
 * - 契約の対応物: focus trap → accessibilityViewIsModal（iOS のフォーカス閉じ込め）、
 *   Escape → Android back（onRequestClose）、open/closing state → RN Modal の visible + animationType。
 * - overlay tap で閉じる（MODAL_OVERLAY_REQUIRED）。panel 側は onStartShouldSetResponder で
 *   touch を claim し、overlay への伝播を止める（panel 内 tap では閉じない）。
 * - title 行の右端に閉じるボタン「×」（MODAL_CLOSE_REQUIRED、accessibilityLabel は既定 "閉じる"、
 *   closeAccessibilityLabel で差し替え可能）。当たり判定は正典パターン（24 + hitSlop 10 = 44pt）。
 *   title は melta の Text ではなく titleStyle 直（recipe が typography を持つ）。
 * - style の決定は pure resolver（modal.styles.ts）に分離 — recipe との機械照合対象。
 *   title 行の row layout と × の見た目は recipe 外の構造 glue（token 経由で解決）。
 */

import { useMemo, type ReactNode } from "react";
import {
  Modal as RNModal,
  Pressable,
  Text as RNText,
  View,
} from "react-native";
import { useTheme } from "../theme/index.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import {
  MODAL_CLOSE_TAP_TARGET,
  resolveModalStyle,
  type ModalSize,
  type ModalStyle,
  type ModalVariant,
} from "./modal.styles.js";

interface ModalProps {
  /** 表示制御（契約の open state に対応。閉じるアニメは RN Modal に委譲）。 */
  visible: boolean;
  /** 閉じ要求（overlay tap / × / Android back の全経路で呼ばれる）。 */
  onClose: () => void;
  /** タイトル（契約 aria-labelledby 相当、必須）。 */
  title: string;
  /** 意味分類（style は 3 つとも同一）。default "confirmation"。 */
  variant?: ModalVariant;
  /** panel の maxWidth 段階。default "medium"。 */
  size?: ModalSize;
  /** アクション群（任意）。footerStyle の row に載る。 */
  footer?: ReactNode;
  /**
   * × ボタンの accessibilityLabel（i18n フック）。既定は日本語 "閉じる"
   * （既存アプリの読み上げを変えないため据え置き）。
   */
  closeAccessibilityLabel?: string;
  testID?: string;
  /** body。 */
  children: ReactNode;
}

export function Modal({
  visible,
  onClose,
  title,
  variant = "confirmation",
  size = "medium",
  footer,
  closeAccessibilityLabel = "閉じる",
  testID,
  children,
}: ModalProps) {
  const { theme, mode, colors } = useTheme();

  const styles = useMemo<ModalStyle>(
    () => resolveModalStyle(theme, mode, { variant, size }),
    [theme, mode, variant, size],
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* overlay: tap で閉じる。a11y 要素にはしない（閉じ導線は × と Android back が担う） */}
      <Pressable style={styles.overlayStyle} onPress={onClose} accessible={false}>
        <View
          style={[styles.panelStyle, styles.panelElevation]}
          accessibilityViewIsModal
          onStartShouldSetResponder={() => true}
          testID={testID}
        >
          {/* title 行: title が余白を占有し × を右端へ押す（recipe 外の構造 glue） */}
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <RNText style={[styles.titleStyle, { flex: 1 }]} accessibilityRole="header">
              {title}
            </RNText>
            {/* 最小タップターゲット確保: 正典パターン（視覚 24 + hitSlop 10 = 実効 44）。
                × のグリフは幅 13pt 前後しかないので、箱の下限を持たせないと 44 に届かない。 */}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={closeAccessibilityLabel}
              hitSlop={MODAL_CLOSE_TAP_TARGET.hitSlop}
              style={{
                minWidth: MODAL_CLOSE_TAP_TARGET.minWidth,
                minHeight: MODAL_CLOSE_TAP_TARGET.minHeight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RNText
                style={{
                  fontSize: theme.typography.fontSize.xl.fontSize,
                  color: colors["text-muted"],
                }}
              >
                ×
              </RNText>
            </Pressable>
          </View>
          <View style={styles.bodyStyle}>{children}</View>
          {footer != null && <View style={styles.footerStyle}>{footer}</View>}
        </View>
      </Pressable>
    </RNModal>
  );
}

Modal.__contract = CONTRACTS.modal;
