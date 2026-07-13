/**
 * check-patterns-sync — docs/*.md のコード fence ↔ 実ソースの #region snippet を verbatim 照合する
 * （設計書 designer-1 §4.3。check-drift.ts の検査として統合され、①実コード ↔ ②patterns.md の
 *  drift を構造的に検出する）。
 *
 * 仕組み（マーカー参照方式）:
 * - md 側: fence の直前行に `<!-- snippet:<id> source=<repo相対パス> -->`、直後に ```tsx fence
 * - ソース側: `// #region snippet:<id>` 〜 `// #endregion`
 *   （JSX 内は `{/* #region snippet:<id> *\/}` 〜 `{/* #endregion *\/}`）。マーカー行自体は抜粋に含めない
 * - 照合: 両ブロックを「非空行の共通最小インデントで dedent + 各行 trimEnd」してから厳密一致
 *
 * drift 扱いにするエッジ（fail-closed: 「検査対象が消えた」を成功にしない）:
 * - docs/ が存在しない / docs/*.md に snippet マーカーが 1 件も無い
 * - md が参照する id / source が実在しない
 * - fence 言語が tsx でない / マーカー直後に fence が無い / fence が閉じない
 * - fence の中身が実質 0 行（空 fence）/ region の中身が実質 0 行（空 region）
 * - docs/*.md 全体で同じ id のマーカーが重複
 * - 同一ソース内で同じ id の #region が重複 / #region が #endregion で閉じない
 * - 逆向き網羅: example/ と src/ 配下の .ts/.tsx に存在する #region snippet が
 *   docs/*.md のどの fence からも参照されていない（md 側から fence を消しても検出する）
 *
 * 修正の向き: **実装が正**。drift したら docs 側の fence を実コードに合わせて更新する
 * （--write での自動 heal は Phase 1 ではしない）。
 *
 * 使い方:
 *   tsx scripts/lib/check-patterns-sync.ts   # 単体実行（drift があれば exit 1）
 *   import { checkPatternsSync } from "./lib/check-patterns-sync.js";  // check-drift.ts から
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface SyncReporter {
  drift: (msg: string) => void;
  ok: (msg: string) => void;
}

/** md 内の 1 スニペット参照（マーカー + 直後の fence）。 */
interface SnippetRef {
  id: string;
  /** repo 相対パス（マーカーの source=）。 */
  source: string;
  /** fence の言語（```tsx → "tsx"）。fence が見つからなければ null。 */
  lang: string | null;
  /** fence の中身（マーカー・fence 行は含まない）。 */
  lines: string[];
  /** マーカー行の行番号（1-based、エラー表示用）。 */
  markerLine: number;
  /** fence が閉じられているか。 */
  closed: boolean;
}

