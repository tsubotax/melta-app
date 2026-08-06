/**
 * stack.styles — Stack の pure style resolver（styleRefs conformance 対応で Stack.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/stack.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/stack-conformance.test.ts が行う。
 */

import type { NativeTheme, SpacingKey } from "../theme/index.js";

/** 交差軸の配置（RN alignItems への写像。default stretch = RN デフォルトなので出力しない）。 */
export type StackAlign = "start" | "center" | "end" | "stretch";

const ALIGN_MAP = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
} as const;

export interface StackStyleProps {
  /** 子要素間の gap（spacing token キー限定）。省略時は gap を出力しない。 */
  gap?: SpacingKey;
  /** 交差軸の配置。default "stretch"（= RN デフォルト、style 出力なし）。 */
  align?: StackAlign;
}

export interface StackStyle {
  flexDirection: "column";
  gap?: number;
  alignItems?: (typeof ALIGN_MAP)[StackAlign];
}

/**
 * props → 縦積み style の解決（stack.recipe styleRefs の 1:1 写像）。
 * デフォルト（gap なし / align=stretch）は recipe の default variant（flexDirection のみ）と一致させている。
 */
export function resolveStackStyle(
  theme: NativeTheme,
  { gap, align = "stretch" }: StackStyleProps = {},
): StackStyle {
  return {
    flexDirection: "column",
    ...(gap != null ? { gap: theme.spacing[gap] } : null),
    ...(align !== "stretch" ? { alignItems: ALIGN_MAP[align] } : null),
  };
}
