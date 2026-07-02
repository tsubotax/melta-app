/**
 * metric-conformance.test — recipes/app/metric.recipe.json と実装 resolver の機械照合（層B）。
 *
 * button（recipe-conformance.test.ts 層B）と同型。pure resolver（src/primitives/metric.styles.ts）の
 * 出力と recipe の styleRefs を token 解決して突き合わせる。
 * - variants.default の valueStyle / unitStyle / labelStyle は size 非依存キー（fontWeight / color /
 *   fontVariant / marginLeft / labelStyle.fontSize）。fontVariant は literal 配列（token 外）で deepEqual。
 * - sizes の valueFontSize / unitFontSize は style object でなく scalar token 参照
 *   （resolveStyleRefs(tokens, { v: ref }).v パターンで解決。button の sizes テスト参照）。
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
  resolveMetricStyles,
  METRIC_FONT,
  type MetricSize,
} from "../../src/primitives/metric.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface MetricVariantRecipe {
  valueStyle: Record<string, unknown>;
  unitStyle: Record<string, unknown>;
  labelStyle: Record<string, unknown>;
}

const metricRecipe = loadAppRecipe(contractsRoot, "metric.recipe.json") as AppRecipe & {
  variants: Record<string, MetricVariantRecipe>;
  sizes: Record<string, { valueFontSize: { token: string }; unitFontSize: { token: string } }>;
};

test("metric conformance: variant default の valueStyle / unitStyle / labelStyle が実装と一致", () => {
  // size 非依存キーの照合なので代表 size（md）で解決する（size 依存キーは sizes テスト側）
  const impl = resolveMetricStyles(nativeTheme, "light", "md");
  const variantRecipe = metricRecipe.variants.default;
  assert.ok(variantRecipe, "recipe に variant default が無い");

  // 各 slot のキー集合を固定（recipe に新キーが増えたら黙って通らず、照合の追加を強制する。Codex L-2）
  assert.deepEqual(
    Object.keys(variantRecipe.valueStyle).sort(),
    ["color", "fontVariant", "fontWeight"],
    "valueStyle: recipe のキー集合が変わった（このテストに照合を追加すること）",
  );
  assert.deepEqual(
    Object.keys(variantRecipe.unitStyle).sort(),
    ["color", "fontWeight", "marginLeft"],
    "unitStyle: recipe のキー集合が変わった（このテストに照合を追加すること）",
  );
  assert.deepEqual(
    Object.keys(variantRecipe.labelStyle).sort(),
    ["color", "fontSize"],
    "labelStyle: recipe のキー集合が変わった（このテストに照合を追加すること）",
  );

  const value = resolveStyleRefs(tokens, variantRecipe.valueStyle);
  assert.equal(value.fontWeight, impl.valueStyle.fontWeight, "valueStyle.fontWeight");
  assert.equal(value.color, impl.valueStyle.color, "valueStyle.color");
  assert.deepEqual(value.fontVariant, impl.valueStyle.fontVariant, "valueStyle.fontVariant");

  const unit = resolveStyleRefs(tokens, variantRecipe.unitStyle);
  assert.equal(unit.fontWeight, impl.unitStyle.fontWeight, "unitStyle.fontWeight");
  assert.equal(unit.color, impl.unitStyle.color, "unitStyle.color");
  assert.equal(unit.marginLeft, impl.unitStyle.marginLeft, "unitStyle.marginLeft");

  const label = resolveStyleRefs(tokens, variantRecipe.labelStyle);
  assert.equal(label.fontSize, impl.labelStyle.fontSize, "labelStyle.fontSize");
  assert.equal(label.color, impl.labelStyle.color, "labelStyle.color");
});

test("metric conformance: sizes（value / unit の fontSize）が実装と一致", () => {
  for (const [name, sizeRecipe] of Object.entries(metricRecipe.sizes)) {
    assert.ok(METRIC_FONT[name as MetricSize], `実装に無い size: ${name}`);
    const impl = resolveMetricStyles(nativeTheme, "light", name as MetricSize);
    const valuePx = resolveStyleRefs(tokens, { v: sizeRecipe.valueFontSize }).v;
    assert.equal(valuePx, impl.valueStyle.fontSize, `${name}: valueFontSize`);
    const unitPx = resolveStyleRefs(tokens, { v: sizeRecipe.unitFontSize }).v;
    assert.equal(unitPx, impl.unitStyle.fontSize, `${name}: unitFontSize`);
  }
});

test("metric conformance: recipe の variant / size 網羅が実装と一致（欠落・過剰なし）", () => {
  // Metric に variant prop は無い = 実装がサポートするのは default のみ
  assert.deepEqual(new Set(Object.keys(metricRecipe.variants)), new Set(["default"]));
  assert.deepEqual(new Set(Object.keys(metricRecipe.sizes)), new Set(Object.keys(METRIC_FONT)));
});