const MARKER_RE = /^<!--\s*snippet:([A-Za-z0-9_-]+)\s+source=(\S+)\s*-->\s*$/;
const FENCE_OPEN_RE = /^```([A-Za-z0-9_-]*)\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;
const REGION_RE = /#region snippet:([A-Za-z0-9_-]+)/;
const ENDREGION_RE = /#endregion/;

/** 逆向き網羅で #region を走査する repo 直下ディレクトリ。 */
const SOURCE_SCAN_DIRS = ["example", "src"];
/** 走査対象の拡張子。 */
const SOURCE_EXT_RE = /\.(ts|tsx)$/;
/** 走査でスキップするディレクトリ（生成物・依存・隠しディレクトリ）。 */
const SKIP_DIR_RE = /^(node_modules|dist|build|coverage)$|^\./;

/** ブロックが実質 0 行（空 or 空白行のみ）かどうか。 */
function isBlankBlock(lines: string[]): boolean {
  return lines.every((line) => line.trim() === "");
}

/** md マーカーの source= を cache キーに正規化する（先頭の ./ を落とす）。 */
function normalizeSourceKey(source: string): string {
  return source.replace(/^\.\//, "");
}

/** SOURCE_SCAN_DIRS 配下の .ts/.tsx を再帰列挙する（repo 相対・posix 区切り・ソート済み）。 */
function listSourceFiles(root: string): string[] {
  const results: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIR_RE.test(entry.name)) walk(full);
      } else if (entry.isFile() && SOURCE_EXT_RE.test(entry.name)) {
        results.push(relative(root, full).split("\\").join("/"));
      }
    }
  };
  for (const dirName of SOURCE_SCAN_DIRS) {
    const dir = resolve(root, dirName);
    if (existsSync(dir)) walk(dir);
  }
  return results.sort();
}

/** 非空行の共通最小インデントで dedent し、各行を trimEnd する（照合用正規化）。 */
function normalize(lines: string[]): string[] {
  const nonEmpty = lines.filter((line) => line.trim() !== "");
  const minIndent =
    nonEmpty.length === 0
      ? 0
      : Math.min(...nonEmpty.map((line) => /^[ \t]*/.exec(line)![0].length));
  return lines.map((line) => (line.trim() === "" ? "" : line.slice(minIndent).trimEnd()));
}

/** md テキストからスニペット参照（マーカー + fence）を抽出する。 */
function parseSnippetRefs(mdText: string): SnippetRef[] {
  const lines = mdText.split("\n");
  const refs: SnippetRef[] = [];
  for (let i = 0; i < lines.length; i++) {
    const marker = MARKER_RE.exec(lines[i]);
    if (!marker) continue;
    const ref: SnippetRef = {
      id: marker[1],
      source: marker[2],
      lang: null,
      lines: [],
      markerLine: i + 1,
      closed: false,
    };
    // マーカーの直後（空行は許容）に fence 開始があること
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === "") j++;
    const fence = j < lines.length ? FENCE_OPEN_RE.exec(lines[j]) : null;
    if (fence) {
      ref.lang = fence[1] === "" ? null : fence[1];
      for (let k = j + 1; k < lines.length; k++) {
        if (FENCE_CLOSE_RE.test(lines[k])) {
          ref.closed = true;
          i = k; // fence 内は再走査しない
          break;
        }
        ref.lines.push(lines[k]);
      }
    }
    refs.push(ref);
  }
  return refs;
}

interface RegionMap {
  /** id → region 中身（マーカー行を除く）。 */
  regions: Map<string, string[]>;
  /** ソース側マーカーの構造エラー（id 重複・未クローズ）。 */
  errors: string[];
}

/** ソースファイルから `#region snippet:<id>` 〜 `#endregion` の区間を抽出する。 */
function parseRegions(sourceText: string): RegionMap {
  const lines = sourceText.split("\n");
  const regions = new Map<string, string[]>();
  const errors: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const start = REGION_RE.exec(lines[i]);
    if (!start) continue;
    const id = start[1];
    const body: string[] = [];
    let closedAt = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (ENDREGION_RE.test(lines[j]) && !REGION_RE.test(lines[j])) {
        closedAt = j;
        break;
      }
      body.push(lines[j]);
    }
    if (closedAt === -1) {
      errors.push(`#region snippet:${id}（${i + 1}行目）が #endregion で閉じていない`);
      break;
    }
    if (regions.has(id)) {
      errors.push(`#region snippet:${id} が重複している（同一 id の region は 1 つまで）`);
    } else {
      regions.set(id, body);
    }
    i = closedAt;
  }
  return { regions, errors };
}

/**
 * docs/*.md の snippet マーカーを走査し、参照先ソースの #region と verbatim 照合する。
 * drift / ok の出力は reporter に委譲する（check-drift.ts の drift()/ok() をそのまま渡せる）。
 */
