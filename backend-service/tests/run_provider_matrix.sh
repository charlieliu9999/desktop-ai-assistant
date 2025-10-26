#!/usr/bin/env bash
set -euo pipefail

BASE=${BACKEND_BASE:-http://localhost:8010}
echo "==> Backend base: $BASE"

cd "$(dirname "$0")/.."

BACKEND_BASE="$BASE" python3 tests/provider_matrix_test.py

echo "==> Report written to docs/BACKEND_PROVIDER_TEST_REPORT.json"

