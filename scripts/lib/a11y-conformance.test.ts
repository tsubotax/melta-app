/**
 * a11y-conformance.test — 契約の a11y.role と実装の accessibilityRole を機械照合する。
 *
 * **なぜ要るか（実際に事故った）**: `card.contract.json` は `a11y.role: "article"` かつ
 * `states` に `focus-within` を持つ ＝ 「中に操作可能物を含むコンテナ」としてモデル化されている。
 * ところが RN 実装は `action` / `link` を `accessibilityRole="button"` の Pressable にした。
 * その結果 web では melta の Button を内包すると `<button>` の入れ子になり hydration error、
 * production では minified React error #418 に潰れて原因が読めない状態が続いた。
 *
 * この乖離が長期間見つからなかったのは、**conformance が styleRefs しか照合しておらず
 * a11y 層を誰も見ていなかった**から。値（色・余白）はズレたら気づくが、role は
 * 目で見えないのでテストが見ていなければ永久に気づけない。
 *
 * ## 照合の作り
 *
 * - 契約の `a11y.role` は web の ARIA 語彙（`"button (trigger)"` のような自由文）で書かれ、
 *   RN の `accessibilityRole` とは語彙が違う。自由文の解析器を作ると解析器自身が
 *   バグの温床になるので、**id ごとの語彙変換表を手で持ち、機械は表と実装のズレを見る**。
 *   ただし表が実装に合わせて書き換えられる抜け道にならないよう、表は
 *   **契約の `a11y.role` 文字列を控えとして持ち、契約と一致しなくなったら落ちる**。
 * - 実装の走査は **TypeScript の AST**。正規表現だと条件式（`role === "heading" ? "header" : undefined`）を
 *   拾えず、それが原因でこのテスト自身が一度嘘の green を出した（`text` の許可集合が空なのに
 *   実装は `header` を出せる状態を見逃した）。**解析できない式は無視せず fail させる。**
 * - 双方向に見る: 名乗ってはいけない role を名乗っていないか（過剰）と、
 *   契約が要求する role が実装から消えていないか（欠落）の両方。
 *
 * ## この層で保証できないこと（意識的な限界）
 *
 * 見ているのは **ファイル単位の「名乗られている role の集合」**であって、分岐ごとの保証ではない。
 * 例: Card は非インタラクティブ分岐とインタラクティブ分岐の両方に role="article" を付けているが、
 * 片方だけ消しても集合は変わらないのでここでは検出できない（実測で確認済み）。
 * variant ごと・条件ごと・子コンポーネント経由の保証は RN render tree のテストの担当。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { MVP_CONTRACT_IDS, toComponentName, resolveContractsDir } from "./conformance.js";

const here = dirname(fileURLToPath(import.meta.url)); // scripts/lib
const srcRoot = resolve(here, "../../src");

interface RoleRule {
  /** 契約の a11y.role の控え。契約が変わったら落ちる（表が実装に追従する抜け道を塞ぐ）。 */
  contractRole: string;
  /** RN 実装が `accessibilityRole` で名乗ってよい値。空 = 名乗ってはいけない。 */
  allowed: string[];
  /** `accessibilityRole` から消えたら困る値（契約が要求している能力）。allowed の部分集合。 */
  required: string[];
  /**
   * W3C 準拠の `role` prop（`accessibilityRole` とは別系統）で名乗ってよい値。
   * react-native-web はこれを実要素に変換する（role="article" → `<article>`）。
   */
  w3cAllowed?: string[];
  /** `role` prop から消えたら困る値。 */
  w3cRequired?: string[];
  note: string;
}

/**
 * contract id → RN 実装の role 規則。
 *
 * `allowed` が空なのは、契約の role が RN に対応物を持たない（`article`）か、
 * 意味論的にコンテナ（`none`）か、RN の要素が既定で持つ（`textbox` → TextInput）場合。
 * ファイル単位の走査なので、内部の部品（ダイアログの閉じるボタン等）が持つ role も含める。
 */
