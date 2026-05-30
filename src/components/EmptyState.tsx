/**
 * EmptyState — データ無し時のプレースホルダー（設計書 §1）。contract: empty-state。
 * Text + Button の compose（§1）。icon + title + description + 任意の action。
 *
 * - title は見出しとして読み上げ（Text role="heading"）。
 * - action は Button(contained) を内部 compose。
 * - 中央寄せレイアウト。色は token（title=text-heading, description=text-muted）。
 */

import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../primitives/Text";
import { Button } from "../primitives/Button";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function EmptyState({ icon, title, description, action, style, testID }: EmptyStateProps) {
  const { theme } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        { alignItems: "center", justifyContent: "center", padding: theme.spacing["8"], gap: theme.spacing["3"] },
        style,
      ]}
    >
      {icon != null && <View>{icon}</View>}
      <Text variant="lg" role="heading" weight="semibold" color="text-heading" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {description != null && (
        <Text variant="sm" color="text-muted" style={{ textAlign: "center" }}>
          {description}
        </Text>
      )}
      {action != null && (
        <View style={{ marginTop: theme.spacing["2"] }}>
          <Button variant="contained" label={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
EmptyState.__contract = CONTRACTS.emptyState;
