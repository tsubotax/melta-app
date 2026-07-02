/**
 * modal-conformance.test — recipes/app/modal.recipe.json と実装 resolver の機械照合。
 * pure resolver（src/components/modal.styles.ts）の出力と recipe styleRefs を突き合わせる。
 * panelStyle の elevation.overlay は複合 token のため、surface-conformance と同様
 * 期待値を生成物 native-theme（freshness は CI 担保済み）と比較する。
 * overlay の "rgba(0,0,0,0.5)" は token 外 literal のため literal 照合。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveContractsRoot,
  loadAppRecipe,
  resolveStyleRefs,
  type AppRecipe,
} from "./recipe-conformance.js";
import { resolveModalStyle, MODAL_MAX_WIDTH } from "../../src/components/modal.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface ModalVariantRecipe {
  overlayStyle: Record<string, unknown>;
  panelStyle: Record<string, unknown> & { elevation?: { token: string } };
  titleStyle: Record<string, unknown>;
  bodyStyle: Record<string, unknown>;
  footerStyle: Record<string, unknown>;
}

const recipe = loadAppRecipe(contractsRoot, "modal.recipe.json") as AppRecipe & {
  variants: Record<string, ModalVariantRecipe>;
  sizes: Record<string, { panelStyle: { maxWidth: number } }>;
};

const VARIANTS = ["alert", "confirmation", "form"] as const;
const SIZES = ["large", "medium", "small"] as const;

test("modal conformance: variants / sizes / states の網羅（3 variant × 3 size、states 空）", () => {
  assert.deepEqual(Object.keys(recipe.variants).sort(), [...VARIANTS]);
  assert.deepEqual(Object.keys(recipe.sizes ?? {}).sort(), [...SIZES]);
  assert.deepEqual(Object.keys(recipe.states ?? {}), []);
});

for (const variant of VARIANTS) {
  test(`modal conformance: ${variant} variant の各 style が実装と一致（variant は意味分類 = style 共通）`, () => {
    const rv = recipe.variants[variant];
    // recipe のキー集合を固定（新キーが増えたら黙って通らず、照合の追加を強制する）
    assert.deepEqual(
      Object.keys(rv).sort(),
      ["bodyStyle", "footerStyle", "overlayStyle", "panelStyle", "titleStyle"],
      `${variant}: recipe のキー集合が変わった（このテストに照合を追加すること）`,
    );
    assert.deepEqual(
      Object.keys(rv.panelStyle).sort(),
      ["backgroundColor", "borderRadius", "elevation", "padding", "width"],
      `${variant}: panelStyle のキー集合が変わった`,
    );

    // resolver は variant で分岐しない（recipe の 3 variant が同値であることをこのループが担保）
    const impl = resolveModalStyle(nativeTheme, "light", { variant, size: "medium" });

    assert.deepEqual(impl.overlayStyle, resolveStyleRefs(tokens, rv.overlayStyle), `${variant}: overlayStyle`);
    // overlay の黒 50% は token 外 literal（web も bg-black/50）
    assert.equal(impl.overlayStyle.backgroundColor, "rgba(0,0,0,0.5)", `${variant}: overlay literal`);

    // panelStyle: elevation（複合 token）を除いて照合し、size の maxWidth を合成
    const { elevation: _elevation, ...panelRefs } = rv.panelStyle;
    assert.deepEqual(
      impl.panelStyle,
      { ...resolveStyleRefs(tokens, panelRefs), maxWidth: recipe.sizes.medium.panelStyle.maxWidth },
      `${variant}: panelStyle（elevation 除く + size=medium の maxWidth）`,
    );

    assert.deepEqual(impl.titleStyle, resolveStyleRefs(tokens, rv.titleStyle), `${variant}: titleStyle`);
    assert.deepEqual(impl.bodyStyle, resolveStyleRefs(tokens, rv.bodyStyle), `${variant}: bodyStyle`);
    assert.deepEqual(impl.footerStyle, resolveStyleRefs(tokens, rv.footerStyle), `${variant}: footerStyle`);
  });
}

test("modal conformance: elevation（複合 token）が nativeTheme 生成値と一致", () => {
  for (const variant of VARIANTS) {
    const ref = recipe.variants[variant].panelStyle.elevation;
    assert.ok(ref && typeof ref.token === "string", `${variant}: elevation が token 参照である`);
    assert.ok(ref.token.startsWith("elevation."), `${variant}: elevation 参照が elevation.* でない: ${ref.token}`);
    const key = ref.token.slice("elevation.".length) as keyof typeof nativeTheme.elevation;
    assert.ok(key in nativeTheme.elevation, `${variant}: nativeTheme に無い elevation キー: ${String(key)}`);
    const impl = resolveModalStyle(nativeTheme, "light", { variant });
    assert.deepEqual(impl.panelElevation, nativeTheme.elevation[key], `${variant}: elevation 複合値`);
  }
});

test("modal conformance: sizes の maxWidth が recipe literal と一致", () => {
  for (const size of SIZES) {
    assert.deepEqual(Object.keys(recipe.sizes[size]), ["panelStyle"], `${size}: recipe size のキー集合`);
    assert.deepEqual(Object.keys(recipe.sizes[size].panelStyle), ["maxWidth"], `${size}: panelStyle のキー集合`);
    const impl = resolveModalStyle(nativeTheme, "light", { size });
    assert.equal(impl.panelStyle.maxWidth, recipe.sizes[size].panelStyle.maxWidth, `${size}: maxWidth`);
    assert.equal(MODAL_MAX_WIDTH[size], recipe.sizes[size].panelStyle.maxWidth, `${size}: MODAL_MAX_WIDTH map`);
  }
});

test("modal conformance: dark mode では semantic 色が dark 側から解決される", () => {
  const impl = resolveModalStyle(nativeTheme, "dark");
  assert.equal(impl.panelStyle.backgroundColor, nativeTheme.color.semantic.dark["bg-surface"]);
  assert.equal(impl.titleStyle.color, nativeTheme.color.semantic.dark["text-heading"]);
});
