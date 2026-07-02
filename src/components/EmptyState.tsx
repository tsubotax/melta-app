/**
 * EmptyState — データ無し時のプレースホルダー（設計書 §1）。contract: empty-state。
 * Text + Button の compose（§1）。icon + title + description + 任意の action。
 *
 * - title は見出しとして読み上げ（Text role="heading"）。
 * - action は Button(contained) を内部 compose。
 * - 中央寄せレイアウト。色は token（title=text-heading, description=text-muted）。
 * - 色・寸法の決定は pure resolver（empty-state.styles.ts）に分離。Text へ渡すキーも
 *   EMPTY_STATE_SPEC（同ファイル）を SSOT として共有し、
 *   recipes/app/empty-state.recipe.json との機械照合は scripts/lib/empty-state-conformance.test.ts が行う。
 */

import { useMemo, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../primitives/Text";
import { Button } from "../primitives/Button";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import { EMPTY_STATE_SPEC, resolveEmptyStateStyles } from "./empty-state.styles";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function EmptyState({ icon, title, description, action, style, testID }: EmptyStateProps) {
  const { theme, mode } = useTheme();
  const styles = useMemo(() => resolveEmptyStateStyles(theme, mode), [theme, mode]);
  return (
    <View testID={testID} style={[styles.style, style]}>
      {icon != null && <View>{icon}</View>}
      <Text
        variant={EMPTY_STATE_SPEC.titleFont}
        role="heading"
        weight={EMPTY_STATE_SPEC.titleWeight}
        color={EMPTY_STATE_SPEC.titleColor}
        style={{ textAlign: styles.titleStyle.textAlign }}
      >
        {title}
      </Text>
      {description != null && (
        <Text
          variant={EMPTY_STATE_SPEC.descriptionFont}
          color={EMPTY_STATE_SPEC.descriptionColor}
          style={{ textAlign: styles.descriptionStyle.textAlign }}
        >
          {description}
        </Text>
      )}
      {action != null && (
        <View style={styles.actionStyle}>
          <Button variant="contained" label={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
EmptyState.__contract = CONTRACTS.emptyState;
