/** Headerの見た目をrecipeと照合できるpure resolverへ集約する。 */
import type { ViewStyle } from "react-native";
import type { NativeTheme, ThemeMode, SpacingKey, FontSizeKey, FontWeightKey, SemanticColors } from "../theme/index.js";
import type { VariantOf } from "../contracts/contract-types.js";

export const HEADER_SPEC = {
  gap: "3", actionsGap: "1", paddingX: "4", paddingY: "3",
  titleFont: "xl", centeredTitleFont: "lg", titleWeight: "bold", titleColor: "text-heading",
  borderWidth: 1, hiddenTitleSize: 1, centeredMinHeight: 44, sideMinWidth: 44,
} as const satisfies {
  gap: SpacingKey; actionsGap: SpacingKey; paddingX: SpacingKey; paddingY: SpacingKey;
  titleFont: FontSizeKey; centeredTitleFont: FontSizeKey; titleWeight: FontWeightKey; titleColor: keyof SemanticColors;
  borderWidth: 1; hiddenTitleSize: 1; centeredMinHeight: 44; sideMinWidth: 44;
};

export interface HeaderStyle {
  containerStyle: ViewStyle;
  titleWrapStyle: ViewStyle;
  hiddenTitleStyle?: ViewStyle;
  leadingStyle?: ViewStyle;
  trailingStyle?: ViewStyle;
}

/** 中央タイトルの2形だけが同じ配置と組版を共有する。 */
export function isCenteredHeader(variant?: VariantOf<"header">): boolean {
  return variant === "centered" || variant === "navigation";
}

export function resolveHeaderStyle(
  theme: NativeTheme, mode: ThemeMode, props: { variant?: VariantOf<"header"> } = {},
  // recipeは密度1で照合し、実機のhairline値だけを外から注入する。
  hairlineWidth = HEADER_SPEC.borderWidth as number,
): HeaderStyle {
  if (isCenteredHeader(props.variant)) {
    return {
      containerStyle: {
        flexDirection: "row", alignItems: "center", minHeight: HEADER_SPEC.centeredMinHeight,
        ...(props.variant === "navigation" ? {
          paddingHorizontal: theme.spacing[HEADER_SPEC.paddingX],
          borderBottomWidth: hairlineWidth,
          borderBottomColor: theme.color.semantic[mode]["border-default"],
        } : {}),
      },
      titleWrapStyle: { flexShrink: 1, minWidth: 0 },
      leadingStyle: { flex: 1, minWidth: HEADER_SPEC.sideMinWidth, flexDirection: "row", justifyContent: "flex-start" },
      trailingStyle: { flex: 1, minWidth: HEADER_SPEC.sideMinWidth, flexDirection: "row", justifyContent: "flex-end" },
    };
  }
  return {
    containerStyle: {
      flexDirection: "row", alignItems: "center", gap: theme.spacing[props.variant === "actions" ? HEADER_SPEC.actionsGap : HEADER_SPEC.gap],
      paddingHorizontal: theme.spacing[HEADER_SPEC.paddingX],
      paddingVertical: theme.spacing[HEADER_SPEC.paddingY],
      backgroundColor: theme.color.semantic[mode]["bg-page"],
      borderBottomWidth: HEADER_SPEC.borderWidth,
      borderBottomColor: theme.color.semantic[mode]["border-default"],
    },
    titleWrapStyle: { flex: 1 },
    ...(props.variant === "actions" ? {
      hiddenTitleStyle: {
        position: "absolute" as const, width: HEADER_SPEC.hiddenTitleSize,
        height: HEADER_SPEC.hiddenTitleSize, overflow: "hidden" as const,
      },
    } : {}),
  };
}
