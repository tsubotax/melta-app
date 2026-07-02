/**
 * avatar-conformance.test — recipes/app/avatar.recipe.json と実装 resolver の機械照合。
 * pure resolver（src/components/avatar.styles.ts）の出力と recipe styleRefs を突き合わせる。
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
  AVATAR_GROUP_OVERLAP,
  resolveAvatarStatusColor,
  resolveAvatarStyle,
} from "../../src/components/avatar.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

const recipe = loadAppRecipe(contractsRoot, "avatar.recipe.json") as AppRecipe & {
  variants: Record<string, Record<string, Record<string, unknown>>>;
  sizes: Record<string, { style: Record<string, unknown>; textStyle: Record<string, unknown>; dotSize: number }>;
  states: Record<string, { dotStyle: Record<string, unknown> }>;
};

test("avatar conformance: variants / sizes / states の網羅", () => {
  assert.deepEqual(Object.keys(recipe.variants).sort(), ["group", "image", "initials"]);
  assert.deepEqual(Object.keys(recipe.sizes).sort(), ["large", "medium", "small"]);
  assert.deepEqual(Object.keys(recipe.states).sort(), ["away", "offline", "online"]);
});

test("avatar conformance: image variant（radius.full の clip）が実装と一致", () => {
  assert.deepEqual(Object.keys(recipe.variants.image.style).sort(), ["borderRadius", "overflow"]);
  const impl = resolveAvatarStyle(nativeTheme, "light", "image", "medium");
  const style = resolveStyleRefs(tokens, recipe.variants.image.style);
  assert.equal(impl.container.borderRadius, style.borderRadius, "image: borderRadius = radius.full");
  assert.equal(impl.container.overflow, style.overflow, "image: overflow hidden");
  assert.ok(!("backgroundColor" in impl.container), "image: bg なし");
});

test("avatar conformance: initials variant（bg primary.50 + text primary.500 / medium weight）が実装と一致", () => {
  assert.deepEqual(
    Object.keys(recipe.variants.initials.style).sort(),
    ["alignItems", "backgroundColor", "borderRadius", "justifyContent"],
  );
  assert.deepEqual(Object.keys(recipe.variants.initials.textStyle).sort(), ["color", "fontWeight"]);
  const impl = resolveAvatarStyle(nativeTheme, "light", "initials", "medium");
  const style = resolveStyleRefs(tokens, recipe.variants.initials.style);
  const textStyle = resolveStyleRefs(tokens, recipe.variants.initials.textStyle);
  assert.equal(impl.container.backgroundColor, style.backgroundColor, "initials: bg = primary.50");
  assert.equal(impl.container.borderRadius, style.borderRadius, "initials: borderRadius = radius.full");
  assert.equal(impl.text.color, textStyle.color, "initials: text = primary.500");
  assert.equal(impl.text.fontWeight, textStyle.fontWeight, "initials: fontWeight = medium");
});

test("avatar conformance: group variant のオーバーラップ（-spacing.2 相当の literal）が実装と一致", () => {
  assert.deepEqual(Object.keys(recipe.variants.group).sort(), ["overlapStyle", "style"]);
  const overlap = recipe.variants.group.overlapStyle as { marginLeft: number };
  assert.equal(AVATAR_GROUP_OVERLAP, overlap.marginLeft, "group: overlap = recipe の literal");
  // literal の由来（-spacing.2）が崩れていないことも確認する
  assert.equal(AVATAR_GROUP_OVERLAP, -nativeTheme.spacing["2"], "group: overlap = -spacing.2");
});

test("avatar conformance: sizes（box / fontSize 段階 / dotSize）が実装と一致", () => {
  for (const size of ["small", "medium", "large"] as const) {
    const impl = resolveAvatarStyle(nativeTheme, "light", "initials", size);
    const box = resolveStyleRefs(tokens, recipe.sizes[size].style);
    const textStyle = resolveStyleRefs(tokens, recipe.sizes[size].textStyle);
    assert.equal(impl.container.width, box.width, `${size}: width`);
    assert.equal(impl.container.height, box.height, `${size}: height`);
    assert.equal(impl.text.fontSize, textStyle.fontSize, `${size}: initials fontSize`);
    assert.equal(impl.dot.width, recipe.sizes[size].dotSize, `${size}: dotSize`);
  }
});

test("avatar conformance: states（statusDot の色 + bg-surface ring）が実装と一致", () => {
  for (const status of ["online", "away", "offline"] as const) {
    const dotStyle = resolveStyleRefs(tokens, recipe.states[status].dotStyle);
    assert.equal(
      resolveAvatarStatusColor(nativeTheme, "light", status),
      dotStyle.backgroundColor,
      `${status}: dot 色`,
    );
    const impl = resolveAvatarStyle(nativeTheme, "light", "image", "medium");
    assert.equal(impl.dot.borderColor, dotStyle.borderColor, `${status}: ring = bg-surface`);
    assert.equal(impl.dot.borderWidth, dotStyle.borderWidth, `${status}: ring 幅`);
  }
});

test("avatar conformance: dark mode では ring / offline 色が dark 側から解決される", () => {
  const impl = resolveAvatarStyle(nativeTheme, "dark", "image", "medium");
  assert.equal(impl.dot.borderColor, nativeTheme.color.semantic.dark["bg-surface"]);
  assert.equal(
    resolveAvatarStatusColor(nativeTheme, "dark", "offline"),
    nativeTheme.color.semantic.dark["border-strong"],
  );
});
