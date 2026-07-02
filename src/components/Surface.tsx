/**
 * Surface — Card / Skeleton / EmptyState の共通土台となる「箱」（設計書 §1）。
 * contract: surface（app 先行定義）。
 *
 * - 公開 P1 で正式 export に昇格（契約 surface.contract.json + recipe を持つ implemented のため）。
 *   セマンティクスを持つ箱が必要なら Card を優先し、Surface は素の土台が要る時だけ使う。
 * - elevation[key] は iOS shadow* + Android elevation を 1 ViewStyle に同居させた値なので
 *   そのまま spread すれば両 OS に効く（types.ts ElevationStyle）。
 * - 色は useTheme().colors から render 時取得（B-3）。形状は variant を持たないので useMemo 不要。
 */

import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";
import type { ElevationKey, RadiusKey, SpacingKey, SemanticColors } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";

export interface SurfaceProps {
  bg?: keyof SemanticColors;
  radius?: RadiusKey;
  elevation?: ElevationKey;
  padding?: SpacingKey;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
}

export function Surface({
  bg = "bg-surface",
  radius = "lg",
  elevation = "none",
  padding,
  style,
  testID,
  children,
}: SurfaceProps) {
  const { theme, colors } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: colors[bg],
          borderRadius: theme.radius[radius],
          ...(padding != null ? { padding: theme.spacing[padding] } : null),
        },
        theme.elevation[elevation],
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Surface.__contract = CONTRACTS.surface;
