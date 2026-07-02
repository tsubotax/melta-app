/**
 * public-exports.test — 公開 API（src/index.ts + barrel）と契約の同期を機械照合する（公開 P2）。
 *
 * 「appStatus=implemented の契約集合 == npm 利用者が import できるコンポーネント集合」を担保する。
 * RN component は node で import できないため、barrel をソースとして静的スキャンする
 * （conformance.ts の __contract スキャンと同じ流儀）。
 *
 * 検知したい事故:
 *   - 実装を足したのに export し忘れる（利用者に届かない implemented）
 *   - 契約に無い実装を export してしまう（allowlist 外の API 露出 = 公開面の無断拡張）
 *   - src/index.ts のエントリ構成（theme / primitives / components / CONTRACTS）が崩れる
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MVP_CONTRACT_IDS, toComponentName } from "./conformance.js";

const here = dirname(fileURLToPath(import.meta.url)); // scripts/lib
const srcRoot = resolve(here, "../../src");

/** barrel から `export { X } from "./X"` の named export を収集する。 */
function listBarrelExports(relPath: string): string[] {
  const source = readFileSync(resolve(srcRoot, relPath), "utf8");
  return [...source.matchAll(/^export \{ (\w+) \} from/gm)].map((m) => m[1]);
}

test("公開コンポーネント集合が MVP allowlist（implemented 契約）と一致", () => {
  const exported = [
    ...listBarrelExports("primitives/index.ts"),
    ...listBarrelExports("components/index.ts"),
  ].sort();
  const expected = MVP_CONTRACT_IDS.map(toComponentName).sort();
  assert.deepEqual(
    exported,
    expected,
    "barrel の export と implemented 契約がズレている（export し忘れ or allowlist 外の露出）"
  );
});

test("src/index.ts が theme / primitives / components / CONTRACTS を公開している", () => {
  const entry = readFileSync(resolve(srcRoot, "index.ts"), "utf8");
  for (const barrel of ['"./theme"', '"./primitives"', '"./components"']) {
    assert.match(entry, new RegExp(`export \\* from ${barrel}`), `${barrel} の re-export が無い`);
  }
  assert.match(entry, /\bCONTRACTS\b/, "契約メタ CONTRACTS が公開されていない");
});

test("theme エントリが ThemeProvider / useTheme / nativeTheme を公開している", () => {
  const theme = readFileSync(resolve(srcRoot, "theme/index.ts"), "utf8");
  for (const name of ["ThemeProvider", "useTheme", "nativeTheme"]) {
    assert.match(theme, new RegExp(`\\b${name}\\b`), `theme/index.ts が ${name} を export していない`);
  }
});
