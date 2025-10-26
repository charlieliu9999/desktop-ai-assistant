#!/usr/bin/env python3
"""
Batch STT evaluation script against /v1/voice/stt.

Reads a manifest JSON of test items and prints a small report with
latency and naive accuracy (char-level overlap).

Usage:
  python voice_batch_test.py --manifest ../../tests/audio_manifest.json \
         [--base http://127.0.0.1:8010] [--lang zh]

Manifest JSON example (tests/audio_manifest.json):
[
  {"path": "tests/audio/zh_short_1.wav", "text": "今天天气不错", "lang": "zh", "mime": "audio/wav"},
  {"path": "tests/audio/zh_short_2.mp3", "text": "患者主诉胸闷三天", "lang": "zh", "mime": "audio/mpeg"}
]
"""
import argparse
import base64
import json
import os
import time
import urllib.request


def post_json(url: str, payload: dict, timeout: int = 120) -> dict:
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        txt = resp.read().decode('utf-8')
    try:
        return json.loads(txt)
    except Exception:
        return {'raw': txt}


def char_overlap_ratio(hyp: str, ref: str) -> float:
    hyp = (hyp or '').strip()
    ref = (ref or '').strip()
    if not hyp and not ref:
        return 1.0
    if not hyp or not ref:
        return 0.0
    # naive overlap: count common characters
    import collections
    c_h = collections.Counter(hyp)
    c_r = collections.Counter(ref)
    common = sum(min(c_h[ch], c_r[ch]) for ch in set(hyp) | set(ref))
    denom = max(len(hyp), len(ref))
    return common / denom


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--manifest', required=True)
    ap.add_argument('--base', default='http://127.0.0.1:8010')
    ap.add_argument('--lang', default=None)
    args = ap.parse_args()

    with open(args.manifest, 'r', encoding='utf-8') as f:
        items = json.load(f)

    url = args.base.rstrip('/') + '/v1/voice/stt'
    results = []
    for it in items:
        p = it['path']
        exp = it.get('text', '')
        lang = args.lang or it.get('lang') or 'zh'
        mime = it.get('mime') or 'audio/wav'
        with open(p, 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        payload = { 'audio_data': b64, 'language': lang, 'audio_mime': mime }
        t0 = time.time()
        resp = post_json(url, payload)
        dt = (time.time() - t0) * 1000
        hyp = ((resp or {}).get('result') or {}).get('text') or ''
        ratio = char_overlap_ratio(hyp, exp) if exp else None
        results.append({ 'path': p, 'latency_ms': dt, 'hyp': hyp, 'ref': exp, 'overlap': ratio })

    print(json.dumps({ 'base': args.base, 'count': len(results), 'results': results }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

