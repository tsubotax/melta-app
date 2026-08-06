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

import { createHash } from "node:crypto";
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
 * 1面の必要行間の分子（font unit の整数）。fixture（生テーブル値）とテスト・抽出 CLI が
 * この同じ関数で計算する — 式を2箇所に写経すると「同じ事故に対して2つの真実」ができるため。
 * 比率にせず整数のまま返すのは、切り上げ判定を浮動小数点に触れさせないため（下記 ceil2）。
 */
export function requiredNumeratorOfFace(face: FaceMetrics): number {
  const natural = face.ascent + face.descent;
  if (face.fallback || face.winAscent == null || face.winDescent == null) {
    // win* を知りようがない場合は従来式へフォールバック。lineGap は本来この判定に入らないが、
    // 「削れる余地ゼロ」を仮定するしかなく、足すぶん安全側。lineGap は負値がありうるので
    // 自然行高 A+D を max で floor する
    return Math.max(natural, natural + face.lineGap);
  }
  return Math.max(
    natural,
    2 * face.winAscent - face.ascent + face.descent,
    2 * face.winDescent - face.descent + face.ascent,
  );
}

/** 1面の必要行間比（表示・比較用の float）。 */
export function requiredRatioOfFace(face: FaceMetrics): number {
  return requiredNumeratorOfFace(face) / face.unitsPerEm;
}

/**
 * 必要行間比の小数第2位切り上げを**整数演算だけ**で求める。
 * `Math.ceil(ratio * 100) / 100` は浮動小数点誤差で、数学的にちょうど2桁の値
 * （例: 1100/1000 = 1.10）を1段余分に切り上げうる（Codex レビュー 2026-08-06）。
 * 分子・unitsPerEm とも整数なので `ceil(n·100 / upm) = floor((n·100 + upm − 1) / upm)` が厳密。
 */
export function requiredRatioCeil2OfFace(face: FaceMetrics): number {
  const n = requiredNumeratorOfFace(face);
  return Math.floor((n * 100 + face.unitsPerEm - 1) / face.unitsPerEm) / 100;
}

/**
 * fixture の整合ハッシュ。抽出 CLI が書き、テストが再計算して照合する（正規形をここに一元化）。
 * 手編集や merge 破損で faces / source が動くと一致しなくなる（改竄の完全防止ではない —
 * フォント実物を CI に持ち込まない以上、悪意ある編集は原理的に止められない。
 * 目的は「extractor を通さず値だけ書き換えた」事故・カジュアルな改変の検出）。
 * extractedAt を含めないのは、同じフォントの再抽出でハッシュが変わらないようにするため。
 */
export function fixtureIntegrity(
  source: { file: string; sha256: string; url: string },
  faces: FaceMetrics[],
): string {
  const canonical = JSON.stringify({
    source: { file: source.file, sha256: source.sha256, url: source.url },
    faces: faces.map((f) => ({
      unitsPerEm: f.unitsPerEm,
      ascent: f.ascent,
      descent: f.descent,
      lineGap: f.lineGap,
      winAscent: f.winAscent,
      winDescent: f.winDescent,
      useTypoMetrics: f.useTypoMetrics,
      fallback: f.fallback,
    })),
  });
  return createHash("sha256").update(canonical).digest("hex");
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
