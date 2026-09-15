import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeTheme } from "../../src/theme/native-theme.js";
import { resolveCardShape, type CardVariant } from "../../src/components/card.styles.js";
import { resolveSkeletonVariants, resolveSkeletonSurfaceProps } from "../../src/components/skeleton.styles.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveContractsRoot } from "./contracts-root.js";

// 禁止トークンは値をゼロにするだけでなく、一度でも読めば失敗させる。
const flatTheme = { ...nativeTheme, elevation: {
  none: nativeTheme.elevation.none,
  get sm(): never { throw new Error("unexpected elevation.sm"); },
  get md(): never { throw new Error("unexpected elevation.md"); },
  get overlay(): never { throw new Error("unexpected elevation.overlay"); },
} };
for (const mode of ["light", "dark"] as const) {
  test(`Card none: 全variantと押下状態で禁止影を参照しない (${mode})`, () => {
    for (const variant of ["basic", "media", "action", "link"] satisfies CardVariant[]) {
      for (const pressed of [false, true]) {
        const actual = resolveCardShape(flatTheme, mode, variant, pressed, "none");
        const expected = { ...resolveCardShape(nativeTheme, mode, variant, pressed), ...nativeTheme.elevation.none };
        assert.deepEqual(actual, expected);
      }
    }
  });
  test(`Skeleton none: Surface経路も影なし (${mode})`, () => {
    assert.equal(resolveSkeletonSurfaceProps("none").elevation, "none");
    assert.deepEqual(resolveSkeletonVariants(flatTheme, mode, "none").card.style.elevation, nativeTheme.elevation.none);
  });
  test(`Skeleton text/circle: 既定でもcard影を読まない (${mode})`, () => {
    const styles = resolveSkeletonVariants(flatTheme, mode);
    assert.ok(styles.text.style.height > 0);
    assert.ok(styles.circle.style.width > 0);
  });
}
test("none APIはAPP recipeのelevation.noneに一致", () => {
  for (const id of ["card", "skeleton"]) {
    const recipe = JSON.parse(readFileSync(join(resolveContractsRoot(), `recipes/app/${id}.recipe.json`), "utf8"));
    assert.equal(recipe.elevationOptions.none.style.elevation.token, "elevation.none");
  }
});