const ROLE_RULES: Record<string, RoleRule> = {
  text: {
    contractRole: "text",
    allowed: ["header"],
    required: ["header"],
    note: '契約 a11y.required が「見出しは heading role（RN: accessibilityRole="header"）を付与する」と要求している',
  },
  button: { contractRole: "button", allowed: ["button"], required: ["button"], note: "契約 role と同じ" },
  tag: {
    contractRole: "button (removable)",
    allowed: ["button"],
    required: ["button"],
    note: "削除可能な場合のみ操作要素",
  },
  card: {
    contractRole: "article",
    allowed: [],
    required: [],
    w3cAllowed: ["article"],
    w3cRequired: ["article"],
    note:
      "accessibilityRole に article は無いが、W3C 準拠の role prop は article を受ける" +
      "（RNW は <article> 要素に変換する）。面自体を操作要素にしないのが contract 2.1.0 の要求",
  },
  image: {
    contractRole: "image",
    allowed: ["image"],
    required: [],
    note: "RN の Image は暗黙に image role を持つので宣言は不要。契約 a11y.required が求めているのは accessibilityLabel の付与（別層の担当）",
  },
  surface: { contractRole: "none", allowed: [], required: [], note: "契約 role: none" },
  skeleton: {
    contractRole: "status",
    allowed: [],
    required: [],
    note: "RN に status role は無い。accessibilityLiveRegion で表現する",
  },
  "empty-state": { contractRole: "none", allowed: [], required: [], note: "契約 role: none" },
  metric: { contractRole: "text", allowed: [], required: [], note: "RN の Text は既定で読み上げられる" },
  stack: { contractRole: "none", allowed: [], required: [], note: "契約 role: none" },
  row: { contractRole: "none", allowed: [], required: [], note: "契約 role: none" },
  screen: { contractRole: "none", allowed: [], required: [], note: "契約 role: none" },
  header: {
    contractRole: "banner",
    allowed: [],
    required: [],
    note:
      "RN に banner は無い。accessibilityRole='header' は RN では『見出し』の意味なので、" +
      "ヘッダー帯そのものに付けると帯全体が見出しとして読まれる。契約 a11y.required の" +
      "「title は heading として読み上げる」は Header.tsx が melta の Text role='heading' に" +
      "委譲して満たしており、role は子コンポーネント内で付く ＝ ファイル単位の静的走査では見えない" +
      "（render tree のテストの担当）",
  },
  icon: { contractRole: "img", allowed: ["image"], required: ["image"], note: "img の RN 対応語は image" },
  avatar: { contractRole: "img", allowed: ["image"], required: ["image"], note: "img の RN 対応語は image" },
  textfield: {
    contractRole: "textbox",
    allowed: [],
    required: [],
    note: "RN の TextInput が既定で持つので明示不要",
  },
  toggle: { contractRole: "switch", allowed: ["switch"], required: ["switch"], note: "契約 role と同じ" },
  checkbox: {
    contractRole: 'checkbox (native <input type="checkbox">)',
    allowed: ["checkbox"],
    required: ["checkbox"],
    note: "契約 role と同じ",
  },
  radio: {
    contractRole: 'radio (native <input type="radio">)',
    allowed: ["radio", "radiogroup"],
    required: ["radio", "radiogroup"],
    note: "group は RN の radiogroup",
  },
  alert: {
    contractRole: "alert (error/warning) / status (info/success)",
    allowed: ["alert", "button"],
    required: ["alert"],
    note: "status は RN に無く liveRegion で表現。button は閉じる操作",
  },
  toast: {
    contractRole: "status",
    allowed: ["button"],
    required: [],
    note: "status は RN に無く liveRegion で表現。button はアクション操作",
  },
  progress: {
    contractRole: "progressbar",
    allowed: ["progressbar"],
    required: ["progressbar"],
    note: "契約 role と同じ",
  },
  modal: {
    contractRole: "dialog",
    allowed: ["button", "header"],
    required: [],
    note: "RN に dialog role は無い。内部の閉じる操作と見出しのみ",
  },
  "action-sheet": {
    contractRole: "dialog",
    allowed: ["button"],
    required: ["button"],
    note: "RN に dialog role は無い。内部の選択肢と cancel",
  },
  "bottom-sheet": {
    contractRole: "dialog",
    allowed: ["button", "header"],
    required: [],
    note: "RN に dialog role は無い。内部の操作と見出しのみ",
  },
};

/**
 * 既知の乖離。**ここに載っているものは「まだ直っていない」ことの記録であって、承認ではない。**
 * 直したらこの表から消す。空になるのが目標。
 * `contractVersion` は再承認の強制装置 — 契約が改訂されたら例外の妥当性を必ず見直す。
 */
const KNOWN_DIVERGENCES: Record<string, { roles: string[]; contractVersion: string; reason: string }> = {
  // 空にできた。card の乖離は contract 2.1.0（カード面自体を操作要素にしない）と
  // Card.tsx の実装変更（role 除去 + primaryAction 必須化）が揃って解消した。
  // ここが空である状態を保つのが目標。
};

/** contract id → 実装ファイル。 */
function implementationFile(id: string): string {
  const name = toComponentName(id);
  const found = [
    join(srcRoot, "components", `${name}.tsx`),
    join(srcRoot, "primitives", `${name}.tsx`),
    join(srcRoot, "icons", `${name}.tsx`),
  ].find((path) => existsSync(path));
  assert.ok(found, `${id} の実装ファイルが見つからない（${name}.tsx）`);
  return found;
}

