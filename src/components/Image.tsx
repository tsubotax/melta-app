/**
 * Image — 画像表示 component（設計書 §1）。contract: image（app 先行定義）。
 *
 * - 実装は RN コア Image（依存ゼロ維持）。expo-image への差し替えは blurhash / 高度 cache が
 *   要件化してから（未着手）。差し替えコスト最小化のためここで包む（呼び出し側は melta-app の
 *   Image だけ見る）。
 * - contentFit("cover"|"contain") → RN の resizeMode に変換。
 * - onError 時に fallback（ReactNode）を表示。fallback 未指定なら何も出さない。
 * - radius は token キーのみ（生数値不可、§5）。shape の解決は pure resolver
 *   （image.styles.ts）に分離。recipes/app/image.recipe.json との機械照合は
 *   scripts/lib/image-conformance.test.ts が行う。
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
import { resolveImageShape } from "./image.styles";

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

  // shape は ImageStyle / ViewStyle 双方に有効な共通サブセット（resolver 参照）なので、
  // RNImage と fallback View で同じ値を共用できる。
  const shape = resolveImageShape(theme, { aspectRatio, radius });

  if (errored && fallback != null) {
    // caller の style(width/height/flex 等の layout)を fallback にも反映する（通常画像と同寸法）。
    // ImageStyle ⊃ ViewStyle ではないが layout プロパティは共通なので cast で流す
    // （overflow:"scroll" 等 Image 固有値を caller が入れた稀ケースのみ無視される）。
    return (
      <View
        style={[shape, style as unknown as StyleProp<ViewStyle>]}
        testID={testID}
        accessible={accessibilityLabel != null}
        accessibilityLabel={accessibilityLabel}
      >
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
      style={[shape, style]}
    />
  );
}

// conformance test 用の contract メタ（§2 A-3）。scripts/lib/conformance.test.ts が
// 「この宣言が正しい contract を指しているか」を静的スキャンで照合する。
Image.__contract = CONTRACTS.image;
