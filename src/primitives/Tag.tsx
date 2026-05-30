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
import { useFocusRing, FocusRing } from "./_internal/focus-ring";
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

/** 共通形状（px-3 py-1 rounded-full）。 */
function useTagBase(): ViewStyle {
  const { theme } = useTheme();
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing["1"],
    paddingHorizontal: theme.spacing["3"],
    paddingVertical: theme.spacing["1"],
    borderRadius: theme.radius.full,
  };
}

function FilterChipTag(props: TagBase & { selected: boolean; onToggle: () => void }) {
  const { theme, colors } = useTheme();
  const base = useTagBase();
  const { focused, focusHandlers } = useFocusRing();
  const { label, selected, onToggle, style, testID } = props;
  return (
    <Pressable
      {...focusHandlers}
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
      <FocusRing visible={focused} radius={theme.radius.full} />
    </Pressable>
  );
}

function RemovableTag(
  props: TagBase & { onRemove: () => void; removeAccessibilityLabel: string },
) {
  const { theme, colors } = useTheme();
  const base = useTagBase();
  const { focused, focusHandlers } = useFocusRing();
  const { label, onRemove, removeAccessibilityLabel, style, testID } = props;
  return (
    <View testID={testID} style={[base, { backgroundColor: colors["bg-page-alt"] }, style]}>
      <Text variant="xs" color="text-default">
        {label}
      </Text>
      {/* 最小タップターゲット確保: 親 Tag の高さを超えられないので remove 自身に min 24 + hitSlop（Codex M-2）。 */}
      <Pressable
        {...focusHandlers}
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={removeAccessibilityLabel}
        hitSlop={10}
        style={{ minWidth: 24, minHeight: 24, alignItems: "center", justifyContent: "center" }}
      >
        <Text variant="xs" color="text-muted">
          ×
        </Text>
        <FocusRing visible={focused} radius={theme.radius.full} />
      </Pressable>
    </View>
  );
}

export function Tag(props: TagProps) {
  const { colors } = useTheme();
  const base = useTagBase();

  if (props.variant === "filter-chip") return <FilterChipTag {...props} />;
  if (props.variant === "removable") return <RemovableTag {...props} />;

  // basic（表示のみ）
  return (
    <View testID={props.testID} style={[base, { backgroundColor: colors["bg-page-alt"] }, props.style]}>
      <Text variant="xs" color="text-default">
        {props.label}
      </Text>
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Tag.__contract = CONTRACTS.tag;
