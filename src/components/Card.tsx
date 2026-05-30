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

/** Card の土台 style を一元生成。non-interactive / interactive の両分岐で共有する。 */
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
    ...(isMedia ? { overflow: "hidden" } : { padding: theme.spacing["6"] }),
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
  const interactive = INTERACTIVE[variant] && onPress != null;
  const isMedia = variant === "media";

  const content = (
    <>
      {media != null && <View>{media}</View>}
      <View style={isMedia ? { padding: theme.spacing["6"] } : undefined}>
        {header}
        {children}
        {footer}
      </View>
    </>
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

  // action/link: pressed 時 elevation.sm→md。
  return (
    <Pressable
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
    </Pressable>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Card.__contract = CONTRACTS.card;
