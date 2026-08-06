/**
 * alert-conformance.test — recipes/app/alert.recipe.json と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の「層B: button styleRefs conformance」と同型。
 * pure resolver（src/components/alert.styles.ts）の出力と recipe の styleRefs を
 * token 解決（tokens.json を正とする）して突き合わせる。
 * alert は variant 4種 × 3 slot（containerStyle / titleStyle / messageStyle）。
 * dark mode は resolver が status.*.subtleDark / textDark を解決（info のみ primary 固定）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveContractsRoot } from "./contracts-root.js";
import {
  loadAppRecipe,
  resolveStyleRefs,
  type AppRecipe,
} from "./recipe-conformance.js";
import { resolveAlertStyles, type AlertVariant } from "../../src/components/alert.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const alertRecipe = loadAppRecipe(contractsRoot, "alert.recipe.json") as AppRecipe & {
  variants: Record<string, Record<string, Record<string, unknown>>>;
};

/** slot のキー集合一致 + 全キーの値一致を照合する（期待値は tokens.json を正として解決）。 */
function assertSlotConforms(
  implSlot: Record<string, unknown>,
  recipeSlot: Record<string, unknown>,
  label: string,
) {
  const expected = resolveStyleRefs(tokens, recipeSlot);
  assert.deepEqual(
    Object.keys(implSlot).sort(),
    Object.keys(expected).sort(),
    `${label}: キー集合が recipe と不一致`,
  );
  for (const [key, value] of Object.entries(expected)) {
    assert.deepEqual(implSlot[key], value, `${label}.${key}`);
  }
}

test("alert conformance: 全 variant の全 slot が実装 resolver と recipe で一致（light）", () => {
  for (const [name, recipeVariant] of Object.entries(alertRecipe.variants)) {
    // recipe slot のキー集合を固定（新 slot が増えたら黙って通らず、照合の追加を強制する。Codex L-3）
    assert.deepEqual(
      Object.keys(recipeVariant).sort(),
      ["containerStyle", "messageStyle", "titleStyle"],
      `${name}: recipe の slot 集合が変わった（このテストに照合を追加すること）`,
    );
    assert.deepEqual(
      Object.keys(recipeVariant.containerStyle).sort(),
      ["alignItems", "backgroundColor", "borderRadius", "flexDirection", "gap", "padding"],
      `${name}: containerStyle のキー集合が変わった（このテストに照合を追加すること）`,
    );
    const impl = resolveAlertStyles(nativeTheme, "light", name as AlertVariant) as unknown as Record<
      string,
      Record<string, unknown>
    >;
    for (const [slot, recipeSlot] of Object.entries(recipeVariant)) {
      assertSlotConforms(impl[slot], recipeSlot, `${name}.${slot}`);
    }
  }
});

test("alert conformance: dark mode では status 色が subtleDark / textDark から解決される", () => {
  const statusKey = { success: "success", warning: "warning", error: "danger" } as const;
  for (const [variant, key] of Object.entries(statusKey)) {
    const impl = resolveAlertStyles(nativeTheme, "dark", variant as AlertVariant);
    const status = nativeTheme.color.status[key];
    assert.equal(impl.containerStyle.backgroundColor, status.subtleDark, `${variant}: bg`);
    assert.equal(impl.titleStyle.color, status.textDark, `${variant}: title 色`);
    assert.equal(impl.messageStyle.color, status.textDark, `${variant}: message 色`);
  }
  // info は primary 固定（mode 非依存 = light と同値。dark token が無い既知の割り切り）
  const dark = resolveAlertStyles(nativeTheme, "dark", "info");
  const light = resolveAlertStyles(nativeTheme, "light", "info");
  assert.deepEqual(dark, light, "info: mode 非依存");
});

test("alert conformance: recipe の variant / state 網羅が実装と一致（sizes / states なし）", () => {
  assert.deepEqual(
    new Set(Object.keys(alertRecipe.variants)),
    new Set(["info", "success", "warning", "error"]),
  );
  assert.deepEqual(Object.keys(alertRecipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(alertRecipe.states ?? {}), []);
});
