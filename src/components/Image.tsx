/**
 * Image — 画像表示 component（設計書 §1）。contract: image（app 先行定義）。
 *
 * - Phase 1 は RN コア Image。expo-image は Phase 2（blurhash / 高度 cache 要件化時）。
 *   差し替えコスト最小化のためここで包む（呼び出し側は melta-app の Image だけ見る）。
 * - contentFit("cover"|"contain") → RN の resizeMode に変換。
 * - onError 時に fallback（ReactNode）を表示。fallback 未指定なら何も出さない。
 * - radius は token キーのみ（生数値不可、§5）。
 */

import { useState, type ReactNode } from "react";
import {
  Image as RNImage,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../theme";
import type { RadiusKey } from "../theme";
import { CONTRACTS } from "../contracts/contract-types";

type ContentFit = "cover" | "contain";

interface ImageProps {
  source: { uri: string } | number;
  /** 縦横比（width:height）。指定すると width 基準で高さが決まる。 */
  aspectRatio?: number;
  radius?: RadiusKey;
  contentFit?: ContentFit;
  /** 読み込み失敗時に表示する代替（onError）。 */
  fallback?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
  testID?: string;
}

export function Image({
  source,
  aspectRatio,
  radius,
  contentFit = "cover",
  fallback,
  accessibilityLabel,
  style,
  testID,
}: ImageProps) {
  const { theme } = useTheme();
  const [errored, setErrored] = useState(false);

  const borderRadius = radius != null ? theme.radius[radius] : undefined;
  // RNImage(ImageStyle) と fallback View(ViewStyle) で overflow の許容値が異なるため、
  // overflow:"hidden" は両者に有効な共通サブセットとして個別に組み立てる。
  const imageShape: ImageStyle = {
    ...(aspectRatio != null ? { aspectRatio } : null),
    ...(borderRadius != null ? { borderRadius, overflow: "hidden" } : null),
  };

  if (errored && fallback != null) {
    const fallbackShape: ViewStyle = {
      ...(aspectRatio != null ? { aspectRatio } : null),
      ...(borderRadius != null ? { borderRadius, overflow: "hidden" } : null),
    };
    return (
      <View style={fallbackShape} testID={testID}>
        {fallback}
      </View>
    );
  }

  return (
    <RNImage
      testID={testID}
      source={source as ImageSourcePropType}
      resizeMode={contentFit}
      onError={() => setErrored(true)}
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
      style={[imageShape, style]}
    />
  );
}

// Phase 2 conformance test 用の contract メタ（§2 A-3）。
Image.__contract = CONTRACTS.image;
