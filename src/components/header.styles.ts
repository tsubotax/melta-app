/**
 * header.styles — Header の pure style resolver（styleRefs conformance 対応で Header.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/header.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/header-conformance.test.ts が行う。
 */

import type { NativeTheme, ThemeMode } from "../theme";

export interface HeaderStyle {
  containerStyle: {
    flexDirection: "row";
    alignItems: "center";
    gap: number;
    paddingHorizontal: number;
    paddingVertical: number;
    backgroundColor: string;
    borderBottomWidth: 1;
    borderBottomColor: string;
  };
  titleWrapStyle: { flex: 1 };
}

/**
 * mode → ヘッダー style の解決（header.recipe styleRefs の 1:1 写像）。
 * title の typography はここでは持たない — Header は melta の Text
 * （variant="xl" weight="bold" color="text-heading" role="heading"）を compose する（text recipe が正）。
 */
export function resolveHeaderStyle(theme: NativeTheme, mode: ThemeMode): HeaderStyle {
  return {
    containerStyle: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing["3"],
      paddingHorizontal: theme.spacing["4"],
      paddingVertical: theme.spacing["3"],
      backgroundColor: theme.color.semantic[mode]["bg-page"],
      borderBottomWidth: 1,
      borderBottomColor: theme.color.semantic[mode]["border-default"],
    },
    titleWrapStyle: { flex: 1 },
  };
}
