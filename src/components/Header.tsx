/**
 * Header — 画面名と左右の操作を持つ共通ヘッダー。
 * actionsでは画面名を視覚的に隠すが、独立したa11y見出しとして残す。
 * 余白・下線・見出しの配置はheader recipeとpure resolverが所有する。
 */
import { useMemo, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/index.js";
import { CONTRACTS, type VariantOf } from "../contracts/contract-types.js";
import { Text } from "../primitives/Text.js";
import { HEADER_SPEC, resolveHeaderStyle } from "./header.styles.js";

interface HeaderProps {
  /** 空でない画面名。actionsでも読み上げるため必須。 */
  title: string;
  /** defaultは可視見出し、actionsは可視タイトルのない操作バー。 */
  variant?: VariantOf<"header">;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Header({ title, variant = "default", leading, trailing, style, testID }: HeaderProps) {
  const { theme, mode } = useTheme();
  const { containerStyle, titleWrapStyle, hiddenTitleStyle } = useMemo(
    () => resolveHeaderStyle(theme, mode, { variant }), [theme, mode, variant],
  );
  return (
    <View style={[containerStyle, style]} testID={testID}>
      {leading}
      <View style={titleWrapStyle}>
        {variant === "actions" ? (
          // 見出しTextの契約を再利用し、左右の操作を親の読み上げへ畳まない。
          <View pointerEvents="none" style={hiddenTitleStyle}>
            <Text variant={HEADER_SPEC.titleFont} weight={HEADER_SPEC.titleWeight}
              color={HEADER_SPEC.titleColor} role="heading" numberOfLines={1}>
              {title}
            </Text>
          </View>
        ) : (
          <Text variant={HEADER_SPEC.titleFont} weight={HEADER_SPEC.titleWeight}
            color={HEADER_SPEC.titleColor} role="heading" numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>
      {trailing}
    </View>
  );
}
Header.__contract = CONTRACTS.header;
