/**
 * avatar.styles — Avatar の pure style resolver（styleRefs conformance 対応で Avatar.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/avatar.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/avatar-conformance.test.ts が行う。
 */

import type { FontWeightValue, NativeTheme, ThemeMode } from "../theme";

export type AvatarSize = "small" | "medium" | "large";
export type AvatarStatus = "online" | "away" | "offline";

/** サイズ軸（contract sizes の height と 1:1。recipe sizes の width/height/dotSize/fontSize に対応）。 */
const SIZE_TABLE = {
  small: { box: 32, dot: 8, fontSize: "xs" },
  medium: { box: 40, dot: 10, fontSize: "sm" },
  large: { box: 48, dot: 12, fontSize: "base" },
} as const;

/** group の重なり（-spacing.2 相当。負値 token が無いため recipe と同じ literal）。 */
export const AVATAR_GROUP_OVERLAP = -8;

/**
 * group variant（avatar.recipe の group.style / group.overlapStyle の 1:1 写像）。
 * container は横並び、2枚目以降の子に overlap（負 margin）を適用する。
 */
export function resolveAvatarGroupStyle(): {
  container: { flexDirection: "row" };
  overlap: { marginLeft: number };
} {
  return {
    container: { flexDirection: "row" },
    overlap: { marginLeft: AVATAR_GROUP_OVERLAP },
  };
}

export interface AvatarStyleResult {
  /** 円形コンテナ（image は overflow clip / initials は bg + 中央寄せ）。 */
  container: {
    width: number;
    height: number;
    borderRadius: number;
    overflow?: "hidden";
    backgroundColor?: string;
    alignItems?: "center";
    justifyContent?: "center";
  };
  /** initials 文字（image variant では未使用）。 */
  text: { color: string; fontWeight: FontWeightValue; fontSize: number };
  /** statusDot（status 指定時のみ使用。右下配置は Avatar.tsx 側の絶対配置で行う）。 */
  dot: { width: number; height: number; borderRadius: number; borderWidth: 2; borderColor: string };
}

/**
 * variant / size → Avatar style の解決（avatar.recipe styleRefs の 1:1 写像）。
 */
export function resolveAvatarStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: "image" | "initials",
  size: AvatarSize,
): AvatarStyleResult {
  const s = SIZE_TABLE[size];
  return {
    container: {
      width: s.box,
      height: s.box,
      borderRadius: theme.radius.full,
      ...(variant === "image"
        ? { overflow: "hidden" as const }
        : {
            backgroundColor: theme.color.primary["50"],
            alignItems: "center" as const,
            justifyContent: "center" as const,
          }),
    },
    text: {
      color: theme.color.primary["600"],
      fontWeight: theme.typography.fontWeight.medium,
      fontSize: theme.typography.fontSize[s.fontSize].fontSize,
    },
    dot: {
      width: s.dot,
      height: s.dot,
      borderRadius: theme.radius.full,
      borderWidth: 2,
      borderColor: theme.color.semantic[mode]["bg-surface"],
    },
  };
}

/**
 * status → statusDot の背景色（avatar.recipe states の 1:1 写像）。
 * online=success / away=warning / offline=ニュートラル（border-strong）。
 */
export function resolveAvatarStatusColor(
  theme: NativeTheme,
  mode: ThemeMode,
  status: AvatarStatus,
): string {
  switch (status) {
    case "online":
      return theme.color.status.success.base;
    case "away":
      return theme.color.status.warning.base;
    case "offline":
      return theme.color.semantic[mode]["border-strong"];
  }
}
