/**
 * image.styles — Image の pure style resolver（styleRefs conformance 対応で Image.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/image.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/image-conformance.test.ts が行う。
 *
 * recipe の variants.default.style / states.error.style は両方とも空 object＝
 * 「実装はデフォルトの装飾 style を持たない」が意図（contract の tokenRefs radius=radius.md
 * とは意図的な食い違い。recipe description に明記済み）。ここでは radius prop
 * （token キー限定）指定時のみ borderRadius + overflow:hidden を付ける。
 */

import type { NativeTheme, RadiusKey } from "../theme/index.js";

/**
 * ImageStyle / ViewStyle 双方に有効な共通サブセット。
 * 画像本体（RNImage）と error 時の fallback View で同じ shape を共用する。
 */
export interface ImageShapeStyle {
  aspectRatio?: number;
  borderRadius?: number;
  overflow?: "hidden";
}

/** radius / aspectRatio props → shape style の解決。未指定なら空 object（装飾なし）。 */
export function resolveImageShape(
  theme: NativeTheme,
  { aspectRatio, radius }: { aspectRatio?: number; radius?: RadiusKey } = {},
): ImageShapeStyle {
  const borderRadius = radius != null ? theme.radius[radius] : undefined;
  return {
    ...(aspectRatio != null ? { aspectRatio } : null),
    ...(borderRadius != null ? { borderRadius, overflow: "hidden" } : null),
  };
}
