/**
 * build-llms-txt.ts — llms.txt を melta-contracts から生成（設計書 §5）。
 *
 * llms.txt 標準（https://llmstxt.org/）に従い、AI エージェント向けの入口を
 * リポジトリルートに生成する。生成物は commit し、check-drift.ts（検査 4）が
 * renderLlmsTxt() を import して freshness を照合する。
 *
 * - Components 節は契約の appStatus / appMapping / appNote から生成（手書き数値ゼロ）
 * - 契約 JSON へのリンクは web 版の既存配信面（melta.tsubotax.com）を再利用
 *   — app 側での契約複製は drift 源になるためしない（設計判断メモ 4）
 * - 出力は決定論（契約ファイル内容とソート順のみに依存。タイムスタンプ・乱数なし）
 *
 * 使い方: tsx scripts/build-llms-txt.ts（root の llms.txt を上書き）
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toComponentName } from "./lib/conformance.js";
import { resolveContractsRoot } from "./lib/contracts-root.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// 契約 JSON の配信面（契約 SSOT の唯一の web 配信面）と app 側 docs の配信面
const CONTRACTS_BASE = "https://melta.tsubotax.com";
const APP_BASE = "https://app.melta.tsubotax.com";

// appStatus（実装状態）と appMapping（native/adapted の形）は直交（contracts 0.2.1）
interface ContractEntry {
  id: string;
  appStatus?: "implemented" | "planned" | "not-planned";
  appMapping?: string;
  appNote?: string;
  intent?: string;
  description?: string;
}

const ORDER = ["implemented", "planned", "not-planned"] as const;

/** 契約ディレクトリから全契約を読む（validate とセットで使う。fixture 検証用に export）。 */
export function loadContracts(componentsDir: string): ContractEntry[] {
  return readdirSync(componentsDir)
    .filter((f) => f.endsWith(".contract.json"))
    .map((f) => JSON.parse(readFileSync(join(componentsDir, f), "utf8")) as ContractEntry);
}

/**
 * 全契約メタデータの validation（fail-loud）。
 *
 * 1 件でも欠損があれば違反 id を全列挙して throw する。silent skip（欠損契約を
 * 除外して「全 N 契約」と正常生成）は契約更新時の無音劣化になるため許さない。
 * - appStatus 欠損 / enum 外 → llms.txt の統計と Components 節が崩れる
 * - implemented で intent / description 両方欠損 → 説明が空文言になる
 * - appMapping="adapted" で appNote 欠損 → adapted 表示が黙って消える
 * - not-planned で appNote 欠損 → 「なぜ作らないか」の理由が空になる
 */
export function validateContracts(contracts: ContractEntry[]): void {
  if (contracts.length === 0) {
    throw new Error("契約が 0 件（componentsDir が空 or 解決先が誤り）。llms.txt を生成できない");
  }
  const violations: string[] = [];
  for (const c of contracts) {
    const id = c.id ?? "(id 欠損)";
    if (c.appStatus == null || !(ORDER as readonly string[]).includes(c.appStatus)) {
      violations.push(
        `${id}: appStatus が無い or enum 外（${JSON.stringify(c.appStatus)}。contracts 0.2.1+ の implemented/planned/not-planned が必要）`,
      );
    } else {
      if (c.appStatus === "implemented" && !c.intent && !c.description) {
        violations.push(`${id}: implemented なのに intent / description が両方無い（説明が空文言になる）`);
      }
      if (c.appStatus === "not-planned" && !c.appNote) {
        violations.push(`${id}: not-planned なのに appNote が無い（理由の文言が空になる）`);
      }
    }
    if (c.appMapping === "adapted" && !c.appNote) {
      violations.push(`${id}: appMapping="adapted" なのに appNote が無い（adapted 表示が消える）`);
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `契約メタデータの validation 失敗（${violations.length} 件）。melta-contracts 側を修正すること:\n- ${violations.join("\n- ")}`,
    );
  }
}

