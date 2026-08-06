/**
 * progress.styles — Progress の pure style resolver（styleRefs conformance 対応で Progress.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/progress.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/progress-conformance.test.ts が行う。
 *
 * - track（高さ8 = web h-2）の中を fill が value%（determinate）または往復アニメ
 *   （indeterminate variant）で埋める。fill の幅は実装（Progress.tsx）が value から算出する
 *   （recipe は色と形のみ、recipe description）。
 * - track の背景は semantic border-default → dark mode では dark 側から解決する。
 *   fill は primary.500 / status.success.base（mode 非依存）。
 */

import type { NativeTheme, RadiusKey, ThemeMode } from "../theme/index.js";

export type ProgressVariant = "primary" | "success" | "indeterminate";

/** track / fill の高さ（recipe の literal 8 = web h-2 の写像。token では無い raw px）。 */
export const PROGRESS_TRACK_HEIGHT = 8;

/** indeterminate variant の fill 幅比率（track の 40%。往復アニメ / reduce motion 時の静止幅）。 */
export const PROGRESS_INDETERMINATE_FILL_RATIO = 0.4;

/** 角丸キー（token キー。全 variant 共通 radius.full）。 */
export const PROGRESS_RADIUS = "full" as const satisfies RadiusKey;

/** value の 0〜100 clamp（非有限は 0 に落とす）。determinate の幅・accessibilityValue.now の同源。 */
export function clampProgressValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** slot 構成（progress.recipe 各 variant の trackStyle / fillStyle と 1:1）。 */
export interface ProgressStyles {
  trackStyle: {
    backgroundColor: string;
    borderRadius: number;
    height: number;
    overflow: "hidden";
  };
  fillStyle: {
    backgroundColor: string;
    borderRadius: number;
    height: number;
  };
}

/**
 * variant → 全 slot の style 解決（progress.recipe styleRefs の 1:1 写像）。
 * - track: semantic border-default（mode 依存）。
 * - fill: success は status.success.base、primary / indeterminate は primary.500（mode 非依存）。
 */
export function resolveProgressStyles(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: ProgressVariant,
): ProgressStyles {
  const fill =
    variant === "success" ? theme.color.status.success.base : theme.color.primary["500"];
  return {
    trackStyle: {
      backgroundColor: theme.color.semantic[mode]["border-default"],
      borderRadius: theme.radius[PROGRESS_RADIUS],
      height: PROGRESS_TRACK_HEIGHT,
      overflow: "hidden",
    },
    fillStyle: {
      backgroundColor: fill,
      borderRadius: theme.radius[PROGRESS_RADIUS],
      height: PROGRESS_TRACK_HEIGHT,
    },
  };
}
