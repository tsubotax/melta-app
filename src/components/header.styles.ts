/** Headerの見た目をrecipeと照合できるpure resolverへ集約する。 */
import type { NativeTheme, ThemeMode, SpacingKey, FontSizeKey, FontWeightKey, SemanticColors } from "../theme/index.js";
import type { VariantOf } from "../contracts/contract-types.js";

export const HEADER_SPEC = {
  gap: "3", actionsGap: "1", paddingX: "4", paddingY: "3",
  titleFont: "xl", titleWeight: "bold", titleColor: "text-heading",
  borderWidth: 1, hiddenTitleSize: 1,
} as const satisfies {
  gap: SpacingKey; actionsGap: SpacingKey; paddingX: SpacingKey; paddingY: SpacingKey;
  titleFont: FontSizeKey; titleWeight: FontWeightKey; titleColor: keyof SemanticColors;
  borderWidth: 1; hiddenTitleSize: 1;
};

export interface HeaderStyle {
  containerStyle: {
    flexDirection: "row"; alignItems: "center"; gap: number;
    paddingHorizontal: number; paddingVertical: number;
    backgroundColor: string; borderBottomWidth: 1; borderBottomColor: string;
  };
  titleWrapStyle: { flex: 1 };
  hiddenTitleStyle?: { position: "absolute"; width: 1; height: 1; overflow: "hidden" };
}

export function resolveHeaderStyle(
  theme: NativeTheme, mode: ThemeMode, props: { variant?: VariantOf<"header"> } = {},
): HeaderStyle {
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
