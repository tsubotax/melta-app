/**
 * focus-ring — Pressable の focus 可視化を共通化する internal helper（設計書 §1/§2）。
 *
 * RN にブラウザの focus-visible / ring はないので、focus 時に「outline 相当の View overlay」を
 * 対象の外側に絶対配置で描く（§2 mapping: focus → accessible + Pressable onFocus で outline）。
 * 外付けキーボード / TV / a11y focus で効く。Button / Tag / Card で共有する（個別実装の重複を防ぐ）。
 *
 * 使い方:
 *   const { focused, focusHandlers } = useFocusRing();
 *   <Pressable {...focusHandlers} style={{ ... }}>
 *     {children}
 *     <FocusRing visible={focused} radius={theme.radius.md} />
 *   </Pressable>
 * 注: 親 Pressable は position:relative（RN 既定）かつ overflow を hidden にしないこと
 *     （ring は inset 負値で外側に出るため）。
 */

import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "../../theme";

export function useFocusRing() {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    focusHandlers: {
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}

interface FocusRingProps {
  visible: boolean;
  /** 対象の borderRadius。ring はこれに inset 分を足した角丸で描く。 */
  radius: number;
}

const INSET = 3;

export function FocusRing({ visible, radius }: FocusRingProps) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -INSET,
        left: -INSET,
        right: -INSET,
        bottom: -INSET,
        borderWidth: 2,
        borderColor: theme.color.primary["500"],
        borderRadius: radius + INSET,
      }}
    />
  );
}
