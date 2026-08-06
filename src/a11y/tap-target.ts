/**
 * tap-target — 実効タップ標的 44pt（横断方針）の数値 SSOT。
 *
 * 正本は melta-contracts の `A11Y_MIN_TAP_TARGET_44`（rules.json）:
 * 「すべての操作要素は実効タップ標的 44pt を下回らない。視覚寸法は契約どおり据え置き、
 * 当たり判定だけを広げる。app は視覚 24pt + hitSlop 10 の正典パターンか minHeight で下限を保証する
 * （height 固定は fontScale でクリップするので使わない）」。
 *
 * ここは「44」という数と正典パターンの寸法を**一箇所**に置くための pure module。
 * 各コンポーネントの hitSlop 値そのものは **literal で各 `*.styles.ts` に置く**（ここから
 * 自動導出しない）。導出にすると視覚寸法が変わったとき hitSlop も一緒に動いてしまい、
 * conformance テスト（scripts/lib/tap-target-conformance.test.ts）が構造的に fail-open になるため。
 *
 * react-native を import しない純粋モジュール（`*.styles.ts` と同じ規約）。
 */

/** 実効タップ標的の下限（pt）。WCAG 2.2 SC 2.5.5（AAA）水準を melta の横断方針として採る。 */
export const MIN_TAP_TARGET = 44;

/**
 * 正典パターン: 視覚 24pt の箱 + hitSlop 10 → 実効 44pt。
 * 背景を持たない小さな操作要素（Tag removable の × / Toast の × / Alert の × / Modal の ×）はこれ。
 */
export const CANONICAL_TAP_TARGET = {
  minWidth: 24,
  minHeight: 24,
  hitSlop: 10,
} as const;

/**
 * 視覚寸法 `visual` を実効 44pt に届かせるのに必要な**片側** hitSlop（切り上げ ＝ 安全側）。
 *
 * ⚠️ 実装の hitSlop 値をこの関数で計算しないこと（上のコメント参照）。
 * 使うのは (a) 値を決めるときの検算、(b) conformance テストの期待値算出。
 */
export function requiredHitSlop(visual: number): number {
  return Math.max(0, Math.ceil((MIN_TAP_TARGET - visual) / 2));
}
