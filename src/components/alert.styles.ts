/**
 * alert.styles — Alert の pure style resolver（styleRefs conformance 対応で Alert.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/alert.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/alert-conformance.test.ts が行う。
 *
 * - RN では border を持たず bg subtle + text 色で表現する（status token に border 用の中間色が
 *   無いため。COLOR_ONLY_FORBIDDEN は title/message のテキストと icon slot で担保、recipe description）。
 * - status 色（mode ごとの subtle / text、info の primary 固定）の解決は status-colors.ts が SSOT。
 */

import type {
  FontSizeKey,
  FontWeightKey,
  FontWeightValue,
  NativeTheme,
  RadiusKey,
  SpacingKey,
  ThemeMode,
} from "../theme";
import { resolveStatusVariantColors, type StatusVariant } from "./status-colors";

/** alert.contract の variant 語彙（status 共通語彙と 1:1）。 */
export type AlertVariant = StatusVariant;

/**
 * 構成キー（token キー）。component は Text にこのキーをそのまま渡し、resolver は同じキーから
 * style 値を解決する（component と resolver が別々のキーを持って drift する事故を防ぐ SSOT）。
 */
export const ALERT_SPEC = {
  padding: "4",
  gap: "3",
  radius: "md",
  titleFont: "base",
  titleWeight: "medium",
  messageFont: "sm",
} as const satisfies {
  padding: SpacingKey;
  gap: SpacingKey;
  radius: RadiusKey;
  titleFont: FontSizeKey;
  titleWeight: FontWeightKey;
  messageFont: FontSizeKey;
};

/** slot 構成（alert.recipe 各 variant の containerStyle / titleStyle / messageStyle と 1:1）。 */
export interface AlertStyles {
  containerStyle: {
    backgroundColor: string;
    borderRadius: number;
    padding: number;
    flexDirection: "row";
    alignItems: "flex-start";
    gap: number;
  };
  /** compose する Text primitive（title）へ渡す値の解決結果 */
  titleStyle: {
    color: string;
    fontSize: number;
    fontWeight: FontWeightValue;
  };
  /** compose する Text primitive（message）へ渡す値の解決結果 */
  messageStyle: {
    color: string;
    fontSize: number;
  };
}

/** variant → 全 slot の style 解決（alert.recipe styleRefs の 1:1 写像）。 */
export function resolveAlertStyles(
  theme: NativeTheme,
  mode: ThemeMode,
  variant: AlertVariant,
): AlertStyles {
  const { bg, text } = resolveStatusVariantColors(theme, mode, variant);
  return {
    containerStyle: {
      backgroundColor: bg,
      borderRadius: theme.radius[ALERT_SPEC.radius],
      padding: theme.spacing[ALERT_SPEC.padding],
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing[ALERT_SPEC.gap],
    },
    titleStyle: {
      color: text,
      fontSize: theme.typography.fontSize[ALERT_SPEC.titleFont].fontSize,
      fontWeight: theme.typography.fontWeight[ALERT_SPEC.titleWeight],
    },
    messageStyle: {
      color: text,
      fontSize: theme.typography.fontSize[ALERT_SPEC.messageFont].fontSize,
    },
  };
}
