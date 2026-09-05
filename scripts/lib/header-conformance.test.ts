/** Headerの全variant/slotを契約recipeへ照合し、追加時の検査漏れも止める。 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveContractsRoot } from "./contracts-root.js";
import { loadAppRecipe, resolveStyleRefs } from "./recipe-conformance.js";
import { resolveHeaderStyle } from "../../src/components/header.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const root = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
const recipe = loadAppRecipe(root, "header.recipe.json");
const contract = JSON.parse(readFileSync(join(root, "components/header.contract.json"), "utf8"));

test("header: 契約とrecipeのvariant集合、サイズ、状態を網羅する", () => {
  assert.deepEqual(Object.keys(contract.variants).sort(), ["actions", "default"]);
  assert.deepEqual(Object.keys(recipe.variants ?? {}).sort(), ["actions", "default"]);
  assert.deepEqual(Object.keys(recipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(recipe.states ?? {}), []);
});
for (const variant of ["default", "actions"] as const) {
  test(`header: ${variant}の全slotをrecipeと一致させる`, () => {
    assert.deepEqual(resolveHeaderStyle(nativeTheme, "light", { variant }),
      resolveStyleRefs(tokens, recipe.variants![variant] as Record<string, unknown>));
  });
  test(`header: ${variant}はdarkとカスタムspacingへ追従する`, () => {
    const theme = { ...nativeTheme, spacing: { ...nativeTheme.spacing, "1": 6, "3": 20, "4": 24 } };
    const result = resolveHeaderStyle(theme, "dark", { variant }).containerStyle;
    assert.equal(result.paddingVertical, 20);
    assert.equal(result.paddingHorizontal, 24);
    assert.equal(result.gap, variant === "actions" ? 6 : 20);
    assert.equal(result.backgroundColor, theme.color.semantic.dark["bg-page"]);
    assert.equal(result.borderBottomColor, theme.color.semantic.dark["border-default"]);
  });
}
test("header: 省略時は従来defaultと同じで、actionsだけに隠す寸法を持つ", () => {
  const standard = resolveHeaderStyle(nativeTheme, "light");
  const actions = resolveHeaderStyle(nativeTheme, "light", { variant: "actions" });
  assert.deepEqual(standard, resolveHeaderStyle(nativeTheme, "light", { variant: "default" }));
  const { gap: defaultGap, ...standardContainer } = standard.containerStyle;
  const { gap: actionsGap, ...actionsContainer } = actions.containerStyle;
  assert.deepEqual(standardContainer, actionsContainer);
  assert.equal(defaultGap, 12);
  assert.equal(actionsGap, 4);
  assert.equal(standard.hiddenTitleStyle, undefined);
  assert.deepEqual(actions.hiddenTitleStyle, { position: "absolute", width: 1, height: 1, overflow: "hidden" });
});