/** llms.txt の全文を契約から組み立てる（純関数的 — 書き込みは main guard 側のみ）。 */
export function renderLlmsTxt(): string {
  const componentsDir = join(resolveContractsRoot(), "components");
  const contracts = loadContracts(componentsDir);
  validateContracts(contracts);
  const withStatus = contracts;

  const sorted = [...withStatus].sort(
    (a, b) =>
      ORDER.indexOf(a.appStatus!) - ORDER.indexOf(b.appStatus!) || a.id.localeCompare(b.id),
  );

  const count = (s: ContractEntry["appStatus"]) =>
    withStatus.filter((c) => c.appStatus === s).length;
  const implemented = count("implemented");
  const planned = count("planned");
  const notPlanned = count("not-planned");
  const adapted = withStatus.filter((c) => c.appMapping === "adapted").length;
  const all = withStatus.length;

  const componentLines = sorted.map((c) => {
    const link = `[${c.id}](${CONTRACTS_BASE}/design/contracts/components/${c.id}.contract.json)`;
    if (c.appStatus === "implemented") {
      // description は intent 優先の 120 字 slice（melta-ui build-llms-txt.ts と同じ規約）
      const desc = (c.intent ?? c.description ?? "").slice(0, 120);
      return `- ${link}: ✅ \`${toComponentName(c.id)}\` — ${desc}`;
    }
    if (c.appStatus === "planned") {
      const adaptedNote =
        c.appMapping === "adapted" && c.appNote ? `（adapted: ${c.appNote}）` : "";
      return `- ${link}: ⬜ planned${adaptedNote}`;
    }
    return `- ${link}: 🚫 not-planned — ${c.appNote ?? ""}`;
  });

  return `# melta-app

> melta デザインシステムの React Native（Expo）UI kit。web 版 melta-ui と同じデザイン契約（melta-contracts、全 ${all} 契約）を SSOT に、RN 実装 ${implemented} 個で契約を満たす（planned ${planned} / not-planned ${notPlanned} / adapted 形 ${adapted}）。アプリ本体ではなく \`npm install melta-app\` で使うライブラリ。必須 peerDependencies は react / react-native のみ（optional peer: react-native-svg = Icon 用 / react-native-safe-area-context = SafeArea 差替用）。

UI を組む前に docs/patterns.md（組み方の規範）を読むこと。exact value（トークン・契約・禁止ルール）の SSOT は melta-contracts。melta-app にトークンの手書きは存在しない（theme は契約からの生成物）。デザイン言語の一次資料は web 版 ${CONTRACTS_BASE}/llms.txt。

## Docs

- [README.md](https://github.com/tsubotax/melta-app#readme): 使う側の全体像（Quickstart / 利用側コードの lint 強制層 / コンポーネント表 / テーマ注入 / 制約）
- [architecture.md](https://github.com/tsubotax/melta-app/blob/main/docs/architecture.md): 触る側の台帳（ディレクトリ構成 / トークン正規化 web→RN / 実装ステータス詳細 / CI）
- [patterns.md](${APP_BASE}/docs/patterns.md): フォーム等「組み方」の規範 + コピペ可能スニペット（実コードと drift 検査済み）
- [showcase](${APP_BASE}/): Live Catalog（実 RN コンポーネントの web export）+ 実装状態の全量表
- [tokens.json](${CONTRACTS_BASE}/design/contracts/tokens.json): デザイントークン（契約 SSOT の配信面）
- [rules.json](${CONTRACTS_BASE}/design/contracts/rules.json): 禁止ルール

## Components

${componentLines.join("\n")}

## Optional

- [melta-ui llms.txt](${CONTRACTS_BASE}/llms.txt): web 版デザインシステムの AI 入口（デザイン言語の一次資料）
- [npm](https://www.npmjs.com/package/melta-app): パッケージ（サブパスは Icon = melta-app/icons、SafeArea 差替 = melta-app/safe-area、lint 強制層 = melta-app/eslint-plugin の 3 つ）
- [THIRD_PARTY_LICENSES.md](https://github.com/tsubotax/melta-app/blob/main/THIRD_PARTY_LICENSES.md): Icon グリフの帰属表示
`;
}

// --- main guard（check-drift.ts からの import 時は書き込まない） ---
const isMain =
  process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const llmsTxt = renderLlmsTxt();
  writeFileSync(resolve(root, "llms.txt"), llmsTxt, "utf8");
  console.log(`✅ llms.txt (${llmsTxt.length} chars) を生成`);
}
