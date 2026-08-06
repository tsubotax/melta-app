/**
 * extract-font-metrics — 参照フォントの生メトリクスを fixture へ抽出する CLI（W8）。
 *
 * melta はフォントを同梱しない（system フォント運用）ため、DEFAULT_MIN_LINE_HEIGHT_RATIO の
 * 根拠フォント（Android system の日本語フォント Noto Sans CJK JP）の実物を CI に持ち込めない。
 * 代わりに、このスクリプトで一度だけ実ファイルから生テーブル値を抽出し、取得元と sha256 を
 * 添えて scripts/lib/fixtures/reference-font-metrics.json に固定する。
 * CI（line-height-floor.test.ts）は fixture の生値から式で必要比率を毎回再計算する —
 * ドキュメントに書いた数字は根拠にしない（modelog decisions §23 の規律）。
 *
 * 参照フォントを差し替える手順:
 *   1. 公式配布元からフォントファイルを取得（リポジトリには入れない）
 *   2. npx tsx scripts/extract-font-metrics.ts <font-file> --url <取得元URL>
 *   3. line-height-floor.test.ts が赤くなったら DEFAULT_MIN_LINE_HEIGHT_RATIO を追随させる
 *      （= フォント変更が既定値の再判断を強制する。これがこの仕組みの目的）
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fontMetrics, requiredRatioOfFace } from "./lib/font-metrics.js";

const args = process.argv.slice(2);
const urlIndex = args.indexOf("--url");
const sourceUrl = urlIndex >= 0 ? args[urlIndex + 1] : null;
const fontPath = args.find((a) => !a.startsWith("--") && a !== sourceUrl);

if (!fontPath || !sourceUrl) {
  console.error(
    "usage: npx tsx scripts/extract-font-metrics.ts <font-file> --url <取得元URL>\n" +
      "  取得元 URL は provenance として fixture に残る（必須）",
  );
  process.exit(1);
}

const { faces } = fontMetrics(fontPath);
const sha256 = createHash("sha256").update(readFileSync(fontPath)).digest("hex");
const required = Math.max(...faces.map(requiredRatioOfFace));
const hasFallback = faces.some((f) => f.fallback);

const fixture = {
  $comment:
    "生成物。手で編集しない — scripts/extract-font-metrics.ts で実フォントから再抽出する。" +
    "required は fixture に持たない（テストが scripts/lib/font-metrics.ts の式で毎回再計算する）",
  source: {
    file: basename(fontPath),
    sha256,
    url: sourceUrl,
    extractedAt: new Date().toISOString().slice(0, 10),
  },
  faces,
};

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  "lib",
  "fixtures",
  "reference-font-metrics.json",
);
writeFileSync(out, `${JSON.stringify(fixture, null, 2)}\n`);

console.log(`抽出完了: ${basename(fontPath)}（${faces.length} face）→ ${out}`);
console.log(`  sha256: ${sha256}`);
console.log(`  必要行間比（全 face の最大）: ${required.toFixed(4)}${hasFallback ? " ⚠️ fallback 面あり（OS/2 不読 = 安全を保証できない）" : ""}`);
