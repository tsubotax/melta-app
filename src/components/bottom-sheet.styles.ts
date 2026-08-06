/**
 * bottom-sheet.styles — BottomSheet の pure style resolver（styleRefs conformance 対応で
 * BottomSheet.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/bottom-sheet.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/bottom-sheet-conformance.test.ts が行う。
 *
 * - sheet は上角のみ radius（下端密着のため）。grabber は装飾バー（a11y ツリーから除外は
 *   実装側の importantForAccessibility / accessibilityElementsHidden が担う）。
 * - content は自由 slot で padding のみ供給。
 * - overlay の黒 50% は token 外の literal（modal と同じ）。
 * - sheet の下余白（SafeArea）は実装（BottomSheet.tsx）が SafeAreaView で加算する。
 */

import type { FontWeightValue, NativeTheme, ThemeMode } from "../theme/index.js";

/** overlay の黒 50%（token 外 literal。modal と同値）。 */
// eslint-disable-next-line melta/no-raw-color -- overlay の黒 50% は契約上 token 外の literal（recipe description / web の bg-black/50 と同値）
export const BOTTOM_SHEET_OVERLAY_COLOR = "rgba(0,0,0,0.5)";

export interface BottomSheetStyle {
  overlayStyle: { flex: 1; backgroundColor: string; justifyContent: "flex-end" };
  sheetStyle: {
    backgroundColor: string;
    borderTopLeftRadius: number;
    borderTopRightRadius: number;
  };
  grabberStyle: {
    width: 36;
    height: 4;
    borderRadius: number;
    backgroundColor: string;
    alignSelf: "center";
    marginTop: number;
  };
  titleStyle: {
    fontSize: number;
    fontWeight: FontWeightValue;
    color: string;
    paddingHorizontal: number;
    paddingTop: number;
  };
  contentStyle: { padding: number };
}

/** mode → BottomSheet style の解決（bottom-sheet.recipe styleRefs の 1:1 写像）。 */
export function resolveBottomSheetStyle(theme: NativeTheme, mode: ThemeMode): BottomSheetStyle {
  const semantic = theme.color.semantic[mode];
  return {
    overlayStyle: {
      flex: 1,
      backgroundColor: BOTTOM_SHEET_OVERLAY_COLOR,
      justifyContent: "flex-end",
    },
    sheetStyle: {
      backgroundColor: semantic["bg-surface"],
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
    },
    grabberStyle: {
      width: 36,
      height: 4,
      borderRadius: theme.radius.full,
      backgroundColor: semantic["border-strong"],
      alignSelf: "center",
      marginTop: theme.spacing["2"],
    },
    titleStyle: {
      fontSize: theme.typography.fontSize.lg.fontSize,
      fontWeight: theme.typography.fontWeight.bold,
      color: semantic["text-heading"],
      paddingHorizontal: theme.spacing["4"],
      paddingTop: theme.spacing["4"],
    },
    contentStyle: { padding: theme.spacing["4"] },
  };
}
