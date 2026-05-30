/**
 * Card — コンテンツコンテナ component（設計書 §1）。contract: card。
 *
 * - 土台の解決（bg/radius/elevation/border/padding）は buildCardShape() に一元化し、
 *   非インタラクティブ(View)・インタラクティブ(Pressable) の両分岐で共有する（DRY、形状二重定義を防ぐ）。
 * - variant: basic/media は非インタラクティブ、action/link は Pressable。
 *   action/link は pressed 時 elevation.sm→md（§2 hover→pressed mapping）。
 *   focus-within は RN 非サポートとして Phase1 明示 drop（§2）。
 * - 型で action/link は onPress 必須を強制（§4 の DU 精神。無言で非対話に落ちる事故を防ぐ）。
 * - Card は Image/Metric に依存しない（§1）。media/header/footer/children に呼び出し側が差し込む。
 *   ツー活カードは D2I が slot に Image+Metric を compose する。
 * - media variant は overflow:hidden で角丸に画像をクリップし、body だけにパディング（contract と整合）。
 */

import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme, type NativeTheme, type ElevationKey } from "../theme";
import { useFocusRing, FocusRing } from "../primitives/_internal/focus-ring";
import { CONTRACTS } from "../contracts/contract-types";

type CardVariant = "basic" | "media" | "action" | "link";

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

const INTERACTIVE: Record<CardVariant, boolean> = {
  basic: false,
  media: false,
  action: true,
  link: true,
};

/**
 * Card の外枠 style を一元生成（non-interactive / interactive で共有）。
 * 注: overflow:hidden は付けない。iOS は shadow(elevation) と overflow:hidden が同居すると影が
 * 消えるため（contract は media でも elevation.sm 要求）。media のクリップは内側の clip View で行う。
 */
function buildCardShape(
  theme: NativeTheme,
  bgSurface: string,
  borderColor: string,
  isMedia: boolean,
  elevation: ElevationKey,
): ViewStyle {
  return {
    backgroundColor: bgSurface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor,
    // media は内側 clip View が padding を持つので外枠は padding なし。
    ...(isMedia ? null : { padding: theme.spacing["6"] }),
    ...theme.elevation[elevation],
  };
}

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
  const { theme, colors } = useTheme();
  const { focused, focusHandlers } = useFocusRing();
  const interactive = INTERACTIVE[variant] && onPress != null;
  const isMedia = variant === "media";

  const inner = (
    <>
      {media != null && <View>{media}</View>}
      <View style={isMedia ? { padding: theme.spacing["6"] } : undefined}>
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
      <View
        testID={testID}
        style={[
          buildCardShape(theme, colors["bg-surface"], colors["border-default"], isMedia, "sm"),
          style,
        ]}
      >
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
      style={({ pressed }) => [
        buildCardShape(
          theme,
          colors["bg-surface"],
          colors["border-default"],
          isMedia,
          pressed ? "md" : "sm",
        ),
        style,
      ]}
    >
      {content}
      <FocusRing visible={focused} radius={theme.radius.lg} />
    </Pressable>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Card.__contract = CONTRACTS.card;
