/**
 * modal.styles — Modal の pure style resolver（styleRefs conformance 対応で Modal.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/modal.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/modal-conformance.test.ts が行う。
 *
 * - variant（confirmation/form/alert）は意味分類で style は 3 つとも共通（recipe と同じ）。
 *   props には受けるが style 解決では使わない（API 対称性のため interface には残す）。
 * - overlay の黒 50% は token 外の literal（recipe description 参照。web も bg-black/50）。
 * - elevation.overlay は iOS shadow* + Android elevation の複合 token のため、
 *   panelStyle 本体と分けて panelElevation で返す（Surface と同じ扱い）。
 * - sizes はタブレット以上で効く maxWidth（モバイルは width 100% - overlay padding が先に効く）。
 */

import type { ElevationStyle, FontWeightValue, NativeTheme, ThemeMode } from "../theme";
import type { SizeOf, VariantOf } from "../contracts/contract-types";

export type ModalVariant = VariantOf<"modal">;
export type ModalSize = SizeOf<"modal">;

/** size → panel の maxWidth（modal.recipe sizes の literal と 1:1）。 */
export const MODAL_MAX_WIDTH: Record<ModalSize, number> = {
  small: 384,
  medium: 512,
  large: 768,
};

/** overlay の黒 50%（token 外 literal。recipe / web の bg-black/50 と同値）。 */
// eslint-disable-next-line melta/no-raw-color -- overlay の黒 50% は契約上 token 外の literal（recipe description / web の bg-black/50 と同値）
export const MODAL_OVERLAY_COLOR = "rgba(0,0,0,0.5)";

export interface ModalStyleProps {
  /** 意味分類（style は共通）。default "confirmation"。 */
  variant?: ModalVariant;
  /** panel の maxWidth 段階。default "medium"。 */
  size?: ModalSize;
}

export interface ModalStyle {
  overlayStyle: {
    flex: 1;
    backgroundColor: string;
    justifyContent: "center";
    alignItems: "center";
    padding: number;
  };
  panelStyle: {
    backgroundColor: string;
    borderRadius: number;
    padding: number;
    width: "100%";
    maxWidth: number;
  };
  /** iOS shadow* + Android elevation の複合値。panelStyle と並べて spread する。 */
  panelElevation: ElevationStyle;
  titleStyle: { fontSize: number; fontWeight: FontWeightValue; color: string };
  bodyStyle: { marginTop: number };
  footerStyle: {
    flexDirection: "row";
    justifyContent: "flex-end";
    gap: number;
    marginTop: number;
  };
}

/**
 * size / mode → Modal style の解決（modal.recipe styleRefs の 1:1 写像）。
 * variant は意味分類のみで style に影響しない（recipe の 3 variant が同値）。
 */
export function resolveModalStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  { size = "medium" }: ModalStyleProps = {},
): ModalStyle {
  const semantic = theme.color.semantic[mode];
  return {
    overlayStyle: {
      flex: 1,
      backgroundColor: MODAL_OVERLAY_COLOR,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing["4"],
    },
    panelStyle: {
      backgroundColor: semantic["bg-surface"],
      borderRadius: theme.radius.lg,
      padding: theme.spacing["6"],
      width: "100%",
      maxWidth: MODAL_MAX_WIDTH[size],
    },
    panelElevation: theme.elevation.overlay,
    titleStyle: {
      fontSize: theme.typography.fontSize["2xl"].fontSize,
      fontWeight: theme.typography.fontWeight.bold,
      color: semantic["text-heading"],
    },
    bodyStyle: { marginTop: theme.spacing["2"] },
    footerStyle: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing["3"],
      marginTop: theme.spacing["6"],
    },
  };
}
