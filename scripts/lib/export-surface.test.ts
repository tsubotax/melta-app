/**
 * export-surface.test — package.json の exports 各 subpath が公開する **export 名の全量**を
 * スナップショットで固定する（公開面の無断増減を検知する）。
 *
 * public-exports.test.ts は「契約集合 == 公開コンポーネント集合」を照合するが、
 * それはコンポーネントだけの話で、型・helper・定数がいつの間にか公開面に増えても（あるいは
 * 消えても）誰も落ちない。npm 利用者から見た公開面は subpath 単位なので、ここでは
 * `.` / `./icons` / `./safe-area` の 3 エントリを起点に barrel を再帰的に辿り、
 * 値 export と型 export の名前一覧を pin する。
 *
 * 検知したい事故:
 *   - 内部 helper を barrel に足して、意図せず npm 公開 API になる（後で消せない）
 *   - リファクタで export を落とし、利用者側の import が静かに壊れる
 *   - package.json の exports に subpath を足したのに公開面の棚卸しをしない
 *
 * RN component は node から import できないため、conformance.ts / public-exports.test.ts と
 * 同じく **ソースの静的スキャン**で収集する（実行時 import ではない）。
 *
 * 失敗したときは差分を読んで、意図した公開面の変更なら下の EXPECTED_SURFACE を更新する
 * （＝ 公開 API の変更を人がレビューしたという記録になる）。破壊的削除なら semver も見直す。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // scripts/lib
const root = resolve(here, "../..");
const srcRoot = resolve(root, "src");

// --- package.json exports → ソース起点の対応 ---

/**
 * ソース起点を持つ subpath（= ビルド生成物 lib/ が src/ から作られるエントリ）。
 * `./eslint-plugin` などの非 src エントリは対象外（下のキー集合テストで漏れを検知する）。
 */
const SOURCE_ENTRIES: Record<string, string> = {
  ".": "index.ts",
  "./icons": "icons/index.ts",
  "./safe-area": "safe-area/index.ts",
};

/** src 由来ではないため export 名の snapshot を取らない subpath。 */
const NON_SOURCE_ENTRIES = ["./eslint-plugin", "./eslint-rules/melta.mjs", "./package.json"];

// --- 静的スキャナ ---

/** 行コメント / ブロックコメントを落とす（コメント中の `export` を拾わないため）。 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * 相対 specifier を実ファイルへ解決する（.ts / .tsx / index）。解決できなければ null。
 *
 * src の相対 import は node16/nodenext の consumer 向けに `.js` 拡張子を明示している（W3）。
 * TypeScript の ESM 規約どおり `./x.js` は `./x.ts` を指すので、末尾の `.js` を落として探す。
 * 拡張子なしの旧形式も引き続き解決できるようにしておく（他スクリプト由来の呼び出し互換）。
 */
function resolveModule(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null; // 外部パッケージは公開面の走査対象外
  const base = resolve(dirname(fromFile), specifier.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

interface Surface {
  values: Set<string>;
  types: Set<string>;
}

/** `{ A, B as C, type D }` の中身 → 公開される名前（alias があれば alias 側）。 */
function parseSpecifiers(body: string): { name: string; isType: boolean }[] {
  return body
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const isType = /^type\s+/.test(entry);
      const rest = entry.replace(/^type\s+/, "");
      const asMatch = /^(\S+)\s+as\s+(\S+)$/.exec(rest);
      return { name: asMatch ? asMatch[2] : rest, isType };
    });
}

/**
 * 1 ファイルの export を収集する。`export *` は再帰的に辿る。
 *
 * **fail-closed**: 既知パターンのどれにも掛からない `export` 文を見つけたら throw する。
 * 正規表現スキャンは「知らない構文 = 黙って素通り」で壊れる（`export type * from` を
 * 取りこぼしても snapshot は緑のまま = このテストの主張が嘘になる）ため、
 * 未知構文は取りこぼしではなくエラーにして、パターン追加を強制する。
 */
function collectSurface(file: string, out: Surface, seen: Set<string>): Surface {
  if (seen.has(file)) return out;
  seen.add(file);
  const source = stripComments(readFileSync(file, "utf8"));
  /** 既知パターンが消費した `export` トークンの開始位置（fail-closed 検査用）。 */
  const consumed = new Set<number>();
  const track = (m: RegExpMatchArray) => {
    if (m.index != null) consumed.add(m.index);
  };

  // export type * from "./x"（対象の公開名すべてが型として再輸出される）
  for (const m of source.matchAll(/export\s+type\s*\*\s*from\s*["']([^"']+)["']/g)) {
    track(m);
    const target = resolveModule(file, m[1]);
    if (!target) continue;
    const sub = collectSurface(target, { values: new Set(), types: new Set() }, new Set(seen));
    for (const name of [...sub.values, ...sub.types]) out.types.add(name);
  }
  // export * as NS from "./x" / export type * as NS from "./x"（公開されるのは NS の1名だけ）
  for (const m of source.matchAll(
    /export\s+(type\s+)?\*\s*as\s+([A-Za-z0-9_$]+)\s*from\s*["'][^"']+["']/g,
  )) {
    track(m);
    (m[1] ? out.types : out.values).add(m[2]);
  }
  // export * from "./x"（再エクスポート元の公開面をそのまま引き継ぐ）
  for (const m of source.matchAll(/export\s*\*\s*from\s*["']([^"']+)["']/g)) {
    track(m);
    const target = resolveModule(file, m[1]);
    if (target) collectSurface(target, out, seen);
  }
  // export type { A, B } from "./x"
  for (const m of source.matchAll(/export\s+type\s*\{([^}]*)\}\s*from\s*["'][^"']+["']/g)) {
    track(m);
    for (const s of parseSpecifiers(m[1])) out.types.add(s.name);
  }
  // export { A, type B } from "./x" / export { A }
  for (const m of source.matchAll(/export\s*\{([^}]*)\}(?:\s*from\s*["'][^"']+["'])?/g)) {
    track(m);
    for (const s of parseSpecifiers(m[1])) (s.isType ? out.types : out.values).add(s.name);
  }
  // ローカル宣言の export
  for (const m of source.matchAll(
    /^export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|enum)\s+([A-Za-z0-9_$]+)/gm,
  )) {
    track(m);
    out.values.add(m[1]);
  }
  for (const m of source.matchAll(/^export\s+(?:declare\s+)?(?:interface|type)\s+([A-Za-z0-9_$]+)/gm)) {
    track(m);
    out.types.add(m[1]);
  }

  // fail-closed: 行頭の `export` で始まるのに、どのパターンにも消費されなかった文があれば
  // スキャナの知らない構文（export default / 新構文など）。黙って素通りさせない。
  for (const m of source.matchAll(/^export\b/gm)) {
    if (m.index != null && !consumed.has(m.index)) {
      const line = source.slice(m.index, source.indexOf("\n", m.index));
      throw new Error(
        `${file}: スキャナが解釈できない export 文があります（パターン追加が必要）: ${line.trim()}`,
      );
    }
  }
  return out;
}

