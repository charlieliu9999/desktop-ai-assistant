#!/usr/bin/env bash
set -euo pipefail

# Simple Bisheng agent validation via backend v1
# Env:
#   BASE_URL (default http://127.0.0.1:8010)
#   BISHENG_TOKEN (optional, Bearer token to forward)
#   WORKFLOW_ID (optional, to try invoke)

BASE_URL="${BASE_URL:-http://127.0.0.1:8010}"

echo "[agent] health" >&2
curl -sS "$BASE_URL/v1/agent/health" | jq '.' || true

echo "[agent] list workflows" >&2
curl -sS "$BASE_URL/v1/agent/workflows" ${BISHENG_TOKEN:+ -H "Authorization: Bearer $BISHENG_TOKEN"} | jq '.' || true

if [[ -n "${WORKFLOW_ID:-}" ]]; then
  echo "[agent] invoke workflow $WORKFLOW_ID" >&2
  curl -sS -N -X POST "$BASE_URL/v1/agent/invoke" \
    -H 'Content-Type: application/json' \
    ${BISHENG_TOKEN:+ -H "Authorization: Bearer $BISHENG_TOKEN"} \
    -d "{\"workflow_id\": \"$WORKFLOW_ID\", \"session_id\": \"cli-$(date +%s)\"}" | head -n 40 || true
fi

echo "done" >&2

