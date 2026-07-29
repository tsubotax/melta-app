/**
 * card-validate.test — Card の props 検査（src/components/card.validate.ts）の網羅。
 *
 * この検査は「型を持たない利用者（JavaScript）から contract 2.1.0 が静かに破られる」のを
 * 防ぐためのもの。Card 本体は結果を dev で1回だけ報告するだけなので、**検査の中身は
 * ここで見る**（警告のラッチを経由しないので、テスト順に依存しない）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { validateCardProps } from "../../src/components/card.validate.js";

const element = createElement("span", null, "x");

test("正しい action / link は問題なし", () => {
  for (const variant of ["action", "link"] as const) {
    assert.deepEqual(
      validateCardProps({ variant, onPress: () => {}, primaryAction: element }),
      [],
      `${variant} が誤検出されている`,
    );
  }
});

test("正しい basic / media は問題なし", () => {
  for (const variant of ["basic", "media"] as const) {
    assert.deepEqual(validateCardProps({ variant }), []);
  }
});

test("action / link の primaryAction 欠落を拾う", () => {
  const problems = validateCardProps({ variant: "action", onPress: () => {} });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /primaryAction が要る/);
  assert.match(problems[0], /スクリーンリーダー/, "なぜ要るのかが分かる文言であること");
});

test("action / link の onPress 欠落を拾う", () => {
  const problems = validateCardProps({ variant: "link", primaryAction: element });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /onPress が要る/);
});

test("欠落は同時に複数返す（1件で打ち切らない）", () => {
  assert.equal(validateCardProps({ variant: "action" }).length, 2);
});

test("型が違う値も拾う（JS 利用者は欠落だけでなく誤った値も渡しうる）", () => {
  const notFunction = validateCardProps({
    variant: "action",
    onPress: "go",
    primaryAction: element,
  });
  assert.equal(notFunction.length, 1);
  assert.match(notFunction[0], /onPress が関数でない（string）/);

  const notElement = validateCardProps({
    variant: "action",
    onPress: () => {},
    primaryAction: "開く",
  });
  assert.equal(notElement.length, 1);
  assert.match(notElement[0], /primaryAction が React 要素でない（string）/);
});

test("存在しない variant を拾う（型を持たない利用者の typo）", () => {
  // CARD_INTERACTIVE[variant] が undefined になり「非インタラクティブ」に倒れて
  // 静かに通る経路があった（Codex レビュー2周目の指摘）。
  const problems = validateCardProps({
    variant: "acton" as Parameters<typeof validateCardProps>[0]["variant"],
    onPress: () => {},
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /variant="acton" は存在しない/);
  assert.match(problems[0], /basic \/ media \/ action \/ link/);
});

test("文字列でない variant を安全に拒否する（検査自体が落ちない）", () => {
  // プロパティキーは文字列化されるので、型検査を hasOwnProperty より先に置かないと
  //   - new String("action") / { toString: () => "action" } が正規 variant として通る
  //   - Object.create(null) は文字列化できず TypeError で検査ごと落ちる
  // いずれも実測で再現した（Codex レビュー3周目）。
  type V = Parameters<typeof validateCardProps>[0]["variant"];
  const cases: [string, unknown][] = [
    ["String オブジェクト", new String("action")],
    ["toString で偽装", { toString: () => "action" }],
    ["Object.create(null)", Object.create(null) as unknown],
    ["undefined", undefined],
    ["null", null],
    ["数値", 123],
    ["Symbol", Symbol("action")],
  ];
  for (const [label, value] of cases) {
    const problems = validateCardProps({ variant: value as V, onPress: () => {} });
    assert.equal(problems.length, 1, `${label}: 1件だけ報告する`);
    assert.match(problems[0], /variant は文字列で渡す|は存在しない/, `${label}: 拒否されていない`);
  }
});

test("非インタラクティブ variant に onPress / primaryAction を渡したら拾う", () => {
  const problems = validateCardProps({
    variant: "basic",
    onPress: () => {},
    primaryAction: element,
  });
  assert.equal(problems.length, 2);
  assert.match(problems.join("\n"), /onPress を取らない/);
  assert.match(problems.join("\n"), /primaryAction を取らない/);
});
