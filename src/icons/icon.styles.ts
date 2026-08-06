/**
 * icon.styles — Icon の pure style resolver（styleRefs conformance 対応で Icon.tsx から分離）。
 *
 * react-native を import しない純粋モジュールにすることで node テスト（tsx --test）から
 * 直接実行できる。recipes/app/icon.recipe.json（melta-contracts の styleRefs）との
 * 機械照合は scripts/lib/icon-conformance.test.ts が行う。
 */

import type { NativeTheme, SemanticColors, ThemeMode } from "../theme/index.js";
// status 色の「error → token では danger」読み替えは status-colors.ts が SSOT（AGENTS.md 規約 7）。
// icons → components の参照になるが、status-colors.ts は theme の型しか import しない純粋モジュール
// なので依存の向きとして安全（ActionSheet destructive の文字色と同じ慣用）。
import { toStatusTokenKey } from "../components/status-colors.js";

export type IconSize = "sm" | "md" | "lg";

/**
 * Icon の色指定。semantic token キーに加えて status 色（success / warning / error）を受ける。
 *
 * - status 系は `theme.color.status.<key>.base` を引く（面ではなく tint に載る色）。
 * - `"status-"` の prefix を付けるのは、将来 SemanticColors に同名キー（`success` 等）が
 *   入ったときに衝突しないようにするため。
 * - **`"status-info"` は無い** — status token に info の実体が無く（web と同じ既知の割り切り）、
 *   info 相当は semantic の `text-accent` / primary 系で表現する。
 */
export type IconStatusColor = "status-success" | "status-warning" | "status-error";
export type IconColor = keyof SemanticColors | IconStatusColor;

/** サイズ軸（contract sizes の height と 1:1。width=height の正方形）。 */
const SIZE_TABLE = { sm: 16, md: 20, lg: 24 } as const;

/** `"status-error"` → `"error"`（型で status 系だけを絞り込むための判定）。 */
function statusVariantOf(color: IconColor): "success" | "warning" | "error" | null {
  switch (color) {
    case "status-success":
      return "success";
    case "status-warning":
      return "warning";
    case "status-error":
      return "error";
    default:
      return null;
  }
}

export interface IconStyle {
  width: number;
  height: number;
  color: string;
}

/**
 * size / color → Icon style の解決（icon.recipe styleRefs の 1:1 写像）。
 * デフォルト（size=md / color=text-default）は recipe の default variant と一致させている。
 * status 色は mode 非依存（status token の base は light/dark 共通）。
 */
export function resolveIconStyle(
  theme: NativeTheme,
  mode: ThemeMode,
  size: IconSize = "md",
  color: IconColor = "text-default",
): IconStyle {
  const status = statusVariantOf(color);
  return {
    width: SIZE_TABLE[size],
    height: SIZE_TABLE[size],
    color:
      status !== null
        ? theme.color.status[toStatusTokenKey(status)].base
        : theme.color.semantic[mode][color as keyof SemanticColors],
  };
}
