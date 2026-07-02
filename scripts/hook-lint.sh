#!/bin/bash
# PostToolUse hook: src/ 配下の .ts/.tsx を Write/Edit した直後に design lint（eslint melta ルール）を走らせる
#
# melta-ui の hook-check-rule.sh と同型の消費者側ハーネス:
#   - error あり → {"decision":"block","reason":...} で Claude に自動フィードバック（修正ループ）
#   - warn のみ → hookSpecificOutput.additionalContext で助言注入
#   - クリーン → 無出力で通過
# 判定ロジックは eslint 本体（eslint.config.mjs + eslint-rules/melta.mjs）に集約し、hook は薄い皮に留める。

set -uo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"\([^"]*\)"/\1/')

case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# lint 対象は src/ の実装のみ（eslint.config.mjs と同スコープ。catalog / scripts は意図的に緩い）
case "$FILE_PATH" in
  "$ROOT"/src/*) ;;
  *) exit 0 ;;
esac

cd "$ROOT"

# eslint 未解決（npm install 前）は silent no-op にせず、その旨をコンテキストに注入する
if ! npx --no-install eslint --version >/dev/null 2>&1; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"melta-app: design lint をスキップしました（node_modules 未インストール）。リポジトリルートで npm install を実行すると Write/Edit 直後の自動 lint が有効になります。"}}
JSON
  exit 0
fi

RESULT=$(npx --no-install eslint --format json "$FILE_PATH" 2>/dev/null || true)

# JSON 整形は node に委譲（shell でのエスケープ事故を避ける）。常に exit 0
ESLINT_RESULT="$RESULT" node --input-type=module -e '
const raw = process.env.ESLINT_RESULT ?? "[]";
let results;
try { results = JSON.parse(raw); } catch { process.exit(0); }
const msgs = results.flatMap((r) =>
  (r.messages ?? []).map((m) => `${r.filePath}:${m.line ?? 0} [${m.ruleId ?? "parse"}] ${m.message}`)
);
if (msgs.length === 0) process.exit(0);
const errors = results.reduce((n, r) => n + (r.errorCount ?? 0), 0);
const body = msgs.join("\n");
if (errors > 0) {
  console.log(JSON.stringify({
    decision: "block",
    reason: `melta-app design lint violation（修正して再 Write してください）:\n${body}`,
  }));
} else {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `melta-app design lint warning:\n${body}`,
    },
  }));
}
' 2>/dev/null || true
exit 0
