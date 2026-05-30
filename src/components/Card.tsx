/**
 * Card — コンテンツコンテナ component（設計書 §1）。contract: card。
 *
 * - 土台は Surface(internal)。ただし card.contract は border を持つので Card 側で付与
 *   （Surface は bg/radius/elevation/padding のみ）。
 * - variant: basic/media は非インタラクティブ（Surface ラップ）、action/link は Pressable。
 * - action/link は pressed 時 elevation.sm→md（§2 hover→pressed mapping）。
 *   focus-within は RN 非サポートとして Phase1 明示 drop（§2）。
 * - Card は Image/Metric に依存しない（§1）。media/header/footer/children に呼び出し側が差し込む。
 *   ツー活カードは D2I が slot に Image+Metric を compose する。
 * - media variant は overflow:hidden で角丸に画像をクリップ（contract tailwind と整合）。
 */

import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Surface } from "./Surface";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";

type CardVariant = "basic" | "media" | "action" | "link";

interface CardProps {
  variant?: CardVariant;
  header?: ReactNode;
  footer?: ReactNode;
  media?: ReactNode;
  /** action/link 時の押下ハンドラ。指定時は Pressable になる。 */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** body。 */
  children: ReactNode;
}

const INTERACTIVE: Record<CardVariant, boolean> = {
  basic: false,
  media: false,
  action: true,
  link: true,
};

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
  // media は端まで画像を見せるため body だけにパディング、それ以外は Surface 全体に padding。
  const isMedia = variant === "media";

  const border: ViewStyle = {
    borderWidth: 1,
    borderColor: colors["border-default"],
  };

  const content = (
    <>
      {media != null && (
        <View style={isMedia ? stylesMediaSlot : undefined}>{media}</View>
      )}
      <View style={isMedia ? { padding: theme.spacing["6"] } : undefined}>
        {header}
        {children}
        {footer}
      </View>
    </>
  );

  // 非インタラクティブ: Surface をそのまま土台に。
  if (!interactive) {
    return (
      <Surface
        radius="lg"
        elevation="sm"
        padding={isMedia ? undefined : "6"}
        style={[border, isMedia ? { overflow: "hidden" } : null, style]}
        testID={testID}
      >
        {content}
      </Surface>
    );
  }

  // インタラクティブ(action/link): Pressable で pressed 時 elevation.sm→md。
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [
        {
          backgroundColor: colors["bg-surface"],
          borderRadius: theme.radius.lg,
          ...(isMedia ? null : { padding: theme.spacing["6"] }),
        },
        border,
        isMedia ? { overflow: "hidden" as const } : null,
        theme.elevation[pressed ? "md" : "sm"],
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const stylesMediaSlot: ViewStyle = { width: "100%" };

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Card.__contract = CONTRACTS.card;