function surfaceOf(relPath: string): { values: string[]; types: string[] } {
  const s = collectSurface(resolve(srcRoot, relPath), { values: new Set(), types: new Set() }, new Set());
  return { values: [...s.values].sort(), types: [...s.types].sort() };
}

// --- スナップショット ---

/**
 * 公開面の pin。**手で更新するもの**（生成物ではない）。
 * 増減したら「その名前を npm 公開 API にしてよいか」を人が判断してからここを直す。
 */
const EXPECTED_SURFACE: Record<string, { values: string[]; types: string[] }> = {
  ".": {
    values: [
      "ActionSheet",
      "Alert",
      "Avatar",
      "BottomSheet",
      "Button",
      "CONTRACTS",
      "Card",
      "Checkbox",
      "DEFAULT_MIN_LINE_HEIGHT_RATIO",
      "EmptyState",
      "Header",
      "Image",
      "Metric",
      "Modal",
      "Progress",
      "Radio",
      "Row",
      "Screen",
      "Skeleton",
      "Stack",
      "Surface",
      "Tag",
      "Text",
      "TextField",
      "ThemeProvider",
      "Toast",
      "Toggle",
      "clampLineHeight",
      "declaredModes",
      "defineTheme",
      "deriveColorScheme",
      "minLineHeightFor",
      "nativeTheme",
      "resolveLetterSpacing",
      "resolveMode",
      "supportedModes",
      "useTheme",
      "validateTheme",
    ],
    types: [
      "ColorSchemeCapability",
      "ContractId",
      "ContractShape",
      "ElevationKey",
      "ElevationStyle",
      "FontSizeEntry",
      "FontSizeKey",
      "FontWeightKey",
      "FontWeightValue",
      "NativeTheme",
      "PrimaryScale",
      "RadiusKey",
      "ResolvedCapabilities",
      "ResolvedNativeTheme",
      "SemanticColors",
      "ShadowStyle",
      "SizeOf",
      "SpacingKey",
      "StateOf",
      "StatusColors",
      "ThemeColor",
      "ThemeContextValue",
      "ThemeMode",
      "ThemeModeViolation",
      "ThemeMotion",
      "ThemeOptions",
      "ThemeTypography",
      "VariantOf",
    ],
  },
  "./icons": {
    values: ["GLYPHS", "ICON_NAMES", "Icon"],
    types: ["Glyph", "IconName"],
  },
  "./safe-area": {
    values: ["enableSafeAreaContext"],
    types: ["EnableSafeAreaContextOptions"],
  },
};

// --- テスト ---

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  exports: Record<string, unknown>;
};

test("package.json の exports subpath 集合が想定どおり（新 subpath の無断追加を検知）", () => {
  assert.deepEqual(
    Object.keys(pkg.exports).sort(),
    [...Object.keys(SOURCE_ENTRIES), ...NON_SOURCE_ENTRIES].sort(),
    "exports の subpath が増減している（増やしたなら公開面の snapshot 対象に入れるか判断する）",
  );
});

for (const [subpath, relPath] of Object.entries(SOURCE_ENTRIES)) {
  test(`公開 export 名の snapshot が一致: "melta-app${subpath === "." ? "" : subpath.slice(1)}"`, () => {
    assert.deepEqual(
      surfaceOf(relPath),
      EXPECTED_SURFACE[subpath],
      `${subpath} の公開面が変わっている（意図した変更なら EXPECTED_SURFACE を更新し、削除なら semver も見直す）`,
    );
  });
}

test("snapshot が空でない（スキャナが壊れて全部素通りする事故を防ぐ）", () => {
  // 正規表現スキャンは「何も拾えない」形で静かに壊れうる。件数の下限を張って fail-closed にする。
  for (const [subpath, expected] of Object.entries(EXPECTED_SURFACE)) {
    const actual = surfaceOf(SOURCE_ENTRIES[subpath]);
    assert.ok(
      actual.values.length > 0,
      `${subpath}: 値 export が 1 件も収集できていない（スキャナの故障を疑う）`,
    );
    assert.equal(actual.values.length, expected.values.length);
  }
});
