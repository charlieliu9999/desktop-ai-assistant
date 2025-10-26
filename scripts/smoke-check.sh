#!/usr/bin/env bash

set -euo pipefail

BASE="${1:-http://localhost:8010}"

echo "===> Backend base: $BASE"

function ping() {
  local path="$1"; shift
  echo -n "GET $path ... "
  if curl -sf "$BASE$path" > /dev/null; then
    echo "OK"
  else
    echo "FAIL"; return 1
  fi
}

function post_json() {
  local path="$1"; shift
  local body="$1"; shift
  echo -n "POST $path ... "
  if curl -sf -H 'Content-Type: application/json' -d "$body" "$BASE$path" > /dev/null; then
    echo "OK"
  else
    echo "FAIL"; return 1
  fi
}

echo "-- Health"
ping "/health" || true

echo "-- V1 Models & Health"
ping "/v1/ai/models" || true
ping "/v1/vision/health" || true
ping "/v1/voice/health" || true
ping "/v1/agent/health" || true

echo "-- Vision Understand (dry-run scene)"
post_json "/v1/vision/understand?scene=screen_recognition" '{"image_data":"","image_mime":"image/png","prompt":"ping","strict_json":false}' || true

echo "-- AI Chat (simple ping)"
post_json "/v1/ai/chat?scene=ai_chat" '{"messages":[{"role":"user","content":"ping"}],"options":{"max_tokens":32}}' || true

echo "Done."

