/**
 * font-metrics — フォントの必要行間比（字形を欠かせない最小 lineHeight / fontSize）の実測。
 *
 * DEFAULT_MIN_LINE_HEIGHT_RATIO（src/theme/line-height.ts の 1.45）の根拠を
 * 「手実測コメント」から「機械検算」に変えるための道具（W8）。
 * modelog design/font-metrics.mjs（2026-08-06 訂正版）の TS ポート。検算表 = modelog decisions.md §23。
 *
 * ---------------------------------------------------------------------------
 * 式（RN 0.85 の CustomLineHeightSpan.kt 実読で確定した正しい下限）
 * ---------------------------------------------------------------------------
 * RN Android の CustomLineHeightSpan は Paint のフォントメトリクス（ascent / descent）に対して
 * `additional = lineHeight − (ascent + descent)` を計算し、負のときは不足分を行の上下から
 * 半分ずつ削る。削られるのは「行間」ではなく字形を描ける領域で、Text は既定 overflow: hidden
 * なので、はみ出した濁点・半濁点・descender はそのまま消える。
 *
 * Paint が使う ascent/descent（A/D）と、字形が実際に占める高さ（usWin*）は別物。
 * 削れる余地は「A − winAscent」「D − winDescent」しかない:
 *
 *   required_em = max(A + D,  2·winAsc − A + D,  2·winDesc − D + A) / unitsPerEm
 *
 * - A / D は hhea の ascender / |descender|。ただし OS/2 fsSelection bit 7（USE_TYPO_METRICS）が
 *   立っていたら sTypoAscender / |sTypoDescender|（「typo メトリクスを行送りの正とせよ」という
 *   font 側の宣言そのもの）
 * - winAsc / winDesc は OS/2 の usWinAscent / usWinDescent（字形のバウンディングボックス）
 * - lineGap は入らない。RN が比較するのは Paint の ascent+descent だけで、lineGap は
 *   FontMetrics.leading という別フィールド（旧式 `(A+D+lineGap)/upm` の間違いの中身。
 *   旧式は安全側ですらない — Helvetica は win* が hhea を超え 1.000 → 1.418）
 * - A + D を max に残すのは、そこを割った瞬間に削りが始まるため
 */

import { readFileSync } from "node:fs";

/** OS/2 テーブル内のオフセット（version 0 でも 78 バイトあるので全 version で読める） */
const OS2 = {
  fsSelection: 62,
  sTypoAscender: 68,
  sTypoDescender: 70,
  usWinAscent: 74,
  usWinDescent: 76,
  minLength: 78,
} as const;

/** fsSelection bit 7。立っていたら「行送りは typo メトリクスを使え」という font 側の宣言 */
const USE_TYPO_METRICS = 0x80;

/** sfnt 1面の実測値（required は持たない — 計算は requiredRatioOfFace が一元で行う） */
export interface FaceMetrics {
  unitsPerEm: number;
  /** USE_TYPO_METRICS 選択済みの ascent（typo または hhea） */
  ascent: number;
  /** USE_TYPO_METRICS 選択済みの descent（絶対値） */
  descent: number;
  lineGap: number;
  winAscent: number | null;
  winDescent: number | null;
  useTypoMetrics: boolean;
  /** OS/2 が読めず win* 不明（甘い経路）。呼び出し側は安全を保証できない扱いにすること */
  fallback: boolean;
}

/**
 * 1面の必要行間比。fixture（生テーブル値）とテストがこの同じ関数で計算する —
 * 式を2箇所に写経すると「同じ事故に対して2つの真実」ができるため。
 */
export function requiredRatioOfFace(face: FaceMetrics): number {
  const natural = face.ascent + face.descent;
  if (face.fallback || face.winAscent == null || face.winDescent == null) {
    // win* を知りようがない場合は従来式へフォールバック。lineGap は本来この判定に入らないが、
    // 「削れる余地ゼロ」を仮定するしかなく、足すぶん安全側。lineGap は負値がありうるので
    // 自然行高 A+D を max で floor する
    return Math.max(natural, natural + face.lineGap) / face.unitsPerEm;
  }
  return (
    Math.max(
      natural,
      2 * face.winAscent - face.ascent + face.descent,
      2 * face.winDescent - face.descent + face.ascent,
    ) / face.unitsPerEm
  );
}

/** sfnt 1面ぶんのテーブルディレクトリを読む（base = ttc なら各 face のオフセット、単体なら 0） */
function readTables(buf: Buffer, base: number): Record<string, { offset: number; length: number }> {
  const numTables = buf.readUInt16BE(base + 4);
  const tables: Record<string, { offset: number; length: number }> = {};
  for (let i = 0; i < numTables; i++) {
    const p = base + 12 + i * 16;
    tables[buf.toString("ascii", p, p + 4)] = {
      offset: buf.readUInt32BE(p + 8),
      length: buf.readUInt32BE(p + 12),
    };
  }
  return tables;
}

function faceMetrics(buf: Buffer, base: number, path: string): FaceMetrics {
  const tables = readTables(buf, base);
  if (!tables.head || !tables.hhea) throw new Error(`head/hhea が無い: ${path}`);
  const unitsPerEm = buf.readUInt16BE(tables.head.offset + 18);
  const hheaAscender = buf.readInt16BE(tables.hhea.offset + 4);
  const hheaDescender = buf.readInt16BE(tables.hhea.offset + 6); // 負値で入っている
  const lineGap = buf.readInt16BE(tables.hhea.offset + 8);

  const os2 = tables["OS/2"];
  if (!os2 || os2.length < OS2.minLength || os2.offset + OS2.minLength > buf.length) {
    return {
      unitsPerEm,
      ascent: hheaAscender,
      descent: Math.abs(hheaDescender),
      lineGap,
      winAscent: null,
      winDescent: null,
      useTypoMetrics: false,
      fallback: true,
    };
  }

  const useTypoMetrics = (buf.readUInt16BE(os2.offset + OS2.fsSelection) & USE_TYPO_METRICS) !== 0;
  const ascent = useTypoMetrics ? buf.readInt16BE(os2.offset + OS2.sTypoAscender) : hheaAscender;
  const descent = Math.abs(
    useTypoMetrics ? buf.readInt16BE(os2.offset + OS2.sTypoDescender) : hheaDescender,
  );
  return {
    unitsPerEm,
    ascent,
    descent,
    lineGap,
    winAscent: buf.readUInt16BE(os2.offset + OS2.usWinAscent),
    winDescent: buf.readUInt16BE(os2.offset + OS2.usWinDescent),
    useTypoMetrics,
    fallback: false,
  };
}

/**
 * フォントファイルの全 face の実測値。
 * ttc（複数フォントの束）は全 face を走査する — 束の中の1面でも欠けたら事故なので、
 * 必要比率は呼び出し側が全 face の最大を採ること（fallback 面が混ざっていたら安全を保証できない）。
 */
export function fontMetrics(path: string): { faces: FaceMetrics[] } {
  const buf = readFileSync(path);
  const isCollection = buf.toString("ascii", 0, 4) === "ttcf";
  const offsets: number[] = [];
  if (isCollection) {
    const numFonts = buf.readUInt32BE(8);
    for (let i = 0; i < numFonts; i++) offsets.push(buf.readUInt32BE(12 + i * 4));
  } else {
    offsets.push(0);
  }
  return { faces: offsets.map((offset) => faceMetrics(buf, offset, path)) };
}
