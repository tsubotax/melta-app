/**
 * Header — 画面ヘッダー primitive（title + leading? / trailing? slot + 下 border）。
 * contract: header（app 先行定義、melta-contracts）。dogfood 不足-3 の解消。
 * Screen の header slot に差して使う想定（単体でも使える）。
 *
 * - title は melta の Text（xl / bold / text-heading / heading role）で描画し、
 *   heading として読み上げられる（contract a11y required）。
 * - titleWrapStyle の flex:1 で title が余白を占有し trailing を右端へ押す。
 * - 決定ロジックは pure resolver（header.styles.ts）に分離 — recipe との機械照合対象。
 */

import { useMemo, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import { Text } from "../primitives/Text";
import { resolveHeaderStyle, type HeaderStyle } from "./header.styles";

interface HeaderProps {
  /** 画面タイトル（heading として読み上げ）。 */
  title: string;
  /** title の左の slot（戻るボタン等）。 */
  leading?: ReactNode;
  /** 右端の slot（アクション等）。 */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Header({ title, leading, trailing, style, testID }: HeaderProps) {
  const { theme, mode } = useTheme();

  const { containerStyle, titleWrapStyle } = useMemo<HeaderStyle>(
    () => resolveHeaderStyle(theme, mode),
    [theme, mode],
  );

  return (
    <View style={[containerStyle, style]} testID={testID}>
      {leading}
      <View style={titleWrapStyle}>
        <Text variant="xl" weight="bold" color="text-heading" role="heading" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {trailing}
    </View>
  );
}

Header.__contract = CONTRACTS.header;
