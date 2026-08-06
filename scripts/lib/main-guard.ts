/**
 * main-guard — 「このモジュールがエントリポイントとして直接実行されたか」の判定。
 *
 * codegen スクリプト（generate-contract-types / build-llms-txt）は import 時に副作用を
 * 起こさないよう main guard を持つが、素の `resolve(process.argv[1]) === fileURLToPath(...)`
 * 比較は **argv[1] が字句解決・import.meta.url が実体パス**になりうるため、symlink 経由の
 * 実行で不一致 → codegen が黙って no-op になる（CI の diff-zero 検査は「生成されない」を
 * 検出できない）。両辺を realpath で実体に揃えてから比較する。
 */

import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** `isMainModule(import.meta.url)` で呼ぶ。判定不能（argv[1] 不在・パス解決失敗）は false。 */
export function isMainModule(moduleUrl: string): boolean {
  if (process.argv[1] == null) return false;
  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}
