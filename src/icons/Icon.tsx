/**
 * Icon — 統一アイコン primitive（Charcoal Icons、単色 tint）。
 * contract: icon（app 先行定義、melta-contracts）。dogfood 不足-2（絵文字・生 Text 代用）の解消。
 *
 * ⚠️ 依存境界: このファイルだけが react-native-svg を import する。melta-app 本体エントリ
 * （"melta-app"）は依存ゼロを維持し、Icon は subpath エントリ "melta-app/icons" からだけ
 * export される（optional peerDependency。利用者は `npx expo install react-native-svg` が必要）。
 *
 * - name は glyphs.ts（assets/icons/*.svg からの codegen、commit 済み配布）のキー。
 * - color は semantic token キー限定（default "text-default"）、size は contract sizes（sm/md/lg）。
 * - a11y: 意味を持つ場合は accessibilityLabel を渡す。無指定は装飾扱いで a11y ツリーから除外
 *   （contract a11y required の両ケース）。
 * - 決定ロジックは pure resolver（icon.styles.ts）に分離 — recipe との機械照合対象。
 */

import { useMemo } from "react";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../theme";
import type { SemanticColors } from "../theme";
import { CONTRACTS, type SizeOf } from "../contracts/contract-types";
import { resolveIconStyle, type IconStyle } from "./icon.styles";
import { GLYPHS, type IconName } from "./glyphs";

interface IconProps {
  /** グリフ名（glyphs.ts のキー。例 "close" / "share-ios"）。 */
  name: IconName;
  /** サイズ（contract sizes）。default "md"（20px）。 */
  size?: SizeOf<"icon">;
  /** 色（semantic token キーのみ）。default "text-default"。 */
  color?: keyof SemanticColors;
  /** 意味を持つ icon は必須。省略時は装飾扱い（a11y ツリーから除外）。 */
  accessibilityLabel?: string;
  testID?: string;
}

export function Icon({ name, size = "md", color = "text-default", accessibilityLabel, testID }: IconProps) {
  const { theme, mode } = useTheme();

  const resolved = useMemo<IconStyle>(
    () => resolveIconStyle(theme, mode, size, color),
    [theme, mode, size, color],
  );
  const glyph = GLYPHS[name];
  const decorative = accessibilityLabel == null;

  return (
    <Svg
      width={resolved.width}
      height={resolved.height}
      viewBox={glyph.viewBox}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "yes"}
      testID={testID}
    >
      {glyph.paths.map((p, i) => (
        <Path key={i} d={p.d} fillRule={p.fillRule} fill={resolved.color} />
      ))}
    </Svg>
  );
}

Icon.__contract = CONTRACTS.icon;
