/**
 * Stack — 縦積み layout primitive。RN コア View の薄いラッパ。
 * contract: stack（app 先行定義、melta-contracts）。dogfood 不足-1（生 flexbox 手書き）の解消。
 *
 * - gap は spacing token キー限定（生数値不可、§5 lint の意味を保つ）。
 * - align は交差軸の配置（default stretch = RN デフォルト）。
 * - 決定ロジックは pure resolver（stack.styles.ts）に分離 — recipe との機械照合対象。
 */

import { useMemo, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";
import type { SpacingKey } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import { resolveStackStyle, type StackAlign, type StackStyle } from "./stack.styles";

interface StackProps {
  /** 子要素間の gap（spacing token キー限定）。省略時 gap なし。 */
  gap?: SpacingKey;
  /** 交差軸の配置。default "stretch"。 */
  align?: StackAlign;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}

export function Stack({ gap, align = "stretch", style, testID, children }: StackProps) {
  const { theme } = useTheme();

  const layout = useMemo<StackStyle>(
    () => resolveStackStyle(theme, { gap, align }),
    [theme, gap, align],
  );

  return (
    <View style={[layout, style]} testID={testID}>
      {children}
    </View>
  );
}

Stack.__contract = CONTRACTS.stack;
