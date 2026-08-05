/**
 * Text — 基本テキスト primitive（設計書 §1）。RN コア Text の薄いラッパ。
 * contract: text（app 先行定義、melta-contracts）。
 *
 * - variant は contract 由来の VariantOf<"text">（= fontSize の段階）。theme の FontSizeKey と
 *   構造一致している前提で theme.typography.fontSize[variant] を引く。乖離したら型エラーで検知
 *   される（= A-3 conformance の型レベル最低ライン、§2）。
 * - 色は token キーのみ（生 hex 不可、§5 lint の意味を保つ）。
 * - letterSpacing は role(heading/body) の ratio を fontSize から pt 換算（text.styles.ts）。
 * - 形状（fontSize/lineHeight/letterSpacing/fontWeight）は variant/role/weight 依存なので useMemo で
 *   分離（B-3 の「形状/色 分離 + 参照安定性」を Phase1 は useMemo で満たす。StyleSheet 事前生成の
 *   最適化は Card で実証予定）。色のみ render 時に colors から取る。
 */

import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text as RNText, type StyleProp, type TextStyle } from "react-native";
import { useTheme, DEFAULT_MIN_LINE_HEIGHT_RATIO, minLineHeightFor } from "../theme";
import type { FontWeightKey, SemanticColors } from "../theme";
import { CONTRACTS, type VariantOf } from "../contracts/contract-types";
import { resolveTextShape, type TextRole } from "./text.styles";

type TextVariant = VariantOf<"text">;

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
  // 決定ロジックは pure resolver（text.styles.ts）に分離済み — recipe との機械照合対象。
  const shape = useMemo<TextStyle>(
    () => resolveTextShape(theme, variant, role, weight),
    [theme, variant, role, weight],
  );

  // 消費者 style は合成順で最後＝上書きが勝つため、resolver 内のクランプだけでは
  // `style={{lineHeight: 16}}` を止められない。flatten した**最終値**に行間の安全下限を掛ける
  // （fontSize の上書きにも追随させるため、下限は最終 fontSize から算出。機序は theme/line-height.ts）。
  const flat: TextStyle = StyleSheet.flatten([shape, { color: colors[color] }, style]);
  // `fontSize: undefined` の明示上書き（flatten は undefined でも上書きする）は、RN 既定サイズで
  // 描画されるのにクランプ基準だけ variant 値になる齟齬を生む。variant の fontSize を復元して
  // 「Text の文字サイズは variant が決める」契約とクランプ基準を一致させる。
  if (typeof flat.fontSize !== "number") flat.fontSize = shape.fontSize;
  if (flat.lineHeight !== undefined) {
    const floor = minLineHeightFor(
      flat.fontSize ?? 0,
      theme.typography.minLineHeightRatio ?? DEFAULT_MIN_LINE_HEIGHT_RATIO,
    );
    if (flat.lineHeight < floor) flat.lineHeight = floor;
  }

  return (
    <RNText
      style={flat}
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
