/**
 * theme-injection.test — theme 注入まわりの純関数の検査（Step 2-①）。
 *
 * ThemeProvider の挙動（React が絡む側）は src/__tests__/theme-provider.test.tsx が見る。
 * ここでは react-native を一切読まない純関数だけを対象にする:
 *   - capability の導出（宣言ではなくキー集合から決まること）
 *   - mode 解決の全分岐（OS 由来の clamp は無反応 / forcedMode の矛盾は violation）
 *   - validateTheme が型を通り抜けた欠落を拾うこと
 *   - defineTheme の brand / freeze / 欠落 mode の guard getter
 *
 * 注: `defineTheme` の dev 限定パス（validate と freeze）は `__DEV__` を見る。node には
 * その global が無いので `./fixtures/enable-dev.js` を**先頭で**読んで立てる（並べ替え禁止・理由は同ファイル）。
 */

import "./fixtures/enable-dev.js";

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  declaredModes,
  defineTheme,
  deriveColorScheme,
  resolveMode,
  supportedModes,
  validateTheme,
  type ThemeOptions,
} from "../../src/theme/define-theme.js";
import {
  singleDarkThemeOptions,
  singleLightThemeOptions,
} from "./fixtures/single-dark.theme.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const dualThemeOptions: ThemeOptions = { ...nativeTheme, id: "fixture-light-dark" };

// --- capability の導出 -------------------------------------------------------

test("colorScheme は宣言ではなく color.semantic のキー集合から導出される", () => {
  assert.equal(deriveColorScheme(singleDarkThemeOptions.color.semantic), "single-dark");
  assert.equal(deriveColorScheme(singleLightThemeOptions.color.semantic), "single-light");
  assert.equal(deriveColorScheme(dualThemeOptions.color.semantic), "light-dark");
});

test("mode をどちらも持たない theme は導出時点で落ちる", () => {
  assert.throws(() => deriveColorScheme({}), /light \/ dark のどちらも無い/);
});

test("declaredModes は宣言順に依らず light / dark の順で返す", () => {
  assert.deepEqual(declaredModes(dualThemeOptions.color.semantic), ["light", "dark"]);
  assert.deepEqual(declaredModes(singleDarkThemeOptions.color.semantic), ["dark"]);
});

test("declaredModes は解決後の theme（番人つき）でも値を持つ mode だけを返す", () => {
  // 回帰ガード: hasOwnProperty で判定していた 0.4.0 は non-enumerable な番人の getter を
  // 値として数え、single-dark の theme に対して ["light","dark"] を返していた。
  const resolved = defineTheme(singleDarkThemeOptions);
  assert.deepEqual(declaredModes(resolved.color.semantic), ["dark"]);
  assert.deepEqual(declaredModes(defineTheme(dualThemeOptions).color.semantic), ["light", "dark"]);
});

test("supportedModes が capability と一致する", () => {
  assert.deepEqual(supportedModes("light-dark"), ["light", "dark"]);
  assert.deepEqual(supportedModes("single-dark"), ["dark"]);
  assert.deepEqual(supportedModes("single-light"), ["light"]);
});

// --- mode 解決 ---------------------------------------------------------------

test("light-dark theme は OS の指定にも forcedMode にも素直に従う", () => {
  assert.deepEqual(resolveMode("light-dark", undefined, "dark"), { mode: "dark" });
  assert.deepEqual(resolveMode("light-dark", undefined, "light"), { mode: "light" });
  assert.deepEqual(resolveMode("light-dark", "dark", "light"), { mode: "dark" });
  assert.deepEqual(resolveMode("light-dark", "light", "dark"), { mode: "light" });
});

test("single-dark theme に OS が light を返しても無反応で dark に clamp する", () => {
  // 環境の事実であって事故ではないので violation を立てない
  //（立てると light 設定のユーザ全員に警告が出る）。
  assert.deepEqual(resolveMode("single-dark", undefined, "light"), { mode: "dark" });
  assert.deepEqual(resolveMode("single-light", undefined, "dark"), { mode: "light" });
});

test("single-dark theme に forcedMode='light' を渡すと clamp した上で violation を返す", () => {
  const result = resolveMode("single-dark", "light", "dark");
  assert.equal(result.mode, "dark", "描画は止めずに clamp する");
  assert.deepEqual(result.violation, {
    kind: "forced-mode-unsupported",
    requested: "light",
    resolved: "dark",
    colorScheme: "single-dark",
  });
});

test("対応している mode を forcedMode で指定した場合は violation を立てない", () => {
  assert.deepEqual(resolveMode("single-dark", "dark", "light"), { mode: "dark" });
});

// --- validateTheme -----------------------------------------------------------

test("正しい theme は問題を返さない", () => {
  assert.deepEqual(validateTheme(singleDarkThemeOptions), []);
  assert.deepEqual(validateTheme(dualThemeOptions), []);
});

