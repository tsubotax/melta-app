/**
 * card.validate — Card の props が contract 2.1.0 を満たしているかの検査（純関数）。
 *
 * **なぜ実行時に検査するか**: props の型は TypeScript を使う利用者にしか効かない。
 * JavaScript から使われたとき、contract の要求が静かに破られるのを防ぐ。
 *
 * react-native を import しない純粋モジュールにして、node テスト（tsx --test）から
 * 直接網羅できるようにしている。Card 側は結果を dev で1回だけ報告するだけ
 * （警告のラッチに依存せずに検査内容そのものをテストできる形にするため）。
 */

import { isValidElement } from "react";
import type { CardVariant } from "./card.styles.js";
import { CARD_INTERACTIVE } from "./card.styles.js";

export interface CardPropsForValidation {
  variant: CardVariant;
  onPress?: unknown;
  primaryAction?: unknown;
}

/**
 * 問題の一覧を返す（空配列 ＝ 問題なし）。
 *
 * 検出できるのは「欠落」と「明らかに型が違う」ところまで。
 * `primaryAction` が**本当に操作可能か**、面と**同じ遷移先か**は任意の ReactElement からは
 * 判定できない（そこは契約の文と README の説明が担う）。
 */
export function validateCardProps({
  variant,
  onPress,
  primaryAction,
}: CardPropsForValidation): string[] {
  // 未知の variant は CARD_INTERACTIVE で undefined になり、以降の分岐が
  // 「非インタラクティブ」に倒れて静かに通ってしまう。型を持たない利用者の typo
  //（variant="acton" 等）が押せないカードとして出荷されるので、最初に弾く。
  //
  // ⚠️ 文字列型の確認を hasOwnProperty より**先**に置くこと。プロパティキーは
  // ToPropertyKey で文字列化されるため、
  //   - `new String("action")` や `{ toString: () => "action" }` が正規 variant として通る
  //   - `Object.create(null)` は文字列化できず **TypeError で検査自体が落ちる**
  //     （dev の防御が防御にならない）
  // いずれも実測で再現済み（Codex レビュー3周目）。
  if (typeof variant !== "string") {
    return [
      `Card の variant は文字列で渡す（受け取ったのは ${variant === null ? "null" : typeof variant}）。`,
    ];
  }
  if (!Object.prototype.hasOwnProperty.call(CARD_INTERACTIVE, variant)) {
    return [
      `Card の variant="${String(variant)}" は存在しない（` +
        `${Object.keys(CARD_INTERACTIVE).join(" / ")} のいずれか）。`,
    ];
  }

  if (!CARD_INTERACTIVE[variant]) {
    const problems: string[] = [];
    if (onPress != null) {
      problems.push(`Card variant="${variant}" は onPress を取らない（押せるのは action / link）。`);
    }
    if (primaryAction != null) {
      problems.push(`Card variant="${variant}" は primaryAction を取らない（押せるのは action / link）。`);
    }
    return problems;
  }

  const problems: string[] = [];

  if (onPress == null) {
    problems.push(
      `Card variant="${variant}" は onPress が要る。渡さないと押せない見た目のまま非対話になる。`,
    );
  } else if (typeof onPress !== "function") {
    problems.push(`Card variant="${variant}" の onPress が関数でない（${typeof onPress}）。`);
  }

  if (primaryAction == null) {
    problems.push(
      `Card variant="${variant}" は primaryAction が要る（contract 2.1.0）。` +
        "カード面は操作要素ではないので、これが無いとキーボード / スクリーンリーダーから" +
        "カードのアクションに到達できない。面の onPress と同じ操作を指す Button 等を渡すこと。",
    );
  } else if (!isValidElement(primaryAction)) {
    problems.push(
      `Card variant="${variant}" の primaryAction が React 要素でない（${typeof primaryAction}）。` +
        "文字列や真偽値では操作要素にならない。",
    );
  }

  return problems;
}
