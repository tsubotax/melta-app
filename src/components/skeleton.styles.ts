/**
 * skeleton.styles — Skeleton の pure style resolver（styleRefs conformance 対応で Skeleton.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/skeleton.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/skeleton-conformance.test.ts が行う。
 */

import type {
  ElevationKey,
  ElevationStyle,
  NativeTheme,
  RadiusKey,
  SemanticColors,
  SpacingKey,
  ThemeMode,
} from "../theme";

export type SkeletonVariant = "text" | "circle" | "card";
/** contract states（loading = pulse、loaded = Skeleton 自体をアンマウント）。 */
export type SkeletonState = "loading" | "loaded";

/**
 * card variant の Surface 土台へ渡す props（token キー）。
 * component は Surface にこのキーをそのまま渡し、resolver は同じキーから style 値を解決する
 * （component と resolver が別々のキーを持って drift する事故を防ぐ SSOT）。
 */
export const CARD_SURFACE_SPEC = {
  bg: "bg-surface",
  radius: "lg",
  elevation: "sm",
  padding: "6",
} as const satisfies {
  bg: keyof SemanticColors;
  radius: RadiusKey;
  elevation: ElevationKey;
  padding: SpacingKey;
};

/** バー / アバター円の寸法。recipe と同じく token に対応が無い literal（recipe description 参照）。 */
export const SKELETON_METRICS = {
  /** text variant の行バー高さ */
  textBarHeight: 14,
  /** card variant 内のバー高さ */
  cardBarHeight: 12,
  /** circle variant / card 内アバター円の直径 */
  circleSize: 40,
} as const;

/**
 * pulse の opacity 振れ幅（states.loading.animation の opacityFrom/opacityTo）。
 * to は states.loading.style.opacity（= dim 側の見た目）と同値。
 */
export const PULSE_OPACITY = { from: 1, to: 0.4 } as const;

/** バー1本分の style（text の行バー / card 内バーで共通の形）。 */
export interface SkeletonBarStyle {
  height: number;
  borderRadius: number;
  backgroundColor: string;
}

/** variant ごとの slot 構成（recipe の style / barStyle と 1:1）。 */
export interface SkeletonVariantStyles {
  /** text: 行バー style + 行間 gap。recipe は 1 slot に併記（component 側で gap をコンテナへ分離） */
  text: { style: SkeletonBarStyle & { gap: number } };
  circle: {
    style: { width: number; height: number; borderRadius: number; backgroundColor: string };
  };
  card: {
    /** Surface 土台の style。elevation は複合値（iOS shadow* + Android elevation）のまま保持 */
    style: {
      backgroundColor: string;
      borderRadius: number;
      borderWidth: number;
      borderColor: string;
      padding: number;
      elevation: ElevationStyle;
    };
    barStyle: SkeletonBarStyle;
  };
}

/**
 * variant → style 解決（skeleton.recipe styleRefs の 1:1 写像）。
 * バーの色は text / circle / card すべて border-default（contract に忠実、§1 Agent m2）。
 * card の土台は CARD_SURFACE_SPEC のキーから解決する（component 側の Surface props と同源）。
 */
export function resolveSkeletonVariants(theme: NativeTheme, mode: ThemeMode): SkeletonVariantStyles {
  const sem = theme.color.semantic[mode];
  const bar = sem["border-default"];
  return {
    text: {
      style: {
        height: SKELETON_METRICS.textBarHeight,
        borderRadius: theme.radius.sm,
        backgroundColor: bar,
        gap: theme.spacing["2"],
      },
    },
    circle: {
      style: {
        width: SKELETON_METRICS.circleSize,
        height: SKELETON_METRICS.circleSize,
        borderRadius: theme.radius.full,
        backgroundColor: bar,
      },
    },
    card: {
      style: {
        backgroundColor: sem[CARD_SURFACE_SPEC.bg],
        borderRadius: theme.radius[CARD_SURFACE_SPEC.radius],
        borderWidth: 1,
        borderColor: bar,
        padding: theme.spacing[CARD_SURFACE_SPEC.padding],
        elevation: theme.elevation[CARD_SURFACE_SPEC.elevation],
      },
      barStyle: {
        height: SKELETON_METRICS.cardBarHeight,
        borderRadius: theme.radius.sm,
        backgroundColor: bar,
      },
    },
  };
}

/** states ごとの slot 構成（recipe の states.*.style / animation と 1:1）。 */
export interface SkeletonStateStyles {
  loading: {
    /** dim 側の見た目（pulse の下限） */
    style: { opacity: number };
    /** pulse アニメーション仕様（duration は motion token 由来の ms 数値） */
    animation: { opacityFrom: number; opacityTo: number; duration: number };
  };
  /** loaded は Skeleton 自体をアンマウント（style 差分なし） */
  loaded: { style: Record<string, never> };
}

/**
 * states → 値解決。loading の pulse は opacity from↔to を motion.duration.slow で loop
 * （reduce-motion ON 時の完全停止は component 側の責務）。
 */
export function resolveSkeletonStates(theme: NativeTheme): SkeletonStateStyles {
  return {
    loading: {
      style: { opacity: PULSE_OPACITY.to },
      animation: {
        opacityFrom: PULSE_OPACITY.from,
        opacityTo: PULSE_OPACITY.to,
        duration: theme.motion.duration.slow,
      },
    },
    loaded: { style: {} },
  };
}
