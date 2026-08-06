/**
 * row.styles — Row の pure style resolver（styleRefs conformance 対応で Row.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/row.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/row-conformance.test.ts が行う。
 */

import type { NativeTheme, SpacingKey } from "../theme/index.js";

/** 交差軸の配置（RN alignItems への写像）。default "center"（recipe default に焼いてある）。 */
export type RowAlign = "start" | "center" | "end" | "baseline" | "stretch";
/** 主軸の配置（RN justifyContent への写像）。default "start"（= RN デフォルト、style 出力なし）。 */
export type RowJustify = "start" | "center" | "end" | "between";

const ALIGN_MAP = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  baseline: "baseline",
  stretch: "stretch",
} as const;

const JUSTIFY_MAP = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
} as const;

export interface RowStyleProps {
  /** 子要素間の gap（spacing token キー限定）。省略時は gap を出力しない。 */
  gap?: SpacingKey;
  /** 交差軸の配置。default "center"。 */
  align?: RowAlign;
  /** 主軸の配置。default "start"（style 出力なし）。 */
  justify?: RowJustify;
  /** 折返し。default false（style 出力なし）。 */
  wrap?: boolean;
}

export interface RowStyle {
  flexDirection: "row";
  alignItems: (typeof ALIGN_MAP)[RowAlign];
  justifyContent?: (typeof JUSTIFY_MAP)[RowJustify];
  flexWrap?: "wrap";
  gap?: number;
}

/**
 * props → 横並び style の解決（row.recipe styleRefs の 1:1 写像）。
 * デフォルト（align=center / justify=start / wrap=false / gap なし）は
 * recipe の default variant（flexDirection + alignItems: "center"）と一致させている。
 */
export function resolveRowStyle(
  theme: NativeTheme,
  { gap, align = "center", justify = "start", wrap = false }: RowStyleProps = {},
): RowStyle {
  return {
    flexDirection: "row",
    alignItems: ALIGN_MAP[align],
    ...(justify !== "start" ? { justifyContent: JUSTIFY_MAP[justify] } : null),
    ...(wrap ? { flexWrap: "wrap" as const } : null),
    ...(gap != null ? { gap: theme.spacing[gap] } : null),
  };
}
