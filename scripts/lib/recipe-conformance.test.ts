/**
 * recipe-conformance.test — recipes/app（melta-contracts）の consumer テスト + 実装照合（P4）。
 *
 * 層A（consumer-driven contract）: 9 recipe 全件について
 *   - 存在 / platform="app" / id 一致 / contractVersion が契約源と一致
 *   - variants / sizes / states キーが契約の部分集合（語彙の発明を検知）
 *   - 全 token 参照が tokens.json に実在（web 側が token を消したらここが赤くなる）
 *
 * 層B（styleRefs conformance、button の分）:
 *   pure style resolver（src/primitives/button.styles.ts）の出力と recipe の styleRefs を
 *   token 解決して突き合わせる。「実装と recipe が同じ色・寸法を指しているか」の機械照合。
 *   同型の検査は全実装コンポーネントに展開済みで、button 以外は `<id>-conformance.test.ts` に
 *   1 ファイルずつ置いてある（button だけ層A と同居しているのは、機構をここで最初に作った経緯）。
 *   ⚠️ button は resolver の初代実装で、書き方の規範ではない（AGENTS.md「style resolver の規約」）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveContractsRoot } from "./contracts-root.js";
import {
  listAppRecipeFiles,
  loadAppRecipe,
  walkTokenPath,
  isTokenLeaf,
  collectTokenRefs,
  resolveStyleRefs,
  type AppRecipe,
} from "./recipe-conformance.js";
import { MVP_CONTRACT_IDS } from "./conformance.js";
import {
  BUTTON_SIZE_SPEC,
  resolveButtonColors,
  type ButtonVariant,
  type ButtonSize,
} from "../../src/primitives/button.styles.js";
import { nativeTheme } from "../../src/theme/native-theme.js";

const contractsRoot = resolveContractsRoot();
const tokens = JSON.parse(readFileSync(join(contractsRoot, "tokens.json"), "utf8")) as unknown;

interface ContractSource {
  id: string;
  version: string;
  variants?: Record<string, unknown>;
  sizes?: Record<string, unknown>;
  states?: string[];
}

function loadContractSource(id: string): ContractSource {
  return JSON.parse(
    readFileSync(join(contractsRoot, "components", `${id}.contract.json`), "utf8")
  ) as ContractSource;
}

// --- 層A: consumer-driven contract（9 recipe 全件） ---

const recipeFiles = listAppRecipeFiles(contractsRoot);

test("MVP 全コンポーネントに app recipe が存在する", () => {
  const ids = new Set(recipeFiles.map((f) => f.replace(/\.recipe\.json$/, "")));
  for (const id of MVP_CONTRACT_IDS) {
    assert.ok(ids.has(id), `recipes/app/${id}.recipe.json が存在しない`);
  }
});

for (const file of recipeFiles) {
  const recipe: AppRecipe = loadAppRecipe(contractsRoot, file);

  test(`recipe ${file}: platform / id / contractVersion が契約源と整合`, () => {
    assert.equal(recipe.platform, "app");
    assert.equal(`${recipe.id}.recipe.json`, file);
    const contract = loadContractSource(recipe.id);
    assert.equal(
      recipe.contractVersion,
      contract.version,
      `contractVersion 不一致: recipe=${recipe.contractVersion} / 契約=${contract.version}（契約変更に recipe が未追従）`
    );
  });

  test(`recipe ${file}: variants / sizes / states キーが契約の部分集合`, () => {
    const contract = loadContractSource(recipe.id);
    const axes: Array<[string, string[], string[]]> = [
      ["variants", Object.keys(recipe.variants ?? {}), Object.keys(contract.variants ?? {})],
      ["sizes", Object.keys(recipe.sizes ?? {}), Object.keys(contract.sizes ?? {})],
      ["states", Object.keys(recipe.states ?? {}), contract.states ?? []],
    ];
    for (const [axis, recipeKeys, contractKeys] of axes) {
      const allowed = new Set(contractKeys);
      const invented = recipeKeys.filter((k) => !allowed.has(k));
      assert.deepEqual(invented, [], `契約に無い ${axis} キー: ${invented.join(", ")}`);
    }
  });

  test(`recipe ${file}: 全 token 参照が tokens.json の leaf に実在（group 参照は不正）`, () => {
    const refs = collectTokenRefs(recipe);
    const missing = [...new Set(refs)].filter((r) => !isTokenLeaf(walkTokenPath(tokens, r)));
    assert.deepEqual(missing, [], `tokens.json に無い / group を指す参照: ${missing.join(", ")}`);
  });
}

// --- 層A': appStatus 同期（契約の宣言 ⇔ 実装 allowlist の一致） ---

test("appStatus=implemented の契約集合が MVP allowlist と一致", (t) => {
  const componentsDir = join(contractsRoot, "components");
  const contracts = readdirSync(componentsDir)
    .filter((f) => f.endsWith(".contract.json"))
    .map((f) => JSON.parse(readFileSync(join(componentsDir, f), "utf8")) as { id: string; appStatus?: string });
  const withStatus = contracts.filter((c) => c.appStatus);
  if (withStatus.length === 0) {
    // melta-contracts@0.2.0 以前は appStatus 未公開。publish 後に自動で発火する tolerant skip
    t.skip("melta-contracts に appStatus フィールドなし（0.2.1 未満）");
    return;
  }
  const implemented = contracts
    .filter((c) => c.appStatus === "implemented")
    .map((c) => c.id)
    .sort();
  assert.deepEqual(
    implemented,
    [...MVP_CONTRACT_IDS].sort(),
    "契約の appStatus=implemented 宣言と melta-app の実装 allowlist がズレている（どちらかを更新）"
  );
});

// --- 層B: button styleRefs conformance（実装 resolver との機械照合） ---

interface ButtonVariantRecipe {
  style: Record<string, unknown>;
  pressedStyle?: Record<string, unknown>;
  textStyle?: Record<string, unknown>;
}

const buttonRecipe = loadAppRecipe(contractsRoot, "button.recipe.json") as AppRecipe & {
  variants: Record<string, ButtonVariantRecipe>;
  sizes: Record<
    string,
    {
      minHeight: number;
      paddingHorizontal?: { token: string };
      fontSize?: { token: string };
      iconOnlyWidth?: number;
      iconOnlyHeight?: number;
    }
  >;
};

test("button conformance: 全 variant の色が実装 resolver と recipe で一致", () => {
  for (const [name, variantRecipe] of Object.entries(buttonRecipe.variants)) {
    const impl = resolveButtonColors(nativeTheme, "light", name as ButtonVariant);
    const style = resolveStyleRefs(tokens, variantRecipe.style);
    const pressed = resolveStyleRefs(tokens, variantRecipe.pressedStyle);
    const text = resolveStyleRefs(tokens, variantRecipe.textStyle);

    assert.equal(style.backgroundColor, impl.bg, `${name}: backgroundColor`);
    assert.equal(style.borderColor, impl.border, `${name}: borderColor`);
    assert.equal(pressed.backgroundColor, impl.pressedBg, `${name}: pressed backgroundColor`);
    assert.equal(text.color, impl.textColor, `${name}: text color`);
  }
});

test("button conformance: sizes（minHeight / padding / fontSize / iconOnly 箱）が実装と一致", () => {
  for (const [name, sizeRecipe] of Object.entries(buttonRecipe.sizes)) {
    const spec = BUTTON_SIZE_SPEC[name as ButtonSize];
    assert.ok(spec, `実装に無い size: ${name}`);
    // recipe は 0.7.0 で height → minHeight（fontScale でクリップさせないため）。
    // 実装も height 固定をやめているので、キー名ごと一致していることを見る。
    assert.ok(
      !("height" in sizeRecipe),
      `${name}: recipe に height が復活している（fontScale でクリップするので minHeight のはず）`,
    );
    assert.equal(sizeRecipe.minHeight, spec.minHeight, `${name}: minHeight`);
    if (sizeRecipe.paddingHorizontal) {
      const px = resolveStyleRefs(tokens, { v: sizeRecipe.paddingHorizontal }).v;
      assert.equal(px, nativeTheme.spacing[spec.px], `${name}: paddingHorizontal`);
    }
    if (sizeRecipe.fontSize) {
      const size = resolveStyleRefs(tokens, { v: sizeRecipe.fontSize }).v;
      assert.equal(size, nativeTheme.typography.fontSize[spec.font].fontSize, `${name}: fontSize`);
    }
    if (sizeRecipe.iconOnlyWidth !== undefined) {
      assert.equal(sizeRecipe.iconOnlyWidth, spec.iconBox, `${name}: iconOnly 幅`);
    }
    // iconOnly は正方形固定（labeled と違い中身が伸びないので height 固定でよい）
    if (sizeRecipe.iconOnlyHeight !== undefined) {
      assert.equal(sizeRecipe.iconOnlyHeight, spec.iconBox, `${name}: iconOnly 高さ`);
    }
  }
});

test("button conformance: recipe の variant 網羅が実装の型と一致（欠落・過剰なし）", () => {
  const implVariants = new Set<string>([
    "contained",
    "outlined",
    "brand-outline",
    "neutral",
    "lighted",
    "danger",
    "subtle",
  ] satisfies ButtonVariant[]);
  assert.deepEqual(new Set(Object.keys(buttonRecipe.variants)), implVariants);
});
