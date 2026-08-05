/**
 * line-height — 行間の安全下限（フォントの字形を欠かせない最小 lineHeight）。
 *
 * なぜ要るか（2026-08-05 modelog dogfood で実害）:
 * RN Android の CustomLineHeightSpan は `leading = lineHeight - (ascent + descent)` を計算し、
 * leading が負になると不足分を行の上下から半分ずつ削って帳尻を合わせる。削られた領域の字形
 * （濁点は行の上端にある）は Text 既定の overflow: hidden で消える——「ギ」が「チ」に見える。
 * web はこの機序を持たないため、web の実描画検査では検出できない（Android 実機のみで発現）。
 *
 * 下限は使用フォントのメトリクス（ascent + descent）に依存するが、melta はフォントを同梱しない
 * （system フォント運用）ので、既定は **Android の日本語 system フォント Noto Sans CJK JP の
 * 実測 1.448**（hhea: (1160 + 288) / 1000。AOSP 版・Google Fonts 版とも同値、2026-08-06 実測）
 * を切り上げた 1.45 とする。iOS（Hiragino 1.50 相当）にはこの clip 機序が無いので基準にしない。
 *
 * フォントを同梱する消費者は、そのフォントの実測比率を theme の
 * `typography.minLineHeightRatio` で宣言する（例: LINE Seed JP = 1.61）。
 * 宣言が既定より小さいラテン専用フォント（例: Inter 1.21）も同じ口で下げられる。
 */

/**
 * 既定の最小行間比。Android system 日本語フォント（Noto Sans CJK JP）の実測 1.448 の切り上げ。
 * theme が `typography.minLineHeightRatio` を宣言しない場合にこの値へ倒れる（日本語安全側）。
 */
export const DEFAULT_MIN_LINE_HEIGHT_RATIO = 1.45;

/**
 * fontSize に対する安全な最小 lineHeight（px）。
 * **切り上げ**であることが要点: 四捨五入だと 32 × 1.45 = 46.4 → 46 で下限を割る。
 */
export function minLineHeightFor(fontSize: number, minRatio: number): number {
  return Math.ceil(fontSize * minRatio);
}

/**
 * 宣言された lineHeight を安全下限でクランプする。
 * 宣言値が下限以上ならそのまま（意匠の行間はどこまでも広げられる。詰める方向だけを止める）。
 */
export function clampLineHeight(
  fontSize: number,
  declaredLineHeight: number,
  minRatio: number,
): number {
  return Math.max(declaredLineHeight, minLineHeightFor(fontSize, minRatio));
}
