/**
 * Tag — タグ / フィルターチップ primitive（設計書 §1, §4 C-3）。contract: tag。discriminated union。
 *
 * - variant で必須 prop が変わるため DU（§4: basic は表示のみ、removable は onRemove 必須、
 *   filter-chip は selected/onToggle 必須）。
 * - contract states active/inactive → prop selected:boolean（§2）。selected→accessibilityState.selected。
 * - 配色: basic/removable は bg-page-alt、filter-chip は bg-surface+border、selected 時は
 *   active-bg=primary.50 / active-border=primary.200 / active-text=primary.700（tag.contract tokenRefs）。
 *   色・寸法の決定は pure resolver（tag.styles.ts）に分離、recipe との機械照合は
 *   scripts/lib/tag-conformance.test.ts が行う。
 * - label は Text primitive。filter-chip active の文字色だけ primary.700（SemanticColors 外なので style 上書き）。
 * - focus outline は Button と共通の Pressable focus handling（_internal/focus-ring）を使う
 *   （removable / filter-chip の押せる要素に FocusRing を描く）。
 */

import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Text.js";
import { useTheme } from "../theme/index.js";
import { useFocusRing, FocusRing } from "./_internal/focus-ring.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import {
  resolveTagBase,
  resolveTagVariant,
  TAG_FILTER_CHIP_VERTICAL_HIT_SLOP,
  TAG_REMOVE_TAP_TARGET,
} from "./tag.styles.js";

interface TagBase {
  label: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

type TagProps =
  | (TagBase & { variant?: "basic" })
  | (TagBase & { variant: "removable"; onRemove: () => void; removeAccessibilityLabel: string })
  | (TagBase & { variant: "filter-chip"; selected: boolean; onToggle: () => void });

/** 共通形状（px-3 py-1 rounded-full。寸法は resolver、layout はここで足す）。 */
function useTagBase(): ViewStyle {
  const { theme } = useTheme();
  return {
    flexDirection: "row",
    alignItems: "center",
    ...resolveTagBase(theme),
  };
}

function FilterChipTag(props: TagBase & { selected: boolean; onToggle: () => void }) {
  const { theme, mode } = useTheme();
  const base = useTagBase();
  const { focused, focusHandlers } = useFocusRing();
  const { label, selected, onToggle, style, testID } = props;
  const v = resolveTagVariant(theme, mode, "filter-chip", selected);
  return (
    <Pressable
      {...focusHandlers}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      // 視覚高さ 34pt（padding 駆動）に縦 hitSlop を足して実効 44pt（A11Y_MIN_TAP_TARGET_44）。
      // 背景と枠を持つので minHeight で伸ばすと見た目が変わる → 当たり判定だけ広げる。
      hitSlop={{
        top: TAG_FILTER_CHIP_VERTICAL_HIT_SLOP,
        bottom: TAG_FILTER_CHIP_VERTICAL_HIT_SLOP,
      }}
      testID={testID}
      style={[
        base,
        {
          backgroundColor: v.bg,
          borderWidth: v.borderWidth,
          borderColor: v.border,
        },
        style,
      ]}
    >
      {/* 非選択時の文字色は Text の color prop（text-default）と同値なので上書き不要。 */}
      <Text variant={v.font} color="text-default" style={selected ? { color: v.textColor } : undefined}>
        {label}
      </Text>
      <FocusRing visible={focused} radius={theme.radius.full} />
    </Pressable>
  );
}

function RemovableTag(
  props: TagBase & { onRemove: () => void; removeAccessibilityLabel: string },
) {
  const { theme, mode } = useTheme();
  const base = useTagBase();
  const { focused, focusHandlers } = useFocusRing();
  const { label, onRemove, removeAccessibilityLabel, style, testID } = props;
  const v = resolveTagVariant(theme, mode, "removable");
  return (
    <View testID={testID} style={[base, { backgroundColor: v.bg }, style]}>
      <Text variant={v.font} color="text-default">
        {label}
      </Text>
      {/* 最小タップターゲット確保: 親 Tag の高さを超えられないので remove 自身に正典パターン
          （視覚 24 + hitSlop 10 = 実効 44）を持たせる（Codex M-2 / A11Y_MIN_TAP_TARGET_44）。 */}
      <Pressable
        {...focusHandlers}
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={removeAccessibilityLabel}
        hitSlop={TAG_REMOVE_TAP_TARGET.hitSlop}
        style={{
          minWidth: TAG_REMOVE_TAP_TARGET.minWidth,
          minHeight: TAG_REMOVE_TAP_TARGET.minHeight,
          alignItems: "center",
          justifyContent: "center",
        }}
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
  const { theme, mode } = useTheme();
  const base = useTagBase();

  if (props.variant === "filter-chip") return <FilterChipTag {...props} />;
  if (props.variant === "removable") return <RemovableTag {...props} />;

  // basic（表示のみ）
  const v = resolveTagVariant(theme, mode, "basic");
  return (
    <View testID={props.testID} style={[base, { backgroundColor: v.bg }, props.style]}>
      <Text variant={v.font} color="text-default">
        {props.label}
      </Text>
    </View>
  );
}

// conformance test 用の contract メタ（§2 A-3）。scripts/lib/conformance.test.ts が
// 「この宣言が正しい contract を指しているか」を静的スキャンで照合する。
Tag.__contract = CONTRACTS.tag;
