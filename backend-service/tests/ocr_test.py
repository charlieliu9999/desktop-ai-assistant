#!/usr/bin/env python3
"""
OCR API test tool.

Usage:
  python ocr_test.py <image_path> [--lang chi_sim+eng]

Env:
  BASE_URL (default http://127.0.0.1:8010)
"""
import argparse
import base64
import json
import os
import urllib.request


def post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as resp:
        txt = resp.read().decode('utf-8')
    try:
        return json.loads(txt)
    except Exception:
        return {'raw': txt}


def main():
    base = os.getenv('BASE_URL', 'http://127.0.0.1:8010')
    parser = argparse.ArgumentParser()
    parser.add_argument('image')
    parser.add_argument('--lang', default='chi_sim+eng')
    args = parser.parse_args()

    with open(args.image, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')

    url = base.rstrip('/') + '/v1/vision/ocr'
    payload = {
        'image_data': b64,
        'language': args.lang,
        'psm': 3,
        'oem': 3,
    }
    res = post_json(url, payload)
    print(json.dumps(res, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

