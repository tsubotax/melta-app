/**
 * Tag — タグ / フィルターチップ primitive（設計書 §1, §4 C-3）。contract: tag。discriminated union。
 *
 * - variant で必須 prop が変わるため DU（§4: basic は表示のみ、removable は onRemove 必須、
 *   filter-chip は selected/onToggle 必須）。
 * - contract states active/inactive → prop selected:boolean（§2）。selected→accessibilityState.selected。
 * - 配色: basic/removable は bg-page-alt、filter-chip は bg-surface+border、selected 時は
 *   active-bg=primary.50 / active-border=primary.200 / active-text=primary.700（tag.contract tokenRefs）。
 * - label は Text primitive。filter-chip active の文字色だけ primary.700（SemanticColors 外なので style 上書き）。
 * - focus outline は Button(Step8) で Pressable focus handling を共通化してから Tag にも適用する
 *   （§1 は Phase1 scope だが acceptance 外。今は accessibilityState のみ。Button 実装時に回収）。
 */

import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";

interface TagBase {
  label: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

type TagProps =
  | (TagBase & { variant?: "basic" })
  | (TagBase & { variant: "removable"; onRemove: () => void; removeAccessibilityLabel: string })
  | (TagBase & { variant: "filter-chip"; selected: boolean; onToggle: () => void });

export function Tag(props: TagProps) {
  const { theme, colors } = useTheme();
  const { label, style, testID } = props;

  // 共通形状（px-3 py-1 rounded-full）。
  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing["1"],
    paddingHorizontal: theme.spacing["3"],
    paddingVertical: theme.spacing["1"],
    borderRadius: theme.radius.full,
  };

  // filter-chip（トグル可能）
  if (props.variant === "filter-chip") {
    const { selected, onToggle } = props;
    return (
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        testID={testID}
        style={[
          base,
          {
            backgroundColor: selected ? theme.color.primary["50"] : colors["bg-surface"],
            borderWidth: 1,
            borderColor: selected ? theme.color.primary["200"] : colors["border-default"],
          },
          style,
        ]}
      >
        <Text
          variant="sm"
          color="text-default"
          style={selected ? { color: theme.color.primary["700"] } : undefined}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  // removable（削除ボタン付き）
  if (props.variant === "removable") {
    const { onRemove, removeAccessibilityLabel } = props;
    return (
      <View
        testID={testID}
        style={[base, { backgroundColor: colors["bg-page-alt"] }, style]}
      >
        <Text variant="xs" color="text-default">
          {label}
        </Text>
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={removeAccessibilityLabel}
          hitSlop={8}
        >
          <Text variant="xs" color="text-muted">
            ×
          </Text>
        </Pressable>
      </View>
    );
  }

  // basic（表示のみ）
  return (
    <View testID={testID} style={[base, { backgroundColor: colors["bg-page-alt"] }, style]}>
      <Text variant="xs" color="text-default">
        {label}
      </Text>
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Tag.__contract = CONTRACTS.tag;