/**
 * `role` prop を検査してよい JSX 要素（RN の host component）。
 *
 * **タグ名で絞るのが要点。** melta 自身の `Text` は独自の `role` prop（"heading" 等）を
 * 持っており（Header.tsx / EmptyState.tsx が使う）、タグを見ずに `role=` を拾うと
 * それを W3C role と誤認する。
 */
const RN_HOST_TAGS = new Set([
  "View",
  "Pressable",
  "ScrollView",
  "TextInput",
  "Modal",
  "RNText",
  "SafeAreaView",
]);

interface RoleScan {
  roles: Set<string>;
  /** W3C 準拠の `role` prop の値（RN host 要素に付いているものだけ）。 */
  w3cRoles: Set<string>;
  /** 静的に値を決められなかった式。無視せず fail させるために集める。 */
  unanalyzable: string[];
}

/** 式から role 文字列を集める。決められない形は unanalyzable に落とす。 */
function collectFromExpression(node: ts.Expression, scan: RoleScan): void {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    scan.roles.add(node.text);
    return;
  }
  if (ts.isParenthesizedExpression(node)) {
    collectFromExpression(node.expression, scan);
    return;
  }
  if (ts.isConditionalExpression(node)) {
    collectFromExpression(node.whenTrue, scan);
    collectFromExpression(node.whenFalse, scan);
    return;
  }
  // `cond && "role"` / `x ?? "role"` の両辺
  if (ts.isBinaryExpression(node)) {
    collectFromExpression(node.left, scan);
    collectFromExpression(node.right, scan);
    return;
  }
  // undefined / null は「role を付けない」なので無害
  if (node.kind === ts.SyntaxKind.NullKeyword) return;
  if (ts.isIdentifier(node) && node.text === "undefined") return;
  // 条件式の左辺など、role 値になり得ない比較は無視してよい
  if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
    scan.unanalyzable.push(node.getText());
    return;
  }
  scan.unanalyzable.push(node.getText());
}

/** JSX 属性が付いている要素のタグ名。 */
function jsxTagName(attribute: ts.JsxAttribute): string | null {
  const attributes = attribute.parent;
  const element = attributes.parent;
  if (ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element)) {
    return element.tagName.getText();
  }
  return null;
}