export function checkPatternsSync(root: string, reporter: SyncReporter): void {
  const docsDir = resolve(root, "docs");
  if (!existsSync(docsDir)) {
    // fail-closed: docs/ ごと消えたら「検査対象なし」ではなく drift（本リポには docs/patterns.md がある前提）
    reporter.drift("docs/ が存在しない（スニペット検査対象が消失。docs/patterns.md を復元すること）");
    return;
  }
  const mdFiles = readdirSync(docsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  // ソースは複数 md から参照されうるのでパース結果をキャッシュ
  const regionCache = new Map<string, RegionMap | null>();
  const reportedSourceErrors = new Set<string>();
  // md 内 id 重複検出（docs/*.md 全体で id は一意）
  const seenIds = new Map<string, string>();
  // 逆向き網羅用: md が参照した (source, id) の組
  const referencedPairs = new Set<string>();
  let totalRefs = 0;

  for (const mdFile of mdFiles) {
    const mdPath = join(docsDir, mdFile);
    const refs = parseSnippetRefs(readFileSync(mdPath, "utf8"));
    for (const ref of refs) {
      totalRefs++;
      const label = `docs/${mdFile}#${ref.id}`;
      const sourceKey = normalizeSourceKey(ref.source);
      // 逆向き網羅の参照記録（fence 側に別の drift があっても「参照の意図」はある）
      referencedPairs.add(`${sourceKey}#${ref.id}`);

      // md 内の同一 id 重複 → drift
      const firstSeen = seenIds.get(ref.id);
      if (firstSeen !== undefined) {
        reporter.drift(
          `${label}（${ref.markerLine}行目）: id が ${firstSeen} と重複している（docs/*.md 全体で id は一意にすること）`,
        );
        continue;
      }
      seenIds.set(ref.id, `${label}（${ref.markerLine}行目）`);

      if (ref.lang === null && !ref.closed) {
        // fence 自体が見つからなかったケース（マーカーの直後に ``` が無い）
        reporter.drift(
          `${label}（${ref.markerLine}行目）: マーカー直後に \`\`\`tsx fence が無い`,
        );
        continue;
      }
      if (ref.lang !== "tsx") {
        reporter.drift(
          `${label}（${ref.markerLine}行目）: fence 言語が tsx でない（\`\`\`${ref.lang ?? ""}）`,
        );
        continue;
      }
      if (!ref.closed) {
        reporter.drift(`${label}（${ref.markerLine}行目）: fence が閉じていない`);
        continue;
      }

      // 参照先ソースの region を解決
      if (!regionCache.has(sourceKey)) {
        const sourcePath = resolve(root, sourceKey);
        regionCache.set(
          sourceKey,
          existsSync(sourcePath) ? parseRegions(readFileSync(sourcePath, "utf8")) : null,
        );
      }
      const regionMap = regionCache.get(sourceKey)!;
      if (regionMap === null) {
        reporter.drift(`${label}: 参照先ソース ${ref.source} が存在しない`);
        continue;
      }
      if (!reportedSourceErrors.has(sourceKey)) {
        reportedSourceErrors.add(sourceKey);
        for (const err of regionMap.errors) reporter.drift(`${ref.source}: ${err}`);
      }
      const regionBody = regionMap.regions.get(ref.id);
      if (regionBody === undefined) {
        reporter.drift(`${label}: ${ref.source} に #region snippet:${ref.id} が無い`);
        continue;
      }

      // fail-closed: 実質 0 行の fence / region は「0 行同士の一致」で成功にしない
      const blankFence = isBlankBlock(ref.lines);
      const blankRegion = isBlankBlock(regionBody);
      if (blankFence) {
        reporter.drift(`${label}（${ref.markerLine}行目）: fence の中身が空（実質 0 行）`);
      }
      if (blankRegion) {
        reporter.drift(`${ref.source}#${ref.id}: #region の中身が空（実質 0 行）`);
      }
      if (blankFence || blankRegion) continue;

      // dedent + trimEnd 後の厳密一致
      const mdNorm = normalize(ref.lines);
      const srcNorm = normalize(regionBody);
      if (mdNorm.length === srcNorm.length && mdNorm.every((line, i) => line === srcNorm[i])) {
        reporter.ok(`${label} ↔ ${ref.source} 一致（${srcNorm.length}行）`);
        continue;
      }
      const diffAt = mdNorm.findIndex((line, i) => line !== srcNorm[i]);
      const at = diffAt === -1 ? Math.min(mdNorm.length, srcNorm.length) : diffAt;
      reporter.drift(
        `${label} が ${ref.source} と不一致（実装が正。docs 側 fence を実コードに合わせて更新する）\n` +
          `        md  ${at + 1}行目: ${JSON.stringify(mdNorm[at] ?? "<行なし>")}\n` +
          `        src ${at + 1}行目: ${JSON.stringify(srcNorm[at] ?? "<行なし>")}`,
      );
    }
  }

  if (totalRefs === 0) {
    // fail-closed: マーカー全削除（or docs/*.md 全削除）を成功にしない
    reporter.drift(
      "docs/*.md に snippet マーカーが 1 件も無い（検査対象が消失。マーカーを復元すること）",
    );
  }

  // --- 逆向き網羅: ソース側の #region がすべて docs/*.md の fence から参照されていること ---
  // （md からマーカー + fence を消しても、ソース側の region が残っていれば検出する）
  let totalRegions = 0;
  let unreferenced = 0;
  for (const relPath of listSourceFiles(root)) {
    const text = readFileSync(resolve(root, relPath), "utf8");
    if (!text.includes("#region snippet:")) continue;
    if (!regionCache.has(relPath)) {
      regionCache.set(relPath, parseRegions(text));
    }
    const regionMap = regionCache.get(relPath)!;
    if (regionMap === null) continue; // md 側で「存在しない」判定済みのパスは走査対象外（実在するので通常来ない）
    if (!reportedSourceErrors.has(relPath)) {
      reportedSourceErrors.add(relPath);
      for (const err of regionMap.errors) reporter.drift(`${relPath}: ${err}`);
    }
    for (const id of regionMap.regions.keys()) {
      totalRegions++;
      if (!referencedPairs.has(`${relPath}#${id}`)) {
        unreferenced++;
        reporter.drift(
          `${relPath}#${id}: docs/*.md のどの fence からも参照されていない（md 側のマーカー + fence が消えていないか確認すること）`,
        );
      }
    }
  }
  if (totalRegions > 0 && unreferenced === 0) {
    reporter.ok(`逆向き網羅 OK（ソース側 #region ${totalRegions} 件すべて docs から参照済み）`);
  }
}

// --- 単体実行（tsx scripts/lib/check-patterns-sync.ts）。import 時は副作用ゼロ ---

const isDirectRun =
  process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  let drifts = 0;
  console.log("\n=== docs スニペット同期（単体実行） ===\n");
  checkPatternsSync(root, {
    drift: (msg) => {
      console.error(`  ⚠️  DRIFT: ${msg}`);
      drifts++;
    },
    ok: (msg) => {
      console.log(`  ✓ ${msg}`);
    },
  });
  console.log("");
  if (drifts > 0) {
    console.error(`drift ${drifts} 件。docs のスニペットを実コードに追従させること。`);
    process.exit(1);
  }
  console.log("スニペット同期 OK ✨");
}
