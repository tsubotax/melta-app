/**
 * empty-state.styles — EmptyState の pure style resolver（styleRefs conformance 対応で
 * EmptyState.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/empty-state.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/empty-state-conformance.test.ts が行う。
 */

import type {
  FontSizeKey,
  FontWeightKey,
  FontWeightValue,
  NativeTheme,
  SemanticColors,
  SpacingKey,
  ThemeMode,
} from "../theme";

/**
 * default variant の構成キー（token キー）。
 * component は Text / View にこのキーをそのまま渡し、resolver は同じキーから style 値を解決する
 * （component と resolver が別々のキーを持って drift する事故を防ぐ SSOT）。
 */
export const EMPTY_STATE_SPEC = {
  padding: "8",
  gap: "3",
  titleFont: "lg",
  titleWeight: "semibold",
  titleColor: "text-heading",
  descriptionFont: "sm",
  descriptionColor: "text-muted",
  actionMarginTop: "2",
} as const satisfies {
  padding: SpacingKey;
  gap: SpacingKey;
  titleFont: FontSizeKey;
  titleWeight: FontWeightKey;
  titleColor: keyof SemanticColors;
  descriptionFont: FontSizeKey;
  descriptionColor: keyof SemanticColors;
  actionMarginTop: SpacingKey;
};

/** slot 構成（recipe default variant の style / titleStyle / descriptionStyle / actionStyle と 1:1）。 */
export interface EmptyStateStyles {
  /** 中央寄せコンテナ */
  style: {
    alignItems: "center";
    justifyContent: "center";
    padding: number;
    gap: number;
  };
  /** compose する Text primitive（title）へ渡す値の解決結果 */
  titleStyle: {
    fontSize: number;
    fontWeight: FontWeightValue;
    color: string;
    textAlign: "center";
  };
  /** compose する Text primitive（description）へ渡す値の解決結果 */
  descriptionStyle: {
    fontSize: number;
    color: string;
    textAlign: "center";
  };
  /** 任意 action（Button contained を内部 compose）のラッパ */
  actionStyle: { marginTop: number };
}

/**
 * default variant → style 解決（empty-state.recipe styleRefs の 1:1 写像）。
 * title / description の fontSize・fontWeight・色は EMPTY_STATE_SPEC のキーから解決する
 * （component 側は同じキーを Text の variant / weight / color prop に渡す = 同源）。
 */
export function resolveEmptyStateStyles(theme: NativeTheme, mode: ThemeMode): EmptyStateStyles {
  const sem = theme.color.semantic[mode];
  return {
    style: {
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing[EMPTY_STATE_SPEC.padding],
      gap: theme.spacing[EMPTY_STATE_SPEC.gap],
    },
    titleStyle: {
      fontSize: theme.typography.fontSize[EMPTY_STATE_SPEC.titleFont].fontSize,
      fontWeight: theme.typography.fontWeight[EMPTY_STATE_SPEC.titleWeight],
      color: sem[EMPTY_STATE_SPEC.titleColor],
      textAlign: "center",
    },
    descriptionStyle: {
      fontSize: theme.typography.fontSize[EMPTY_STATE_SPEC.descriptionFont].fontSize,
      color: sem[EMPTY_STATE_SPEC.descriptionColor],
      textAlign: "center",
    },
    actionStyle: { marginTop: theme.spacing[EMPTY_STATE_SPEC.actionMarginTop] },
  };
}
