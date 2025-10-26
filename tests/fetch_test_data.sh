#!/usr/bin/env bash
set -euo pipefail

# This script downloads small public test samples for STT/OCR/Vision.
# Note: Requires network access. Review each URL before running in your environment.

mkdir -p tests/audio tests/images

set +e
echo "[info] downloading sample English speech (vosk test wav) ..."
curl -L --fail -o tests/audio/en_vosk_test.wav "https://github.com/alphacep/vosk-api/raw/master/python/example/test.wav" || echo "[warn] failed to fetch en_vosk_test.wav"

echo "[info] (optional) downloading Mandarin sample ... (skipped if not available)"
curl -L --fail -o tests/audio/zh_sample_optional.wav "https://github.com/audreyfeldroy/cookiecutter-pypackage/raw/master/tests/test_files/hello.wav" || echo "[warn] optional zh sample not available"

echo "[info] (optional) downloading OCR sample images ..."
# Add sample OCR image URLs if needed
set -e

echo "done"
