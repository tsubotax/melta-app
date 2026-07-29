/**
 * check-build-fresh — lib/（bob build 出力）が src/ より古くないかを検査する。
 *
 * なぜ要るか: npm の `prepare` は publish 時に自動で走る**はず**だが、
 * `ignore-scripts=true`（インストール時スクリプトのセキュリティ対策として ~/.npmrc に
 * 置かれることがある）が有効な環境では **lifecycle script が一切走らない**。
 * この状態で `npm publish` すると、src の修正が lib に入らないまま出荷される
 * ——しかも typecheck / lint / test は src を見るので**全部緑のまま**通る。
 * 実際に 0.4.1 でこれを踏んだ（src だけ直り lib は前版のまま公開された）。
 *
 * 対策は2層:
 *   1. `npm run release` が build を明示的に先頭に置く（npm run は ignore-scripts の対象外）
 *   2. この検査が「それでも古い lib で出そうとしていないか」を最後に見る
 *
 * 判定は mtime。lib の最古のファイルが src の最新より古ければ stale とみなす。
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** ディレクトリ配下の対象ファイルを再帰列挙し、mtime の最大/最小を返す。 */
function scan(dir: string, exts: string[]): { newest: number; oldest: number; count: number } {
  let newest = 0;
  let oldest = Number.POSITIVE_INFINITY;
  let count = 0;

  function walk(current: string): void {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!exts.some((ext) => entry.name.endsWith(ext))) continue;
      // テストは lib に出力されないので比較対象から外す
      if (entry.name.includes(".test.")) continue;
      if (full.includes(`${"__tests__"}`)) continue;
      const { mtimeMs } = statSync(full);
      newest = Math.max(newest, mtimeMs);
      oldest = Math.min(oldest, mtimeMs);
      count++;
    }
  }

  walk(dir);
  return { newest, oldest, count };
}

const libDir = join(root, "lib");
if (!existsSync(libDir)) {
  console.error("✖ lib/ が無い。`npm run build` を先に走らせること。");
  process.exit(1);
}

/** src の相対パス（拡張子なし）の集合。lib 側に対応物があるかの照合に使う。 */
function sourceStems(dir: string, base = dir, acc = new Set<string>()): Set<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      sourceStems(full, base, acc);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (entry.name.includes(".test.")) continue;
    acc.add(full.slice(base.length + 1).replace(/\.tsx?$/, ""));
  }
  return acc;
}

const src = scan(join(root, "src"), [".ts", ".tsx"]);
const lib = scan(libDir, [".js", ".d.ts"]);

// mtime だけでは「src を消したのに lib に残っている」「一部だけ出力されていない」を見逃す。
// bob は lib を clean してから作るので孤児は出ないが、出力欠けはどこも見ていない。
const stems = sourceStems(join(root, "src"));
const missing = [...stems].filter(
  (stem) =>
    !existsSync(join(libDir, "module", `${stem}.js`)) ||
    !existsSync(join(libDir, "typescript", "src", `${stem}.d.ts`)),
);
if (missing.length > 0) {
  console.error(
    `✖ src にあるのに lib に出力が無いモジュールが ${missing.length} 件:\n` +
      missing.map((stem) => `    ${stem}`).join("\n") +
      "\n  `npm run build` を走らせてから publish すること。",
  );
  process.exit(1);
}

if (lib.count === 0) {
  console.error("✖ lib/ に出力が無い。`npm run build` を先に走らせること。");
  process.exit(1);
}

if (lib.oldest < src.newest) {
  const behind = Math.round((src.newest - lib.oldest) / 1000);
  console.error(
    `✖ lib/ が src/ より古い（最大 ${behind} 秒）。src の変更が公開物に入っていない。\n` +
      "  `npm run build` を走らせてから publish すること。\n" +
      "  （ignore-scripts=true の環境では npm publish の prepare が走らない）",
  );
  process.exit(1);
}

console.log(`✓ lib/ は src/ より新しい（src ${src.count} ファイル / lib ${lib.count} ファイル）`);
