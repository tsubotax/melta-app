/**
 * textfield-conformance.test — recipes/app/textfield.recipe.json と実装 resolver の機械照合（層B）。
 *
 * surface / text conformance と同型。pure resolver（src/components/textfield.styles.ts）の
 * 出力と recipe の styleRefs を token 解決（tokens.json を正とする）して突き合わせる。
 * - recipe のキー集合を Object.keys().sort() の deepEqual で固定（新キーが増えたら黙って通らず、
 *   照合の追加を強制する）。
 * - label/helperText/errorText は variant 非依存の共通部として default にのみ載る規約
 *   （recipe description 参照）。実装は全 variant で同じものを返すので default 側とだけ照合する。
 * - focus は states 差分（borderColor のみ）。resolveTextFieldFocusStyle と照合。
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
import {
  TEXTFIELD_SIZE_SPEC,
  resolveTextFieldStyle,
  resolveTextFieldFocusStyle,
  type TextFieldVariant,
  type TextFieldSize,
} from "../../src/components/textfield.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface TextFieldVariantRecipe {
  inputStyle: Record<string, unknown>;
  labelStyle?: Record<string, unknown>;
  helperTextStyle?: Record<string, unknown>;
  errorTextStyle?: Record<string, unknown>;
}

const recipe = loadAppRecipe(contractsRoot, "textfield.recipe.json") as AppRecipe & {
  variants: Record<string, TextFieldVariantRecipe>;
  sizes: Record<string, { inputStyle: Record<string, unknown> }>;
  states: { focus: { inputStyle: Record<string, unknown> } };
};

test("textfield conformance: recipe のキー集合が想定どおり（増えたらこのテストに照合を追加）", () => {
  // default だけが共通部（label/helper/error）を持ち、他 variant は inputStyle のみ
  assert.deepEqual(
    Object.keys(recipe.variants.default).sort(),
    ["errorTextStyle", "helperTextStyle", "inputStyle", "labelStyle"],
    "default: variant キー集合が変わった",
  );
  for (const [name, v] of Object.entries(recipe.variants)) {
    if (name !== "default") {
      assert.deepEqual(Object.keys(v).sort(), ["inputStyle"], `${name}: variant キー集合が変わった`);
    }
    assert.deepEqual(
      Object.keys(v.inputStyle).sort(),
      ["backgroundColor", "borderColor", "borderRadius", "borderWidth"],
      `${name}: inputStyle キー集合が変わった`,
    );
  }
  assert.deepEqual(
    Object.keys(recipe.variants.default.labelStyle ?? {}).sort(),
    ["color", "fontSize", "fontWeight", "marginBottom"],
    "labelStyle キー集合が変わった",
  );
  assert.deepEqual(
    Object.keys(recipe.variants.default.helperTextStyle ?? {}).sort(),
    ["color", "fontSize", "marginTop"],
    "helperTextStyle キー集合が変わった",
  );
  assert.deepEqual(
    Object.keys(recipe.variants.default.errorTextStyle ?? {}).sort(),
    ["color", "fontSize", "marginTop"],
    "errorTextStyle キー集合が変わった",
  );
  for (const [name, s] of Object.entries(recipe.sizes)) {
    assert.deepEqual(Object.keys(s).sort(), ["inputStyle"], `size ${name}: キー集合が変わった`);
    assert.deepEqual(
      Object.keys(s.inputStyle).sort(),
      ["fontSize", "height", "paddingHorizontal"],
      `size ${name}: inputStyle キー集合が変わった`,
    );
  }
  assert.deepEqual(Object.keys(recipe.states ?? {}), ["focus"], "states キー集合が変わった");
  assert.deepEqual(Object.keys(recipe.states.focus).sort(), ["inputStyle"]);
  assert.deepEqual(Object.keys(recipe.states.focus.inputStyle).sort(), ["borderColor"]);
});

test("textfield conformance: 全 variant の inputStyle（border/bg/radius）が実装 resolver と一致", () => {
  for (const [name, variantRecipe] of Object.entries(recipe.variants)) {
    const impl = resolveTextFieldStyle(nativeTheme, "light", {
      variant: name as TextFieldVariant,
    });
    const style = resolveStyleRefs(tokens, variantRecipe.inputStyle);
    assert.equal(style.borderWidth, impl.input.borderWidth, `${name}: borderWidth`);
    assert.equal(style.borderColor, impl.input.borderColor, `${name}: borderColor`);
    assert.equal(style.backgroundColor, impl.input.backgroundColor, `${name}: backgroundColor`);
    assert.equal(style.borderRadius, impl.input.borderRadius, `${name}: borderRadius`);
  }
});

test("textfield conformance: 共通部（label / helperText / errorText）が実装 resolver と一致", () => {
  const impl = resolveTextFieldStyle(nativeTheme, "light");
  const label = resolveStyleRefs(tokens, recipe.variants.default.labelStyle);
  assert.equal(label.fontSize, impl.label.fontSize, "label: fontSize");
  assert.equal(label.fontWeight, impl.label.fontWeight, "label: fontWeight");
  assert.equal(label.color, impl.label.color, "label: color");
  assert.equal(label.marginBottom, impl.label.marginBottom, "label: marginBottom");

  const helper = resolveStyleRefs(tokens, recipe.variants.default.helperTextStyle);
  assert.equal(helper.fontSize, impl.helperText.fontSize, "helperText: fontSize");
  assert.equal(helper.color, impl.helperText.color, "helperText: color");
  assert.equal(helper.marginTop, impl.helperText.marginTop, "helperText: marginTop");

  const error = resolveStyleRefs(tokens, recipe.variants.default.errorTextStyle);
  assert.equal(error.fontSize, impl.errorText.fontSize, "errorText: fontSize");
  assert.equal(error.color, impl.errorText.color, "errorText: color");
  assert.equal(error.marginTop, impl.errorText.marginTop, "errorText: marginTop");
});

test("textfield conformance: sizes（height / paddingHorizontal / fontSize）が実装と一致", () => {
  for (const [name, sizeRecipe] of Object.entries(recipe.sizes)) {
    const spec = TEXTFIELD_SIZE_SPEC[name as TextFieldSize];
    assert.ok(spec, `実装に無い size: ${name}`);
    const impl = resolveTextFieldStyle(nativeTheme, "light", { size: name as TextFieldSize });
    const style = resolveStyleRefs(tokens, sizeRecipe.inputStyle);
    assert.equal(style.height, impl.input.height, `${name}: height`);
    assert.equal(style.paddingHorizontal, impl.input.paddingHorizontal, `${name}: paddingHorizontal`);
    assert.equal(style.fontSize, impl.input.fontSize, `${name}: fontSize`);
  }
});

test("textfield conformance: states.focus（borderColor 差分）が実装 focus resolver と一致", () => {
  const style = resolveStyleRefs(tokens, recipe.states.focus.inputStyle);
  const impl = resolveTextFieldFocusStyle(nativeTheme);
  assert.equal(style.borderColor, impl.borderColor, "focus: borderColor");
});

test("textfield conformance: recipe の variant / size 網羅が実装のサポート集合と一致", () => {
  const implVariants = new Set<string>([
    "default",
    "error",
    "success",
    "disabled",
  ] satisfies TextFieldVariant[]);
  assert.deepEqual(new Set(Object.keys(recipe.variants)), implVariants);
  assert.deepEqual(new Set(Object.keys(recipe.sizes)), new Set(Object.keys(TEXTFIELD_SIZE_SPEC)));
});

test("textfield conformance: dark mode では semantic / status 色が dark 側から解決される", () => {
  const sem = nativeTheme.color.semantic.dark;
  const impl = resolveTextFieldStyle(nativeTheme, "dark");
  assert.equal(impl.input.borderColor, sem["input-border"], "default dark: borderColor");
  assert.equal(impl.input.backgroundColor, sem["input-bg"], "default dark: backgroundColor");
  assert.equal(impl.label.color, sem["text-heading"], "dark: label color");
  const error = resolveTextFieldStyle(nativeTheme, "dark", { variant: "error" });
  assert.equal(
    error.input.backgroundColor,
    nativeTheme.color.status.danger.subtleDark,
    "error dark: backgroundColor",
  );
  assert.equal(
    error.errorText.color,
    nativeTheme.color.status.danger.textDark,
    "error dark: errorText color",
  );
});
