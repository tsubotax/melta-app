/**
 * action-sheet.styles — ActionSheet の pure style resolver（styleRefs conformance 対応で
 * ActionSheet.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/action-sheet.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/action-sheet-conformance.test.ts が行う。
 *
 * - actions は縦積み（区切り線 border-default）、cancel は下に分離した独立ブロック。
 * - destructive アクションは actionTextStyle の色を destructiveColor（status.danger.base）に
 *   差し替える（destructiveTextStyle）。
 * - overlay の黒 50% は token 外の literal（modal と同じ）。
 * - sheet の下余白（SafeArea）は実装（ActionSheet.tsx）が SafeAreaView で加算する。
 */

import type { FontWeightValue, NativeTheme, ThemeMode } from "../theme";

/** overlay の黒 50%（token 外 literal。modal と同値）。 */
// eslint-disable-next-line melta/no-raw-color -- overlay の黒 50% は契約上 token 外の literal（recipe description / web の bg-black/50 と同値）
export const ACTION_SHEET_OVERLAY_COLOR = "rgba(0,0,0,0.5)";

export interface ActionSheetStyle {
  overlayStyle: {
    flex: 1;
    backgroundColor: string;
    justifyContent: "flex-end";
    padding: number;
  };
  sheetStyle: { backgroundColor: string; borderRadius: number; overflow: "hidden" };
  titleStyle: {
    fontSize: number;
    color: string;
    textAlign: "center";
    paddingVertical: number;
  };
  actionStyle: {
    paddingVertical: number;
    alignItems: "center";
    borderTopWidth: 1;
    borderTopColor: string;
  };
  actionTextStyle: { fontSize: number; color: string };
  destructiveTextStyle: { fontSize: number; color: string };
  cancelStyle: {
    backgroundColor: string;
    borderRadius: number;
    marginTop: number;
    paddingVertical: number;
    alignItems: "center";
  };
  cancelTextStyle: { fontSize: number; fontWeight: FontWeightValue; color: string };
}

/** mode → ActionSheet style の解決（action-sheet.recipe styleRefs の 1:1 写像）。 */
export function resolveActionSheetStyle(theme: NativeTheme, mode: ThemeMode): ActionSheetStyle {
  const semantic = theme.color.semantic[mode];
  return {
    overlayStyle: {
      flex: 1,
      backgroundColor: ACTION_SHEET_OVERLAY_COLOR,
      justifyContent: "flex-end",
      padding: theme.spacing["2"],
    },
    sheetStyle: {
      backgroundColor: semantic["bg-surface"],
      borderRadius: theme.radius.lg,
      overflow: "hidden",
    },
    titleStyle: {
      fontSize: theme.typography.fontSize.sm.fontSize,
      color: semantic["text-muted"],
      textAlign: "center",
      paddingVertical: theme.spacing["3"],
    },
    actionStyle: {
      paddingVertical: theme.spacing["4"],
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: semantic["border-default"],
    },
    actionTextStyle: {
      fontSize: theme.typography.fontSize.lg.fontSize,
      color: theme.color.primary["500"],
    },
    destructiveTextStyle: {
      fontSize: theme.typography.fontSize.lg.fontSize,
      color: theme.color.status.danger.base,
    },
    cancelStyle: {
      backgroundColor: semantic["bg-surface"],
      borderRadius: theme.radius.lg,
      marginTop: theme.spacing["2"],
      paddingVertical: theme.spacing["4"],
      alignItems: "center",
    },
    cancelTextStyle: {
      fontSize: theme.typography.fontSize.lg.fontSize,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.color.primary["500"],
    },
  };
}
