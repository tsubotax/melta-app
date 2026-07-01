/**
 * Text — 基本テキスト primitive（設計書 §1）。RN コア Text の薄いラッパ。
 * contract: text（app 先行定義、melta-contracts）。
 *
 * - variant は contract 由来の VariantOf<"text">（= fontSize の段階）。theme の FontSizeKey と
 *   構造一致している前提で theme.typography.fontSize[variant] を引く。乖離したら型エラーで検知
 *   される（= A-3 conformance の型レベル最低ライン、§2）。
 * - 色は token キーのみ（生 hex 不可、§5 lint の意味を保つ）。
 * - letterSpacing は role(heading/body) の ratio を fontSize から pt 換算（resolveLetterSpacing）。
 * - 形状（fontSize/lineHeight/letterSpacing/fontWeight）は variant/role/weight 依存なので useMemo で
 *   分離（B-3 の「形状/色 分離 + 参照安定性」を Phase1 は useMemo で満たす。StyleSheet 事前生成の
 *   最適化は Card で実証予定）。色のみ render 時に colors から取る。
 */

import { useMemo, type ReactNode } from "react";
import { Text as RNText, type StyleProp, type TextStyle } from "react-native";
import { useTheme, resolveLetterSpacing } from "../theme";
import type { FontWeightKey, SemanticColors } from "../theme";
import { CONTRACTS, type VariantOf } from "../contracts/contract-types";

type TextVariant = VariantOf<"text">;
type TextRole = "heading" | "body";

interface TextProps {
  /** fontSize の段階（contract variant）。default "base"。 */
  variant?: TextVariant;
  /** フォントウェイト（token キー）。未指定は RN デフォルト。 */
  weight?: FontWeightKey;
  /** 文字色（semantic token キーのみ）。default "text-default"。 */
  color?: keyof SemanticColors;
  /** letterSpacing の切替軸。default "body"。 */
  role?: TextRole;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
  children: ReactNode;
}

export function Text({
  variant = "base",
  weight,
  color = "text-default",
  role = "body",
  numberOfLines,
  style,
  testID,
  children,
}: TextProps) {
  const { theme, colors } = useTheme();

  // 形状（mode 非依存）は variant/role/weight にだけ依存させてメモ化（B-3）。
  const shape = useMemo<TextStyle>(() => {
    const fs = theme.typography.fontSize[variant];
    return {
      fontSize: fs.fontSize,
      lineHeight: fs.lineHeight,
      letterSpacing: resolveLetterSpacing(fs.fontSize, theme.typography.letterSpacingRatio[role]),
      ...(weight ? { fontWeight: theme.typography.fontWeight[weight] } : null),
    };
  }, [theme, variant, role, weight]);

  return (
    <RNText
      style={[shape, { color: colors[color] }, style]}
      numberOfLines={numberOfLines}
      accessibilityRole={role === "heading" ? "header" : undefined}
      testID={testID}
    >
      {children}
    </RNText>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Text.__contract = CONTRACTS.text;
