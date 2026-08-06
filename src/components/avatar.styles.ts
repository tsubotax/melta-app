/**
 * avatar.styles — Avatar の pure style resolver（styleRefs conformance 対応で Avatar.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/avatar.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/avatar-conformance.test.ts が行う。
 */

import type { FontWeightValue, NativeTheme, ThemeMode } from "../theme/index.js";

export type AvatarSize = "small" | "medium" | "large";
export type AvatarStatus = "online" | "away" | "offline";

/** サイズ軸（contract sizes の height と 1:1。recipe sizes の width/height/dotSize/fontSize に対応）。 */
export const AVATAR_SIZE_SPEC = {
  small: { box: 32, dot: 8, fontSize: "xs" },
  medium: { box: 40, dot: 10, fontSize: "sm" },
  large: { box: 48, dot: 12, fontSize: "base" },
} as const;

/** group の重なり（-spacing.2 相当。負値 token が無いため recipe と同じ literal）。 */
export const AVATAR_GROUP_OVERLAP = -8;

/**
 * initials の文字サイズ倍率の上限（size 別）。
 *
 * Avatar の器は **width = height の円**（recipe sizes の box）で、fontScale で伸びるのは
 * 中身の文字だけ。器は伸びないので、上限を掛けないと OS の文字サイズ拡大で文字が円から
 * はみ出す（円が楕円に見える / 文字が切れる）。
 *
 * 導出は「box ÷ その size が使う fontSize token の lineHeight」を**小数第1位で切り捨て**（安全側）:
 *   small  32 ÷ 19（xs   の lineHeight） = 1.68… → 1.6
 *   medium 40 ÷ 26（sm   の lineHeight） = 1.53… → 1.5
 *   large  48 ÷ 36（base の lineHeight） = 1.33… → 1.3
 *
 * lineHeight（fontSize ではなく）を分母に採るのは、RN が確保する行ボックスの高さが
 * 溢れの実体だから。theme を差し替えても壊れないよう、この導出そのものは
 * avatar-conformance.test.ts が実 theme の値で再検算する。
 */
export const AVATAR_INITIALS_MAX_FONT_SCALE: Record<AvatarSize, number> = {
  small: 1.6,
  medium: 1.5,
  large: 1.3,
};

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
  const s = AVATAR_SIZE_SPEC[size];
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
