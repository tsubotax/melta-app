/**
 * toast-conformance.test — recipes/app/toast.recipe.json と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の「層B: button styleRefs conformance」と同型。
 * pure resolver（src/components/toast.styles.ts）の出力と recipe の styleRefs を
 * token 解決（tokens.json を正とする）して突き合わせる。
 * elevation だけは iOS shadow* + Android elevation の複合 token のため、
 * 期待値を生成物 native-theme（freshness は CI 担保済み）と比較する（surface-conformance と同型）。
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
import { resolveToastStyles, type ToastVariant } from "../../src/components/toast.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface ToastVariantRecipe {
  containerStyle: Record<string, unknown> & { elevation?: { token: string } };
  messageStyle: Record<string, unknown>;
}

const toastRecipe = loadAppRecipe(contractsRoot, "toast.recipe.json") as AppRecipe & {
  variants: Record<string, ToastVariantRecipe>;
};

test("toast conformance: 全 variant の containerStyle / messageStyle が実装 resolver と recipe で一致（light）", () => {
  for (const [name, recipeVariant] of Object.entries(toastRecipe.variants)) {
    // recipe slot / キー集合を固定（新キーが増えたら黙って通らず、照合の追加を強制する。Codex L-3）
    assert.deepEqual(
      Object.keys(recipeVariant).sort(),
      ["containerStyle", "messageStyle"],
      `${name}: recipe の slot 集合が変わった（このテストに照合を追加すること）`,
    );
    assert.deepEqual(
      Object.keys(recipeVariant.containerStyle).sort(),
      ["alignItems", "backgroundColor", "borderRadius", "elevation", "flexDirection", "gap", "padding"],
      `${name}: containerStyle のキー集合が変わった（このテストに照合を追加すること）`,
    );
    assert.deepEqual(
      Object.keys(recipeVariant.messageStyle).sort(),
      ["color", "fontSize", "fontWeight"],
      `${name}: messageStyle のキー集合が変わった（このテストに照合を追加すること）`,
    );
    const impl = resolveToastStyles(nativeTheme, "light", name as ToastVariant);
    // containerStyle: elevation（複合 token、別テストで照合）以外の全キーを照合
    const { elevation: _elevation, ...flat } = recipeVariant.containerStyle;
    const expected = resolveStyleRefs(tokens, flat);
    assert.deepEqual(
      Object.keys(impl.containerStyle).sort(),
      Object.keys(expected).sort(),
      `${name}.containerStyle: キー集合が recipe（elevation 除く）と不一致`,
    );
    for (const [key, value] of Object.entries(expected)) {
      assert.deepEqual(
        (impl.containerStyle as Record<string, unknown>)[key],
        value,
        `${name}.containerStyle.${key}`,
      );
    }
    // messageStyle: 全キー照合
    const expectedMessage = resolveStyleRefs(tokens, recipeVariant.messageStyle);
    assert.deepEqual(
      Object.keys(impl.messageStyle).sort(),
      Object.keys(expectedMessage).sort(),
      `${name}.messageStyle: キー集合が recipe と不一致`,
    );
    for (const [key, value] of Object.entries(expectedMessage)) {
      assert.deepEqual(
        (impl.messageStyle as Record<string, unknown>)[key],
        value,
        `${name}.messageStyle.${key}`,
      );
    }
  }
});

test("toast conformance: elevation（複合 token）が nativeTheme 生成値と一致", () => {
  for (const [name, recipeVariant] of Object.entries(toastRecipe.variants)) {
    const ref = recipeVariant.containerStyle.elevation;
    assert.ok(ref && typeof ref.token === "string", `${name}: elevation が token 参照である`);
    assert.ok(ref.token.startsWith("elevation."), `${name}: elevation 参照が elevation.* でない: ${ref.token}`);
    const key = ref.token.slice("elevation.".length) as keyof typeof nativeTheme.elevation;
    assert.ok(key in nativeTheme.elevation, `${name}: nativeTheme に無い elevation キー: ${String(key)}`);
    const impl = resolveToastStyles(nativeTheme, "light", name as ToastVariant);
    assert.deepEqual(impl.elevation, nativeTheme.elevation[key], `${name}: elevation 複合値`);
  }
});

test("toast conformance: dark mode では status 色が subtleDark / textDark から解決される", () => {
  const statusKey = { success: "success", warning: "warning", error: "danger" } as const;
  for (const [variant, key] of Object.entries(statusKey)) {
    const impl = resolveToastStyles(nativeTheme, "dark", variant as ToastVariant);
    const status = nativeTheme.color.status[key];
    assert.equal(impl.containerStyle.backgroundColor, status.subtleDark, `${variant}: bg`);
    assert.equal(impl.messageStyle.color, status.textDark, `${variant}: message 色`);
  }
  // info は primary 固定（mode 非依存 = light と同値。alert と同じ割り切り）
  assert.deepEqual(
    resolveToastStyles(nativeTheme, "dark", "info"),
    resolveToastStyles(nativeTheme, "light", "info"),
    "info: mode 非依存",
  );
});

test("toast conformance: recipe の variant / state 網羅が実装と一致（sizes / states なし）", () => {
  assert.deepEqual(
    new Set(Object.keys(toastRecipe.variants)),
    new Set(["success", "error", "warning", "info"]),
  );
  assert.deepEqual(Object.keys(toastRecipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(toastRecipe.states ?? {}), []);
});
