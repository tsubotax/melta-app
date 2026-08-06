/**
 * melta design lint プラグインの型宣言（melta.mjs の手書き型）。
 *
 * `melta.mjs` は実装の正本。この宣言は npm 利用者（moduleResolution: node16/nodenext）が
 * `melta-app/eslint-plugin` を型付きで import できるようにするためだけに存在する。
 * 実装を変えたらこちらも手で追随させる（ルール名は check-installability が機械照合している）。
 *
 * ESLint 本体の型（`eslint` / `@types/eslint`）には**意図的に依存しない**。
 * eslint は melta-app の dependencies ではないため、import すると
 * 「eslint 未 install の利用者で型が壊れる」経路を作ってしまう。
 * flat config に差し込むのに必要な最小限を構造的に宣言する。
 */

/** ESLint のルール実装（AST visitor を返す `create` と表示用 `meta`）。 */
export interface MeltaRule {
  meta: {
    type: "problem" | "suggestion" | "layout";
    docs: { description: string };
  };
  // AST ノード型は eslint の型に依存しないため unknown 止まり（消費者は呼び出さない）。
  create(context: unknown): Record<string, (...args: never[]) => void>;
}

/** このプラグインが提供するルール ID（`melta/` prefix なし）。 */
export type MeltaRuleName =
  | "no-raw-color"
  | "no-raw-radius"
  | "no-raw-spacing"
  | "no-raw-fontsize"
  | "no-raw-lineheight";

/** flat config の 1 要素として展開できる推奨設定。 */
export interface MeltaFlatConfig {
  name: string;
  plugins: { melta: MeltaPlugin };
  /** severity の正本は melta.mjs の RECOMMENDED_RULES（ドキュメントではない）。 */
  rules: Record<string, "error" | "warn" | "off">;
}

export interface MeltaPlugin {
  rules: Record<MeltaRuleName, MeltaRule>;
  configs: { recommended: MeltaFlatConfig };
}

export declare const meltaPlugin: MeltaPlugin;
