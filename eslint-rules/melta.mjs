/**
 * melta design lint ルール（設計書 §5、D-1）。
 *
 * RN で機械検知できる raw 値の 4 類型のみを対象とする補助線（AST 検知は変数経由/spread で漏れるので
 * 純度の本丸は A-3 conformance）。token 経由（theme.* の MemberExpression）は許可、生値を弾く。
 *
 * - no-raw-color   : hex/rgb/hsl の文字列リテラル → error
 * - no-raw-radius  : borderRadius 系プロパティに数値リテラル直書き → error
 * - no-raw-spacing : padding/margin/gap 系に数値リテラル直書き → warn（false positive 多）
 * - no-raw-fontsize: fontSize に数値リテラル直書き → warn
 */

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/;
// RN の特殊カラーキーワードは token 化対象外として許可する（subtle variant の背景透明など）。
const SAFE_COLORS = new Set(["transparent", "currentColor", "inherit", "none"]);

/** Property の key 名を取る（Identifier / 文字列 Literal の両対応）。 */
function keyName(node) {
  if (!node.key) return null;
  if (node.key.type === "Identifier") return node.key.name;
  if (node.key.type === "Literal" && typeof node.key.value === "string") return node.key.value;
  return null;
}

/** value が数値リテラル直書きか（負数 UnaryExpression も拾う）。token 由来の MemberExpression は false。 */
function isRawNumber(value) {
  if (!value) return false;
  if (value.type === "Literal" && typeof value.value === "number") return true;
  if (value.type === "UnaryExpression" && value.operator === "-") return isRawNumber(value.argument);
  return false;
}

const isRadiusKey = (k) => typeof k === "string" && /^border([A-Za-z]*)Radius$/.test(k);
const isSpacingKey = (k) =>
  typeof k === "string" &&
  (/^(padding|margin)([A-Za-z]*)?$/.test(k) || k === "gap" || k === "rowGap" || k === "columnGap");

export const meltaPlugin = {
  rules: {
    "no-raw-color": {
      meta: { type: "problem", docs: { description: "色は theme.color.* を使う（生 hex/rgb/hsl 禁止）" } },
      create(context) {
        return {
          Literal(node) {
            if (
              typeof node.value === "string" &&
              !SAFE_COLORS.has(node.value) &&
              COLOR_RE.test(node.value)
            ) {
              context.report({ node, message: `生の色 "${node.value}" は禁止。theme.color.* を使う。` });
            }
          },
        };
      },
    },
    "no-raw-radius": {
      meta: { type: "problem", docs: { description: "borderRadius は theme.radius.* を使う" } },
      create(context) {
        return {
          Property(node) {
            if (isRadiusKey(keyName(node)) && isRawNumber(node.value)) {
              context.report({ node, message: "borderRadius の生数値は禁止。theme.radius.* を使う。" });
            }
          },
        };
      },
    },
    "no-raw-spacing": {
      meta: { type: "suggestion", docs: { description: "padding/margin/gap は theme.spacing.* を使う" } },
      create(context) {
        return {
          Property(node) {
            if (isSpacingKey(keyName(node)) && isRawNumber(node.value)) {
              context.report({ node, message: "spacing の生数値は theme.spacing.* 推奨。" });
            }
          },
        };
      },
    },
    "no-raw-fontsize": {
      meta: { type: "suggestion", docs: { description: "fontSize は theme.typography.fontSize.* を使う" } },
      create(context) {
        return {
          Property(node) {
            if (keyName(node) === "fontSize" && isRawNumber(node.value)) {
              context.report({ node, message: "fontSize の生数値は theme.typography.fontSize.* 推奨。" });
            }
          },
        };
      },
    },
  },
};