test("宣言した mode の色が欠けていたら拾う", () => {
  const broken: ThemeOptions = {
    ...singleDarkThemeOptions,
    color: {
      ...singleDarkThemeOptions.color,
      semantic: {
        // 型を通り抜ける経路（キャスト）を再現する
        dark: { "bg-page": "#000000" } as unknown as (typeof singleDarkThemeOptions.color.semantic)["dark"],
      },
    },
  };
  const problems = validateTheme(broken);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /color\.semantic\.dark に欠けている色/);
  assert.match(problems[0], /text-heading/);
});

test("mode を1つも持たない theme を拾う", () => {
  const broken: ThemeOptions = {
    ...singleDarkThemeOptions,
    color: { ...singleDarkThemeOptions.color, semantic: {} },
  };
  assert.match(validateTheme(broken).join("\n"), /light \/ dark のどちらも無い/);
});

test("color.semantic の未知のキーを拾う", () => {
  const broken: ThemeOptions = {
    ...singleDarkThemeOptions,
    color: {
      ...singleDarkThemeOptions.color,
      semantic: {
        ...singleDarkThemeOptions.color.semantic,
        dim: {},
      } as unknown as ThemeOptions["color"]["semantic"],
    },
  };
  assert.match(validateTheme(broken).join("\n"), /未知のキー "dim"/);
});

test("semantic 以外のキー集合の欠落も拾う（as キャストで抜けた欄の検出）", () => {
  const { "3xl": _dropped, ...fontSize } = singleDarkThemeOptions.typography.fontSize;
  const broken: ThemeOptions = {
    ...singleDarkThemeOptions,
    typography: {
      ...singleDarkThemeOptions.typography,
      fontSize: fontSize as ThemeOptions["typography"]["fontSize"],
    },
  };
  const problems = validateTheme(broken);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /typography\.fontSize に欠けているキー — 3xl/);
});

test("問題は1件で打ち切らず全部返す", () => {
  const broken = {
    ...singleDarkThemeOptions,
    color: { ...singleDarkThemeOptions.color, primary: {}, status: {} },
    radius: {},
  } as unknown as ThemeOptions;
  const problems = validateTheme(broken);
  assert.ok(problems.length >= 3, `複数の問題を返す（実際: ${problems.length}件）`);
});

// --- defineTheme -------------------------------------------------------------

test("defineTheme は brand と導出済み capability を付けて返す", () => {
  const theme = defineTheme(singleDarkThemeOptions);
  assert.equal(theme.$$melta, true);
  assert.deepEqual(theme.capabilities, { colorScheme: "single-dark" });
});

test("defineTheme は入力オブジェクトを書き換えない（呼び出し側の参照を汚さない）", () => {
  const theme = defineTheme(singleDarkThemeOptions);
  assert.notEqual(theme, singleDarkThemeOptions as unknown);
  assert.notEqual(theme.color.semantic, singleDarkThemeOptions.color.semantic);
  assert.equal(
    Object.prototype.hasOwnProperty.call(singleDarkThemeOptions.color.semantic, "light"),
    false,
    "入力側に guard getter を生やさない",
  );
});

test("持っていない mode を直接読むと原因を名指しして落ちる", () => {
  const theme = defineTheme(singleDarkThemeOptions);
  assert.throws(
    () => theme.color.semantic.light,
    /fixture-single-dark.*colorScheme=single-dark.*color\.semantic\.light/s,
  );
});

test("guard getter は non-enumerable（列挙・spread・JSON では踏まない）", () => {
  const theme = defineTheme(singleDarkThemeOptions);
  assert.deepEqual(Object.keys(theme.color.semantic), ["dark"]);
  assert.doesNotThrow(() => ({ ...theme.color.semantic }));
  assert.doesNotThrow(() => JSON.stringify(theme));
});

test("light-dark theme には guard getter が1つも付かない（既存消費者の経路は不変）", () => {
  const theme = defineTheme(dualThemeOptions);
  assert.deepEqual(theme.capabilities, { colorScheme: "light-dark" });
  assert.doesNotThrow(() => theme.color.semantic.light);
  assert.doesNotThrow(() => theme.color.semantic.dark);
  const descriptor = Object.getOwnPropertyDescriptor(theme.color.semantic, "light");
  assert.equal(descriptor?.get, undefined, "値を持つ mode は素のデータプロパティのまま");
});

test("dev では壊れた theme を defineTheme が throw する", () => {
  const broken = {
    ...singleDarkThemeOptions,
    color: { ...singleDarkThemeOptions.color, semantic: {} },
  } as ThemeOptions;
  assert.throws(() => defineTheme(broken), /theme の形が不正/);
});

test("dev では成果物が freeze される（トークンの後からの書き換えを防ぐ）", () => {
  const theme = defineTheme(singleDarkThemeOptions);
  assert.equal(Object.isFrozen(theme), true);
  assert.equal(Object.isFrozen(theme.color.semantic.dark), true, "nested も freeze する");
});
