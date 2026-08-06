# Security Policy / セキュリティポリシー

## 報告経路 / Reporting a vulnerability

**日本語** — 脆弱性を見つけた場合は、**public issue を立てずに** GitHub の private vulnerability
reporting を使ってください。このリポジトリの **Security タブ → "Report a vulnerability"** から
非公開で報告できます。melta-app は消費者プロジェクトの開発環境で動く層（eslint plugin / エディタ hook）
と、アプリのバンドルに入る RN コンポーネントの両方を配布しているため、**報告経路そのものの信頼性**を
重視しています。第三者の目に触れる経路（issue / PR / SNS）で詳細を先に出さないでください。

**English** — Please **do not open a public issue**. Report privately through GitHub private
vulnerability reporting: **Security tab → "Report a vulnerability"** on this repository. melta-app
ships both a developer-environment layer (eslint plugin / editor hooks) and RN components that end up
in an application bundle, so the trustworthiness of the reporting path itself matters. Do not disclose
details on any public channel (issues, PRs, social media) before a fix is available.

含めてほしい情報 / What to include:

- 影響するバージョンと RN / Expo バージョン / affected melta-app version plus RN / Expo version
- 再現手順、可能なら最小再現 / reproduction steps, ideally a minimal repro
- 想定される影響 / expected impact

## 対応方針 / Response

個人メンテナンスの OSS（tsubotax）のため、以下は SLA ではなく **best effort の目安**です。
This is a personally maintained OSS project; the following are best-effort targets, not an SLA.

| | 目安 / Target |
|---|---|
| 初回応答 / First response | 7 日以内 / within 7 days |
| 影響評価の共有 / Triage result | 14 日以内 / within 14 days |
| 修正版のリリース / Patched release | 深刻度に応じて。重大なものは最優先 / severity-dependent; critical issues take priority |

## 開示ポリシー / Disclosure

協調的開示（coordinated disclosure）を取ります。修正版を npm に公開したあと、GitHub Security
Advisory として公開し、`CHANGELOG.md` にも記載します。報告者のクレジットは希望に応じて記載します。
修正が難しい場合でも、**報告から 90 日**を目安に状況を公開します。

We follow coordinated disclosure. After a patched version is published to npm, we publish a GitHub
Security Advisory and record it in `CHANGELOG.md`. Reporters are credited on request. Even when a fix
is hard, we aim to disclose the status **within 90 days** of the report.

## サポート対象バージョン / Supported versions

セキュリティ修正は **npm 最新 minor のみ**に提供します。過去の minor へのバックポートはありません。
Security fixes are provided for **the latest published minor only**. There are no backports.

| パッケージ / Package | サポート対象 / Supported |
|---|---|
| [`melta-app`](https://www.npmjs.com/package/melta-app) | 0.6.x |

デザイン契約（`melta-contracts`）と MCP サーバー（`melta-ds-mcp`）は別リポジトリです。
そちらの脆弱性は [melta-ui の SECURITY.md](https://github.com/tsubotax/melta-ui/blob/main/SECURITY.md)
の経路で報告してください。
The design contracts and the MCP server live in a separate repository — report issues there.

## 対象外 / Out of scope

- consumer lint が検出できないパターン（変数経由・spread 経由）— これは既知の設計上の限界で、
  [README](./README.md) の「制約と正直な範囲」に明記しています / a documented limitation, not a vulnerability
- 依存パッケージ自体の既知脆弱性で、melta-app 側に悪用経路がないもの / report upstream
- ネットワーク境界に関する誤解に基づく報告 — lint も theme 生成もローカル処理で完結し、telemetry も
  runtime 依存もありません / everything runs locally; no telemetry, no runtime dependencies
