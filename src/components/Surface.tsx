/**
 * Surface — Card / Skeleton / EmptyState の共通土台となる「箱」（設計書 §1、internal 未 export）。
 * contract: surface（app 先行定義）。
 *
 * - melta-app 内部実装専用。公開 export しない（src/components/index.ts に載せない）。
 *   D2I が「生の箱」を欲しい場合は Card を使う（§1 確定）。
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
