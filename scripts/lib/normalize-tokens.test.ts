/**
 * normalize-tokens のユニットテスト（node:test、依存最小）。
 *   実行: npx tsx --test scripts/lib/normalize-tokens.test.ts
 *
 * 正規化(shadow / rem / lineHeight / em)が一番壊れやすいので必須（requirements §9）。
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { SIBLING_CONTRACTS_ROOT, resolveTokensPath } from "./contracts-root.js";
import {
  normalizeTokens,
  parseBoxShadow,
  parseColor,
  parseCubicBezier,
  type RawTokens,
  toNumber,
} from "./normalize-tokens";

test("toNumber: 単位を落として数値化する", () => {
  assert.equal(toNumber("4px"), 4);
  assert.equal(toNumber("0.25rem"), 0.25);
  assert.equal(toNumber("150ms"), 150);
  assert.equal(toNumber("0.01em"), 0.01);
  assert.throws(() => toNumber("auto"));
});

test("parseColor: rgba を色と opacity に分解、hex は opacity=1", () => {
  assert.deepEqual(parseColor("rgba(0,0,0,0.05)"), {
    color: "rgb(0, 0, 0)",
    opacity: 0.05,
  });
  assert.deepEqual(parseColor("#3d4b5f"), { color: "#3d4b5f", opacity: 1 });
});

test("parseBoxShadow: none は影なし（iOS shadow props のみ、elevation は持たない）", () => {
  assert.deepEqual(parseBoxShadow("none"), {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  });
});

test("parseBoxShadow: CSS box-shadow を iOS shadow props に分解（Android elevation は含めない）", () => {
  const s = parseBoxShadow("0 4px 6px rgba(0,0,0,0.1)");
  assert.equal(s.shadowColor, "rgb(0, 0, 0)");
  assert.deepEqual(s.shadowOffset, { width: 0, height: 4 });
  assert.equal(s.shadowRadius, 6);
  assert.equal(s.shadowOpacity, 0.1);
  // elevation は parseBoxShadow の責務外（normalizeTokens が手動 mapping で付与）
  assert.ok(!("elevation" in s));
});

test("parseCubicBezier: 4 引数の tuple を返す", () => {
  assert.deepEqual(parseCubicBezier("cubic-bezier(0.4, 0, 0.2, 1)"), [0.4, 0, 0.2, 1]);
  assert.throws(() => parseCubicBezier("ease-in-out"));
});

/** 実 tokens の正規化検証本体（npm 契約 / 兄弟 dev 版の両テストで共有）。 */
function assertRealTokensNormalize(tokensPath: string): void {
  const raw = JSON.parse(readFileSync(tokensPath, "utf8")) as RawTokens;
  const theme = normalizeTokens(raw);

  // color
  assert.equal(theme.color.primary["500"], "#2b70ef");
  assert.equal(theme.color.body, "#3d4b5f");
  assert.equal(theme.color.semantic.light["bg-surface"], "#ffffff");
  assert.equal(theme.color.semantic.dark["bg-surface"], "#1e293b");
  assert.equal(theme.color.status.success.subtleLight, "#ecfdf5");
  assert.equal(theme.color.status.danger.textDark, "#fca5a5");

  // typography: px 採用、lineHeight = max(px × 宣言比率(四捨五入), px × 1.45(切り上げ))
  assert.equal(theme.typography.fontSize.base.fontSize, 18);
  assert.equal(theme.typography.fontSize.base.lineHeight, 36); // 18 × 2.0（下限 27 より広い → 宣言値のまま）
  // 13 × 1.4 = 18.2 → round 18 だが、下限 ceil(13 × 1.45) = 19 でクランプされる
  assert.equal(theme.typography.fontSize.xs.lineHeight, 19);
  // 下限は**切り上げ**（round だと 32 × 1.45 = 46.4 → 46 で下限割れ）
  assert.equal(theme.typography.fontSize.xxs.lineHeight, 15);
  assert.equal(theme.typography.fontSize["3xl"].lineHeight, 47);
  // 既定 theme は前提フォント（system Noto CJK JP）の下限を明示的に持つ
  assert.equal(theme.typography.minLineHeightRatio, 1.45);
  assert.equal(theme.typography.fontWeight.bold, "700");
  // 初期は system default なので fontFamily は未指定（embed しない）
  assert.equal(theme.typography.fontFamily.sans, undefined);
  assert.equal(theme.typography.fontFamily.mono, undefined);
  assert.equal(theme.typography.letterSpacingRatio.heading, 0.01); // em ratio 保持

  // spacing / radius: 数値
  assert.equal(theme.spacing["4"], 16);
  assert.equal(theme.radius.md, 8);
  assert.equal(theme.radius.full, 9999);

  // elevation: iOS shadow は box-shadow 由来、Android elevation は手動 mapping table
  assert.equal(theme.elevation.none.shadowOpacity, 0);
  assert.equal(theme.elevation.none.elevation, 0);
  assert.equal(theme.elevation.md.shadowRadius, 6);
  assert.equal(theme.elevation.md.elevation, 5);
  assert.equal(theme.elevation.overlay.elevation, 10);

  // motion
  assert.equal(theme.motion.duration.fast, 150);
  assert.deepEqual(theme.motion.easing.default, [0.4, 0, 0.2, 1]);

  // zIndex
  assert.equal(theme.zIndex.modal, 50);
}

/**
 * ⚠️ 解決できなければ **throw**（skip しない）。旧実装は兄弟パス直書き + 無ければ
 * console.warn で return しており、CI（意図的に兄弟 melta-ui を置かない npm 経路検証）では
 * この検証が**常に silent skip** されていた（fail-open。Phase 0 リサーチ C-1 で検出）。
 * 解決順（npm → 兄弟 fallback）は scripts/lib/contracts-root.ts が SSOT。
 */
test("normalizeTokens: 実 tokens.json（npm 契約、fail-closed）を RN theme に変換する", () => {
  assertRealTokensNormalize(resolveTokensPath());
});

test("normalizeTokens: 兄弟 melta-ui の dev 版 tokens も同じ検証を通す（存在時のみ）", (t) => {
  // npm-first 化（上のテスト）だけだと、ローカルの兄弟 melta-ui で編集中の dev 版契約が
  // 一切検証されなくなる（Codex W1 レビュー指摘）。publish 前の契約変更をローカルで
  // 早期検出するため、兄弟がある環境では dev 版にも同じ assert を通す。
  // CI には兄弟が意図的に無い（npm 経路の証明）ので、ここは skip が正しい。
  const sibling = join(SIBLING_CONTRACTS_ROOT, "tokens.json");
  if (!existsSync(sibling)) {
    t.skip("兄弟 melta-ui なし（CI では npm 契約テストが本体）");
    return;
  }
  assertRealTokensNormalize(sibling);
});
