/**
 * Row — 横並び layout primitive。RN コア View の薄いラッパ。
 * contract: row（app 先行定義、melta-contracts）。dogfood 不足-1（生 flexbox 手書き）の解消。
 *
 * - gap は spacing token キー限定（生数値不可、§5 lint の意味を保つ）。
 * - align（交差軸、default center）/ justify（主軸、default start）/ wrap（折返し）。
 * - 決定ロジックは pure resolver（row.styles.ts）に分離 — recipe との機械照合対象。
 */

import { useMemo, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/index.js";
import type { SpacingKey } from "../theme/index.js";
import { CONTRACTS } from "../contracts/contract-types.js";
import { resolveRowStyle, type RowAlign, type RowJustify, type RowStyle } from "./row.styles.js";

interface RowProps {
  /** 子要素間の gap（spacing token キー限定）。省略時 gap なし。 */
  gap?: SpacingKey;
  /** 交差軸の配置。default "center"。 */
  align?: RowAlign;
  /** 主軸の配置。default "start"。 */
  justify?: RowJustify;
  /** 折返し。default false。 */
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}

export function Row({
  gap,
  align = "center",
  justify = "start",
  wrap = false,
  style,
  testID,
  children,
}: RowProps) {
  const { theme } = useTheme();

  const layout = useMemo<RowStyle>(
    () => resolveRowStyle(theme, { gap, align, justify, wrap }),
    [theme, gap, align, justify, wrap],
  );

  return (
    <View style={[layout, style]} testID={testID}>
      {children}
    </View>
  );
}

Row.__contract = CONTRACTS.row;
