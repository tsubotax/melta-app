/**
 * Card — コンテンツコンテナ component（設計書 §1）。contract: card。
 *
 * - 土台の解決（bg/radius/elevation/border/padding）は pure resolver（card.styles.ts の
 *   resolveCardShape）に一元化し、非インタラクティブ(View)・インタラクティブ(Pressable) の
 *   両分岐で共有する（DRY、形状二重定義を防ぐ）。recipe との機械照合は
 *   scripts/lib/card-conformance.test.ts が行う。
 * - variant: basic/media は非インタラクティブ、action/link は Pressable。
 *   action/link は pressed 時 elevation.sm→md（§2 hover→pressed mapping）。
 *   focus-within は RN 非サポートとして Phase1 明示 drop（§2）。
 * - 型で action/link は onPress 必須を強制（§4 の DU 精神。無言で非対話に落ちる事故を防ぐ）。
 * - Card は Image/Metric に依存しない（§1）。media/header/footer/children に呼び出し側が差し込む。
 *   呼び出し側（例: D2I）は用途に応じて slot に Image+Metric を compose する。
 * - media variant は overflow:hidden で角丸に画像をクリップし、body だけにパディング（contract と整合）。
 */

import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { useFocusRing, FocusRing } from "../primitives/_internal/focus-ring";
import { CONTRACTS } from "../contracts/contract-types";
import { CARD_INTERACTIVE, resolveCardShape, resolveCardBodyStyle } from "./card.styles";

interface CardBase {
  header?: ReactNode;
  footer?: ReactNode;
  media?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** body。 */
  children: ReactNode;
}

// action/link（インタラクティブ）は onPress 必須、basic/media は onPress を取らない（§4 DU 精神）。
type CardProps = CardBase &
  (
    | { variant?: "basic" | "media"; onPress?: never }
    | { variant: "action" | "link"; onPress: () => void }
  );

export function Card({
  variant = "basic",
  header,
  footer,
  media,
  onPress,
  accessibilityLabel,
  style,
  testID,
  children,
}: CardProps) {
  const { theme, mode } = useTheme();
  const { focused, focusHandlers } = useFocusRing();
  const interactive = CARD_INTERACTIVE[variant] && onPress != null;
  const isMedia = variant === "media";

  const inner = (
    <>
      {media != null && <View>{media}</View>}
      <View style={resolveCardBodyStyle(theme, variant)}>
        {header}
        {children}
        {footer}
      </View>
    </>
  );

  // media は内側 clip View で角丸クリップ（外枠の影を消さないため overflow は内側だけに置く、M-1）。
  // borderRadius は外枠 radius.lg から border 分を引かず同値でクリップ（視覚差は実機で微調整可）。
  const content = isMedia ? (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>{inner}</View>
  ) : (
    inner
  );

  if (!interactive) {
    return (
      <View testID={testID} style={[resolveCardShape(theme, mode, variant), style]}>
        {content}
      </View>
    );
  }

  // action/link: pressed 時 elevation.sm→md、focus 時 ring overlay。
  return (
    <Pressable
      {...focusHandlers}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [resolveCardShape(theme, mode, variant, pressed), style]}
    >
      {content}
      <FocusRing visible={focused} radius={theme.radius.lg} />
    </Pressable>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Card.__contract = CONTRACTS.card;
