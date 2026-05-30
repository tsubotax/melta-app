/**
 * conformance.test — 「実装が contract を満たすか」の機械照合（設計書 §2 A-3 の Phase 1 最低ライン）。
 *
 * 契約源（*.contract.json）→ 生成メタ（CONTRACTS）→ 実装宣言（__contract）の一直線を検証する。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTRACTS } from "../../src/contracts/contract-types.js";
import {
  MVP_CONTRACT_IDS,
  toKey,
  resolveContractsDir,
  loadContractMetaFromSource,
  scanContractDeclarations,
  type ContractMeta,
} from "./conformance.js";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, "../../src");
const contractsDir = resolveContractsDir();

// --- 層1: 生成メタ CONTRACTS が契約源 *.contract.json と一致しているか（codegen の鮮度保証） ---

test("CONTRACTS は MVP の全 contract を含む", () => {
  const keys = Object.keys(CONTRACTS).sort();
  const expected = MVP_CONTRACT_IDS.map(toKey).sort();
  assert.deepEqual(keys, expected, "CONTRACTS のキー集合が MVP allowlist とズレている（generate:contracts 要再実行）");
});

for (const id of MVP_CONTRACT_IDS) {
  test(`${id}: CONTRACTS が契約源と一致（id/version/variants/sizes/states）`, () => {
    const key = toKey(id);
    // CONTRACTS は readonly な as const。値の照合だけなので緩く受ける。
    const gen = (CONTRACTS as unknown as Record<string, ContractMeta>)[key];
    assert.ok(gen, `CONTRACTS.${key} が無い`);
    const src = loadContractMetaFromSource(contractsDir, id);

    assert.equal(gen.id, src.id, `${id}: id 不一致`);
    assert.equal(gen.version, src.version, `${id}: version 不一致（contract 改訂後に generate:contracts 未実行か）`);
    assert.deepEqual([...gen.variants], src.variants, `${id}: variants 不一致`);
    assert.deepEqual([...gen.sizes], src.sizes, `${id}: sizes 不一致`);
    assert.deepEqual([...gen.states], src.states, `${id}: states 不一致`);
  });
}

// --- 層2: 各 component の __contract 宣言が正しい contract を指しているか（型で防げない誤参照） ---

test("全 component が __contract を宣言している（MVP 9個）", () => {
  const decls = scanContractDeclarations(srcDir);
  const declaredKeys = new Set(decls.map((d) => d.contractKey));
  for (const id of MVP_CONTRACT_IDS) {
    assert.ok(
      declaredKeys.has(toKey(id)),
      `contract "${id}"(key=${toKey(id)}) を __contract で宣言している component が無い`,
    );
  }
});

test("__contract = CONTRACTS.x の x が実在キーで、component 名と対応している", () => {
  const decls = scanContractDeclarations(srcDir);
  assert.ok(decls.length >= MVP_CONTRACT_IDS.length, "__contract 宣言が MVP 数より少ない");

  // component 名 → 期待 contractKey の対応（PascalCase component → camelCase key）。
  // EmptyState → emptyState のように、component 名を lowerCamel 化したら key と一致する想定。
  const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

  for (const d of decls) {
    // x が CONTRACTS の実在キーか
    assert.ok(
      d.contractKey in CONTRACTS,
      `${d.file}: CONTRACTS.${d.contractKey} は存在しないキー`,
    );
    // component 名と contractKey が対応しているか（Button↔button, EmptyState↔emptyState 等）
    assert.equal(
      d.contractKey,
      lowerFirst(d.component),
      `${d.file}: ${d.component}.__contract が CONTRACTS.${d.contractKey} を指している（誤参照の疑い、期待 CONTRACTS.${lowerFirst(d.component)}）`,
    );
  }
});
