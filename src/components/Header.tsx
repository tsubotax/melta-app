/**
 * Header — 画面名と左右の操作を持つ共通ヘッダー。
 * 配置・余白・見出しの組版を所有し、navigationやタイトルのアニメーションは利用側が渡す。
 */
import { useMemo, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/index.js";
import { CONTRACTS, type VariantOf } from "../contracts/contract-types.js";
import { Text } from "../primitives/Text.js";
import { HEADER_SPEC, isCenteredHeader, resolveHeaderStyle } from "./header.styles.js";

/** 中央タイトルの最小高。スクロール量には可能な限りonLayoutの実測を使う。 */
export const HEADER_CENTERED_MIN_HEIGHT = HEADER_SPEC.centeredMinHeight;

interface HeaderProps {
  /** 空でない画面名。actionsでも読み上げるため必須。 */
  title: string;
  variant?: VariantOf<"header">;
  /** 中央タイトルの長い画面名を1段下げる。default/actionsの組版は変更しない。 */
  titleVariant?: "base" | "lg";
  /** 中央タイトルのfade用。渡された見出しを保ち、アニメーションと読み上げ非表示だけを包む。 */
  wrapTitle?: (heading: ReactNode) => ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Header({ title, variant = "default", titleVariant = HEADER_SPEC.centeredTitleFont,
  wrapTitle, leading, trailing, style, testID }: HeaderProps) {
  const { theme, mode } = useTheme();
  const { containerStyle, titleWrapStyle, hiddenTitleStyle, leadingStyle, trailingStyle } = useMemo(
    () => resolveHeaderStyle(theme, mode, { variant }, StyleSheet.hairlineWidth), [theme, mode, variant],
  );
  const centered = isCenteredHeader(variant);
  // 中央タイトルは既存の本文字間を維持し、独立した見出しの意味をwrapperで与える。
  const centeredTitle = centered ? (
    <View accessible accessibilityRole="header" accessibilityLabel={title}>
      <Text variant={titleVariant} weight={HEADER_SPEC.titleWeight}
        color={HEADER_SPEC.titleColor} numberOfLines={1}>{title}</Text>
    </View>
  ) : null;
  return (
    <View style={[containerStyle, style]} testID={testID}>
      {centered ? <View style={leadingStyle}>{leading}</View> : leading}
      <View style={titleWrapStyle}>
        {centered ? (wrapTitle ? wrapTitle(centeredTitle) : centeredTitle) : variant === "actions" ? (
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
      {centered ? <View style={trailingStyle}>{trailing}</View> : trailing}
    </View>
  );
}
Header.__contract = CONTRACTS.header;
