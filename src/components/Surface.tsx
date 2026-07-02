/**
 * Surface — Card / Skeleton / EmptyState の共通土台となる「箱」（設計書 §1）。
 * contract: surface（app 先行定義）。
 *
 * - 公開 P1 で正式 export に昇格（契約 surface.contract.json + recipe を持つ implemented のため）。
 *   セマンティクスを持つ箱が必要なら Card を優先し、Surface は素の土台が要る時だけ使う。
 * - elevation[key] は iOS shadow* + Android elevation を 1 ViewStyle に同居させた値なので
 *   そのまま spread すれば両 OS に効く（types.ts ElevationStyle）。
 * - 色・寸法の決定は pure resolver（surface.styles.ts）に分離。デフォルト値
 *   （bg=bg-surface / radius=lg / elevation=none）も resolver 側が持ち、
 *   recipes/app/surface.recipe.json との機械照合は scripts/lib/surface-conformance.test.ts が行う。
 */

import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import { resolveSurfaceStyle, type SurfaceStyleProps } from "./surface.styles";

export interface SurfaceProps extends SurfaceStyleProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

export function Surface({ bg, radius, elevation, padding, style, testID, children }: SurfaceProps) {
  const { theme, mode } = useTheme();
  const resolved = resolveSurfaceStyle(theme, mode, { bg, radius, elevation, padding });
  return (
    <View testID={testID} style={[resolved.base, resolved.elevation, style]}>
      {children}
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Surface.__contract = CONTRACTS.surface;
