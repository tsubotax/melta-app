/**
 * surface-conformance.test — recipes/app/surface.recipe.json と実装 resolver の機械照合。
 *
 * recipe-conformance.test.ts の「層B: button styleRefs conformance」と同型。
 * pure resolver（src/components/surface.styles.ts）の出力と recipe の styleRefs を
 * token 解決（tokens.json を正とする）して突き合わせる。
 * elevation だけは iOS shadow* + Android elevation の複合 token のため、
 * 期待値を生成物 native-theme（freshness は CI 担保済み）と比較する。
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
import { resolveSurfaceStyle } from "../../src/components/surface.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface SurfaceVariantRecipe {
  style: Record<string, unknown> & { elevation?: { token: string } };
}

const surfaceRecipe = loadAppRecipe(contractsRoot, "surface.recipe.json") as AppRecipe & {
  variants: Record<string, SurfaceVariantRecipe>;
};

test("surface conformance: default variant の色・角丸が実装デフォルト（prop デフォルト）と一致", () => {
  // recipe style のキー集合を固定（新キーが増えたら黙って通らず、照合の追加を強制する。Codex L-3）
  assert.deepEqual(
    Object.keys(surfaceRecipe.variants.default.style).sort(),
    ["backgroundColor", "borderRadius", "elevation"],
    "default: recipe style のキー集合が変わった（このテストに照合を追加すること）",
  );
  const impl = resolveSurfaceStyle(nativeTheme, "light"); // 引数なし = prop デフォルト
  const style = resolveStyleRefs(tokens, surfaceRecipe.variants.default.style);
  assert.equal(style.backgroundColor, impl.base.backgroundColor, "default: backgroundColor");
  assert.equal(style.borderRadius, impl.base.borderRadius, "default: borderRadius");
  // padding はデフォルト無し（recipe にも実装にも無いことを両側で確認）
  assert.ok(!("padding" in surfaceRecipe.variants.default.style), "recipe default に padding が無い");
  assert.ok(!("padding" in impl.base), "実装デフォルトに padding が無い");
});

test("surface conformance: elevation（複合 token）が nativeTheme 生成値と一致", () => {
  const ref = surfaceRecipe.variants.default.style.elevation;
  assert.ok(ref && typeof ref.token === "string", "recipe の elevation が token 参照である");
  assert.ok(ref.token.startsWith("elevation."), `elevation 参照が elevation.* でない: ${ref.token}`);
  const key = ref.token.slice("elevation.".length) as keyof typeof nativeTheme.elevation;
  assert.ok(key in nativeTheme.elevation, `nativeTheme に無い elevation キー: ${String(key)}`);
  const impl = resolveSurfaceStyle(nativeTheme, "light");
  assert.deepEqual(impl.elevation, nativeTheme.elevation[key], "default: elevation 複合値");
});

test("surface conformance: variants / sizes / states の網羅（default のみ・sizes / states 無し）", () => {
  assert.deepEqual(Object.keys(surfaceRecipe.variants), ["default"]);
  assert.deepEqual(Object.keys(surfaceRecipe.sizes ?? {}), []);
  assert.deepEqual(Object.keys(surfaceRecipe.states ?? {}), []);
});

test("surface conformance: props（bg / radius / elevation / padding）が token キーで theme を正しく引く", () => {
  const impl = resolveSurfaceStyle(nativeTheme, "light", {
    bg: "bg-page",
    radius: "sm",
    elevation: "md",
    padding: "4",
  });
  assert.equal(impl.base.backgroundColor, nativeTheme.color.semantic.light["bg-page"], "bg 上書き");
  assert.equal(impl.base.borderRadius, nativeTheme.radius.sm, "radius 上書き");
  assert.equal(impl.base.padding, nativeTheme.spacing["4"], "padding 上書き");
  assert.deepEqual(impl.elevation, nativeTheme.elevation.md, "elevation 上書き");
});

test("surface conformance: dark mode では semantic 色が dark 側から解決される", () => {
  const impl = resolveSurfaceStyle(nativeTheme, "dark");
  assert.equal(impl.base.backgroundColor, nativeTheme.color.semantic.dark["bg-surface"]);
});
