/**
 * line-height-floor — DEFAULT_MIN_LINE_HEIGHT_RATIO（1.45）の根拠を機械検算する（W8）。
 *
 * 従来この既定値の根拠は line-height.ts の「2026-08-06 手実測」コメントだけで、
 * 参照フォント（Android system の Noto Sans CJK JP）が変わっても追随できなかった。
 * この検査は fixture（実フォントから抽出した生テーブル値、provenance 付き）から
 * RN CustomLineHeightSpan の式で必要比率を毎回再計算し、既定値と突き合わせる。
 *
 * - 式の正本 = scripts/lib/font-metrics.ts（modelog decisions §23 で確定した訂正版）
 * - fixture の再抽出 = scripts/extract-font-metrics.ts（フォント差し替え手順もそこに記載)
 * - 既定値は「必要比率の小数第2位切り上げ」と**完全一致**を要求する。上に外れても赤
 *   （参照フォントが変わって必要比率が下がったのに既定値が古いまま、を静かに通さない）
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { requiredRatioOfFace, type FaceMetrics } from "./font-metrics.js";
import {
  DEFAULT_MIN_LINE_HEIGHT_RATIO,
  minLineHeightFor,
} from "../../src/theme/line-height.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "reference-font-metrics.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
  source: { file: string; sha256: string; url: string; extractedAt: string };
  faces: FaceMetrics[];
};

// --- 式そのものの検査（synthetic face。実フォント無しで分岐を固定する） ---

test("formula: win == hhea なら自然行高 (A+D)/upm がそのまま下限", () => {
  const face: FaceMetrics = {
    unitsPerEm: 1000, ascent: 1160, descent: 288, lineGap: 0,
    winAscent: 1160, winDescent: 288, useTypoMetrics: false, fallback: false,
  };
  assert.equal(requiredRatioOfFace(face), 1.448);
});

test("formula: winAscent > A のフォントは自然行高でも足りない（Roboto 型）", () => {
  // 2·winAsc − A + D が支配項になるケース
  const face: FaceMetrics = {
    unitsPerEm: 2048, ascent: 1900, descent: 500, lineGap: 0,
    winAscent: 1946, winDescent: 512, useTypoMetrics: false, fallback: false,
  };
  const required = requiredRatioOfFace(face);
  assert.ok(required > (1900 + 500) / 2048, "自然行高より大きい下限になる");
  assert.equal(required, Math.max(2400, 2 * 1946 - 1900 + 500, 2 * 512 - 500 + 1900) / 2048);
});

test("formula: winDescent > D は下側の項が効く", () => {
  const face: FaceMetrics = {
    unitsPerEm: 1000, ascent: 800, descent: 200, lineGap: 0,
    winAscent: 800, winDescent: 300, useTypoMetrics: false, fallback: false,
  };
  assert.equal(requiredRatioOfFace(face), (2 * 300 - 200 + 800) / 1000);
});

test("formula: fallback（win* 不明）は lineGap 込みの従来式・負 lineGap は自然行高で floor", () => {
  const base = {
    unitsPerEm: 1000, ascent: 800, descent: 200,
    winAscent: null, winDescent: null, useTypoMetrics: false, fallback: true,
  };
  assert.equal(requiredRatioOfFace({ ...base, lineGap: 100 }), 1.1, "正の lineGap は足す（安全側）");
  assert.equal(requiredRatioOfFace({ ...base, lineGap: -100 }), 1.0, "負の lineGap で A+D を割らない");
});

// --- fixture（参照フォント実測）と既定値の突き合わせ ---

test("fixture: provenance が揃っている（手編集でなく再抽出で更新する前提の担保）", () => {
  assert.match(fixture.source.sha256, /^[0-9a-f]{64}$/, "sha256");
  assert.ok(fixture.source.url.startsWith("https://"), "取得元 URL");
  assert.ok(fixture.faces.length >= 1, "face が入っている");
});

test("fixture: fallback 面が無い（OS/2 を読めないフォントでは安全を保証できない）", () => {
  assert.deepEqual(
    fixture.faces.filter((f) => f.fallback),
    [],
    "fallback 面が混ざったら参照フォントとして不適格。差し替えること",
  );
});

test("DEFAULT_MIN_LINE_HEIGHT_RATIO = 参照フォント必要比率の小数第2位切り上げ、と完全一致", () => {
  // ttc は全 face 走査して最大を採る（1面でも欠けたら事故）
  const required = Math.max(...fixture.faces.map(requiredRatioOfFace));
  const expected = Math.ceil(required * 100) / 100;
  assert.equal(
    DEFAULT_MIN_LINE_HEIGHT_RATIO,
    expected,
    `既定 ${DEFAULT_MIN_LINE_HEIGHT_RATIO} が参照フォント実測 ${required.toFixed(4)} の切り上げ ${expected} と一致しない。` +
      `参照フォントを差し替えた場合は line-height.ts の既定値とコメントを追随させること`,
  );
});

// --- 既定 theme が自らの下限を満たしていることの回帰（0.6.0 の5段修正を守る） ---

test("native-theme: 全 fontSize 段の lineHeight が既定下限以上", () => {
  for (const [key, step] of Object.entries(nativeTheme.typography.fontSize)) {
    const floor = minLineHeightFor(step.fontSize, DEFAULT_MIN_LINE_HEIGHT_RATIO);
    assert.ok(
      step.lineHeight >= floor,
      `fontSize.${key}: lineHeight ${step.lineHeight} < 下限 ${floor}（fontSize ${step.fontSize} × ${DEFAULT_MIN_LINE_HEIGHT_RATIO} 切り上げ）`,
    );
  }
});
