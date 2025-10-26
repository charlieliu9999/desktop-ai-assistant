#!/usr/bin/env python3
"""
Batch vision evaluation script against /v1/vision/understand.

Reads a manifest JSON of test items and prints outputs. Supports
DashScope VL with scene=screen_recognition_aliyun and strict JSON.

Usage:
  python vision_batch_test.py --manifest ../../tests/vision_manifest.json \
         [--base http://127.0.0.1:8010] [--scene screen_recognition_aliyun]

Manifest JSON example (tests/vision_manifest.json):
[
  {"path": "tests/截屏2025-10-02 19.49.44.png", "mime": "image/png", "schema": "patient_info_v1"},
  {"path": "tests/test_patient_image.png", "mime": "image/png", "schema": "patient_info_v1"}
]
"""
import argparse
import base64
import json
import os
import urllib.request


def post_json(url: str, payload: dict, timeout: int = 180) -> dict:
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        txt = resp.read().decode('utf-8')
    try:
        return json.loads(txt)
    except Exception:
        return {'raw': txt}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--manifest', required=True)
    ap.add_argument('--base', default='http://127.0.0.1:8010')
    ap.add_argument('--scene', default='screen_recognition_aliyun')
    args = ap.parse_args()

    with open(args.manifest, 'r', encoding='utf-8') as f:
        items = json.load(f)

    url = args.base.rstrip('/') + f'/v1/vision/understand?scene={args.scene}'
    results = []
    for it in items:
        p = it['path']
        mime = it.get('mime') or 'image/png'
        schema = it.get('schema')
        with open(p, 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('ascii')
        payload = {
            'image_data': b64,
            'image_mime': mime,
            'prompt': '提取患者关键信息（JSON）',
            'provider': 'dashscope',
            'schema_name': schema or 'patient_info_v1',
            'strict_json': True,
        }
        res = post_json(url, payload)
        results.append({ 'path': p, 'resp': res })

    print(json.dumps({ 'base': args.base, 'count': len(results), 'results': results }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

