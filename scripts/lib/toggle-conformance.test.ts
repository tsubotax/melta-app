/**
 * toggle-conformance.test — recipes/app/toggle.recipe.json と実装 resolver の機械照合（層B）。
 *
 * surface / textfield conformance と同型。pure resolver（src/components/toggle.styles.ts）の
 * 出力と recipe の styleRefs を token 解決（tokens.json を正とする）して突き合わせる。
 * - recipe のキー集合を Object.keys().sort() の deepEqual で固定（新キーが増えたら黙って通らない）。
 * - variant = variantModeledStates（off/on）。実装は value:boolean から暗黙決定するが、
 *   resolver は variant を直接受けるのでそのまま照合できる。
 * - sizes の寸法 literal（trackWidth 44 等）+ thumbOffset は TOGGLE_SIZE_SPEC と照合。
 * - states.disabled の opacity は TOGGLE_DISABLED_OPACITY と照合。
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
import {
  TOGGLE_SIZE_SPEC,
  TOGGLE_DISABLED_OPACITY,
  resolveToggleStyle,
  type ToggleVariant,
  type ToggleSize,
} from "../../src/components/toggle.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface ToggleVariantRecipe {
  trackStyle: Record<string, unknown>;
  thumbStyle: Record<string, unknown>;
}

const recipe = loadAppRecipe(contractsRoot, "toggle.recipe.json") as AppRecipe & {
  variants: Record<string, ToggleVariantRecipe>;
  sizes: Record<
    string,
    {
      trackStyle: Record<string, unknown>;
      thumbStyle: Record<string, unknown>;
      thumbOffset: number;
    }
  >;
  states: { disabled: { style: Record<string, unknown> } };
};

test("toggle conformance: recipe のキー集合が想定どおり（増えたらこのテストに照合を追加）", () => {
  assert.deepEqual(Object.keys(recipe.variants).sort(), ["off", "on"], "variants キー集合が変わった");
  for (const [name, v] of Object.entries(recipe.variants)) {
    assert.deepEqual(Object.keys(v).sort(), ["thumbStyle", "trackStyle"], `${name}: variant キー集合`);
    assert.deepEqual(
      Object.keys(v.trackStyle).sort(),
      ["backgroundColor", "borderRadius"],
      `${name}: trackStyle キー集合が変わった`,
    );
    assert.deepEqual(
      Object.keys(v.thumbStyle).sort(),
      ["backgroundColor", "borderRadius"],
      `${name}: thumbStyle キー集合が変わった`,
    );
  }
  for (const [name, s] of Object.entries(recipe.sizes)) {
    assert.deepEqual(
      Object.keys(s).sort(),
      ["thumbOffset", "thumbStyle", "trackStyle"],
      `size ${name}: キー集合が変わった`,
    );
    assert.deepEqual(Object.keys(s.trackStyle).sort(), ["height", "width"], `size ${name}: trackStyle`);
    assert.deepEqual(Object.keys(s.thumbStyle).sort(), ["height", "width"], `size ${name}: thumbStyle`);
  }
  assert.deepEqual(Object.keys(recipe.states ?? {}), ["disabled"], "states キー集合が変わった");
  assert.deepEqual(Object.keys(recipe.states.disabled).sort(), ["style"]);
  assert.deepEqual(Object.keys(recipe.states.disabled.style).sort(), ["opacity"]);
});

test("toggle conformance: 全 variant の track / thumb 色・角丸が実装 resolver と一致", () => {
  for (const [name, variantRecipe] of Object.entries(recipe.variants)) {
    const impl = resolveToggleStyle(nativeTheme, "light", { variant: name as ToggleVariant });
    const track = resolveStyleRefs(tokens, variantRecipe.trackStyle);
    const thumb = resolveStyleRefs(tokens, variantRecipe.thumbStyle);
    assert.equal(track.backgroundColor, impl.track.backgroundColor, `${name}: track backgroundColor`);
    assert.equal(track.borderRadius, impl.track.borderRadius, `${name}: track borderRadius`);
    assert.equal(thumb.backgroundColor, impl.thumb.backgroundColor, `${name}: thumb backgroundColor`);
    assert.equal(thumb.borderRadius, impl.thumb.borderRadius, `${name}: thumb borderRadius`);
  }
});

test("toggle conformance: sizes（track/thumb 寸法 + thumbOffset）が実装と一致", () => {
  for (const [name, sizeRecipe] of Object.entries(recipe.sizes)) {
    const spec = TOGGLE_SIZE_SPEC[name as ToggleSize];
    assert.ok(spec, `実装に無い size: ${name}`);
    const impl = resolveToggleStyle(nativeTheme, "light", { variant: "off", size: name as ToggleSize });
    assert.equal(sizeRecipe.trackStyle.width, impl.track.width, `${name}: track width`);
    assert.equal(sizeRecipe.trackStyle.height, impl.track.height, `${name}: track height`);
    assert.equal(sizeRecipe.thumbStyle.width, impl.thumb.width, `${name}: thumb width`);
    assert.equal(sizeRecipe.thumbStyle.height, impl.thumb.height, `${name}: thumb height`);
    // thumbOffset は track の padding として実装する（recipe description 参照）
    assert.equal(sizeRecipe.thumbOffset, impl.track.padding, `${name}: thumbOffset(=track padding)`);
    assert.equal(sizeRecipe.thumbOffset, spec.thumbOffset, `${name}: thumbOffset(SPEC)`);
  }
});

test("toggle conformance: states.disabled（opacity 差分）が実装定数と一致", () => {
  assert.equal(recipe.states.disabled.style.opacity, TOGGLE_DISABLED_OPACITY, "disabled: opacity");
});

test("toggle conformance: recipe の variant / size 網羅が実装のサポート集合と一致", () => {
  const implVariants = new Set<string>(["off", "on"] satisfies ToggleVariant[]);
  assert.deepEqual(new Set(Object.keys(recipe.variants)), implVariants);
  assert.deepEqual(new Set(Object.keys(recipe.sizes)), new Set(Object.keys(TOGGLE_SIZE_SPEC)));
});

test("toggle conformance: dark mode では semantic 色が dark 側から解決される", () => {
  const sem = nativeTheme.color.semantic.dark;
  const off = resolveToggleStyle(nativeTheme, "dark", { variant: "off" });
  assert.equal(off.track.backgroundColor, sem["border-strong"], "off dark: track backgroundColor");
  assert.equal(off.thumb.backgroundColor, sem["bg-surface"], "off dark: thumb backgroundColor");
  // on の track は primary.500（mode 非依存）
  const on = resolveToggleStyle(nativeTheme, "dark", { variant: "on" });
  assert.equal(on.track.backgroundColor, nativeTheme.color.primary["500"], "on dark: track");
});
