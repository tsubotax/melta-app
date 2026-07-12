/**
 * Screen — 画面骨格 primitive（SafeArea + bg-page + content padding）。
 * contract: screen（app 先行定義、melta-contracts）。dogfood 不足-3（SafeAreaView + ScrollView +
 * ヘッダーの毎画面手書き）の解消。
 *
 * - variant="scroll"（default）は content を ScrollView に、"fixed" は flex:1 の View に載せる。
 * - header slot は scroll の外（SafeArea 直下）に固定する。
 * - padding は spacing token キー限定 | "none"（default "4"）。
 * - 決定ロジックは pure resolver（screen.styles.ts）に分離 — recipe との機械照合対象。
 *
 * SafeArea は registry（safe-area-registry.ts）で解決する。default は RN core の
 * SafeAreaView（deprecated / iOS のみの最小対応）で依存ゼロを維持しつつ、
 * react-native-safe-area-context 利用者は subpath "melta-app/safe-area" の
 * enableSafeAreaContext() で context hook + View adapter に差し替えられる
 * （rally-nav dogfood 由来、RN 0.85 Fabric/Android の初回 inset flash 対応）。
 */

import { useMemo, type ReactNode } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { resolveSafeAreaView } from "./safe-area-registry";
import { useTheme } from "../theme";
import { CONTRACTS, type VariantOf } from "../contracts/contract-types";
import { resolveScreenStyle, type ScreenPadding, type ScreenStyle } from "./screen.styles";

interface ScreenProps {
  /** 画面の骨格（contract variant）。default "scroll"。 */
  variant?: VariantOf<"screen">;
  /** content の padding（spacing token キー限定 | "none"）。default "4"。 */
  padding?: ScreenPadding;
  /** scroll 外（SafeArea 直下）に固定されるヘッダー slot（Header を差す想定）。 */
  header?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}

export function Screen({
  variant = "scroll",
  padding = "4",
  header,
  style,
  testID,
  children,
}: ScreenProps) {
  const { theme, mode } = useTheme();

  const { safeAreaStyle, contentStyle } = useMemo<ScreenStyle>(
    () => resolveScreenStyle(theme, mode, { variant, padding }),
    [theme, mode, variant, padding],
  );

  const SafeArea = resolveSafeAreaView();

  return (
    <SafeArea style={[safeAreaStyle, style]} testID={testID}>
      {header}
      {variant === "scroll" ? (
        <ScrollView contentContainerStyle={contentStyle}>{children}</ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeArea>
  );
}

Screen.__contract = CONTRACTS.screen;
