/**
 * Avatar — ユーザーアバター（Image / Initials / Status / Group）。
 * contract: avatar（web 契約 v2.0.0 の app 実装）。dogfood 不足-4 の解消。
 *
 * - variant は props から暗黙決定: source があれば image、無ければ initials（name から生成）。
 *   contract の group variant は Avatar.Group（重ね表示コンテナ、-spacing.2 相当のオーバーラップ）。
 * - status（online / away / offline）指定時は右下に statusDot（bg-surface の ring 付き）。
 * - a11y: role img + accessibilityLabel=name（contract required）。
 * - 決定ロジックは pure resolver（avatar.styles.ts）に分離 — recipe との機械照合対象。
 */

import { Children, useMemo, type ReactNode } from "react";
import {
  Image as RNImage,
  Text as RNText,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";
import {
  resolveAvatarGroupStyle,
  resolveAvatarStatusColor,
  resolveAvatarStyle,
  type AvatarSize,
  type AvatarStatus,
  type AvatarStyleResult,
} from "./avatar.styles";

interface AvatarProps {
  /** 表示名（initials の生成元 + accessibilityLabel。contract a11y required）。 */
  name: string;
  /** プロフィール画像。省略時は initials variant にフォールバック。 */
  source?: ImageSourcePropType;
  /** サイズ（contract sizes）。default "medium"。 */
  size?: AvatarSize;
  /** 在席状態（contract states）。指定時のみ statusDot を表示。 */
  status?: AvatarStatus;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** name → initials（先頭2文字。空白区切りなら各語の頭文字を優先: "Taro Tanaka" → "TT"）。 */
function toInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export function Avatar({ name, source, size = "medium", status, style, testID }: AvatarProps) {
  const { theme, mode } = useTheme();
  const variant = source ? "image" : "initials";

  const resolved = useMemo<AvatarStyleResult>(
    () => resolveAvatarStyle(theme, mode, variant, size),
    [theme, mode, variant, size],
  );
  const dotColor = status ? resolveAvatarStatusColor(theme, mode, status) : undefined;

  // clip（overflow hidden）は内側の円に閉じ、statusDot は外側（クリップされない層）に置く。
  // accessible 明示で「1つの読み上げ単位」にする（非 Touchable の View は暗黙では discoverable でない）
  return (
    <View
      style={[{ width: resolved.container.width, height: resolved.container.height }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      testID={testID}
    >
      <View style={resolved.container}>
        {source ? (
          <RNImage source={source} style={{ width: "100%", height: "100%" }} />
        ) : (
          <RNText style={resolved.text}>{toInitials(name)}</RNText>
        )}
      </View>
      {status ? (
        <View
          style={[
            resolved.dot,
            { backgroundColor: dotColor, position: "absolute", right: 0, bottom: 0 },
          ]}
        />
      ) : null}
    </View>
  );
}

interface AvatarGroupProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}

/** 複数アバターの重ね表示（contract の group variant）。2枚目以降を負 margin で重ねる。 */
function AvatarGroup({ style, testID, children }: AvatarGroupProps) {
  const group = resolveAvatarGroupStyle();
  return (
    <View style={[group.container, style]} testID={testID}>
      {Children.map(children, (child, index) => (
        <View style={index > 0 ? group.overlap : null}>{child}</View>
      ))}
    </View>
  );
}

Avatar.Group = AvatarGroup;
Avatar.__contract = CONTRACTS.avatar;