/** 実装ソースの accessibilityRole / role を AST で走査する。 */
function scanRoles(file: string): RoleScan {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const scan: RoleScan = { roles: new Set(), w3cRoles: new Set(), unanalyzable: [] };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && node.name.getText() === "role") {
      const tag = jsxTagName(node);
      if (tag != null && RN_HOST_TAGS.has(tag)) {
        const w3c: RoleScan = { roles: new Set(), w3cRoles: new Set(), unanalyzable: [] };
        const initializer = node.initializer;
        if (initializer !== undefined && ts.isStringLiteral(initializer)) {
          w3c.roles.add(initializer.text);
        } else if (initializer !== undefined && ts.isJsxExpression(initializer) && initializer.expression) {
          collectFromExpression(initializer.expression, w3c);
        }
        for (const value of w3c.roles) scan.w3cRoles.add(value);
        scan.unanalyzable.push(...w3c.unanalyzable.map((expr) => `role={${expr}}`));
      }
    }
    if (ts.isJsxAttribute(node) && node.name.getText() === "accessibilityRole") {
      const initializer = node.initializer;
      if (initializer === undefined) {
        scan.unanalyzable.push("accessibilityRole（値なし）");
      } else if (ts.isStringLiteral(initializer)) {
        scan.roles.add(initializer.text);
      } else if (ts.isJsxExpression(initializer)) {
        if (initializer.expression === undefined) {
          scan.unanalyzable.push("accessibilityRole={}");
        } else {
          collectFromExpression(initializer.expression, scan);
        }
      } else {
        scan.unanalyzable.push(initializer.getText());
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  // 条件式の判定側（`role === "heading"` の "heading"）が混ざるので、
  // 比較の左右に現れた識別子は unanalyzable から落とさず、role 集合からは
  // 許可・要求の照合で自然に弾かれる（許可外なら fail する）。
  return scan;
}

test("ROLE_RULES の表が MVP の契約集合を過不足なく覆っている", () => {
  assert.deepEqual(
    Object.keys(ROLE_RULES).sort(),
    [...MVP_CONTRACT_IDS].sort(),
    "契約が増減したら表も更新する（表の欠落は検査の穴になる）",
  );
});

test("表が控えている contractRole が契約の実値と一致する", () => {
  const dir = resolveContractsDir();
  const mismatches: string[] = [];
  for (const id of MVP_CONTRACT_IDS) {
    const contract = JSON.parse(readFileSync(join(dir, `${id}.contract.json`), "utf8")) as {
      a11y?: { role?: string };
    };
    const actual = contract.a11y?.role;
    if (actual !== ROLE_RULES[id].contractRole) {
      mismatches.push(`${id}: 契約 "${actual}" / 表 "${ROLE_RULES[id].contractRole}"`);
    }
  }
  assert.deepEqual(
    mismatches,
    [],
    "契約の a11y.role が変わったのに変換表が古い。表を実装でなく契約に追従させること",
  );
});

test("required は allowed の部分集合（表の自己矛盾を防ぐ）", () => {
  for (const [id, rule] of Object.entries(ROLE_RULES)) {
    const outside = rule.required.filter((role) => !rule.allowed.includes(role));
    assert.deepEqual(outside, [], `${id}: required に allowed 外の role がある — ${outside.join(", ")}`);
  }
});

for (const id of MVP_CONTRACT_IDS) {
  test(`${id}: accessibilityRole が静的に解析できる`, () => {
    const { unanalyzable } = scanRoles(implementationFile(id));
    assert.deepEqual(
      unanalyzable,
      [],
      `${id} に静的解析できない accessibilityRole がある: ${unanalyzable.join(", ")}\n` +
        "  値を決められない式は role 照合をすり抜けるので、リテラルか条件式で書くこと",
    );
  });

  test(`${id}: 名乗る role が許可集合の内側`, () => {
    const rule = ROLE_RULES[id];
    const divergence = KNOWN_DIVERGENCES[id];
    const permitted = new Set([...rule.allowed, ...(divergence?.roles ?? [])]);
    const unexpected = [...scanRoles(implementationFile(id)).roles].filter((role) => !permitted.has(role)).sort();
    assert.deepEqual(
      unexpected,
      [],
      `${id} が契約にない role を名乗っている: ${unexpected.join(", ")}\n` +
        `  許可: ${rule.allowed.length > 0 ? rule.allowed.join(", ") : "(role を名乗らない)"}\n` +
        `  根拠: ${rule.note}`,
    );
  });

  test(`${id}: W3C の role prop が許可集合の内側`, () => {
    const permitted = new Set(ROLE_RULES[id].w3cAllowed ?? []);
    const unexpected = [...scanRoles(implementationFile(id)).w3cRoles]
      .filter((role) => !permitted.has(role))
      .sort();
    assert.deepEqual(
      unexpected,
      [],
      `${id} が許可外の role prop を名乗っている: ${unexpected.join(", ")}\n` +
        `  許可: ${permitted.size > 0 ? [...permitted].join(", ") : "(role prop を使わない)"}`,
    );
  });

  test(`${id}: 契約が要求する role prop が実装から消えていない`, () => {
    const w3cRequired = ROLE_RULES[id].w3cRequired ?? [];
    if (w3cRequired.length === 0) return;
    const actual = scanRoles(implementationFile(id)).w3cRoles;
    const missing = w3cRequired.filter((role) => !actual.has(role)).sort();
    assert.deepEqual(
      missing,
      [],
      `${id} から role prop が消えている: ${missing.join(", ")}\n  根拠: ${ROLE_RULES[id].note}`,
    );
  });

  test(`${id}: 契約が要求する role が実装から消えていない`, () => {
    const rule = ROLE_RULES[id];
    if (rule.required.length === 0) return;
    const actual = scanRoles(implementationFile(id)).roles;
    const missing = rule.required.filter((role) => !actual.has(role)).sort();
    assert.deepEqual(
      missing,
      [],
      `${id} から role が消えている: ${missing.join(", ")}\n  根拠: ${rule.note}`,
    );
  });
}

test("既知の乖離は実在するものだけ / 契約改訂後は再承認が要る", () => {
  const dir = resolveContractsDir();
  for (const [id, divergence] of Object.entries(KNOWN_DIVERGENCES)) {
    const actual = scanRoles(implementationFile(id)).roles;
    const stale = divergence.roles.filter((role) => !actual.has(role));
    assert.deepEqual(
      stale,
      [],
      `${id} の乖離 ${stale.join(", ")} は解消済み。KNOWN_DIVERGENCES から削除すること\n` +
        "  （残したままだと「まだ壊れている」という誤った記録が居座る）",
    );

    const contract = JSON.parse(readFileSync(join(dir, `${id}.contract.json`), "utf8")) as { version: string };
    assert.equal(
      contract.version,
      divergence.contractVersion,
      `${id} の契約が ${divergence.contractVersion} → ${contract.version} に改訂された。` +
        "例外の妥当性を見直して contractVersion を更新するか、乖離を解消すること",
    );
  }
});
