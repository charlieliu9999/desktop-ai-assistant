#!/usr/bin/env python3
"""
Voice API test tool for STT/TTS.

Usage:
  python voice_test.py stt <audio_path.wav> [--lang zh]
  python voice_test.py tts "text to speak" [--lang zh] [--out out.wav]

Env:
  BASE_URL (default http://127.0.0.1:8010)
"""
import argparse
import base64
import json
import os
import sys
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


def stt(base: str, audio_path: str, lang: str = 'zh'):
    with open(audio_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    url = base.rstrip('/') + '/v1/voice/stt'
    payload = {'audio_data': b64, 'language': lang}
    res = post_json(url, payload)
    print(json.dumps(res, ensure_ascii=False, indent=2))


def tts(base: str, text: str, lang: str = 'zh', out_path: str = 'tts_out.wav'):
    url = base.rstrip('/') + '/v1/voice/tts'
    payload = {'text': text, 'language': lang}
    res = post_json(url, payload)
    print(json.dumps({k: v for k, v in res.items() if k != 'result'}, ensure_ascii=False, indent=2))
    try:
        audio_b64 = res.get('result', {}).get('audio_data')
        if audio_b64:
            with open(out_path, 'wb') as f:
                f.write(base64.b64decode(audio_b64))
            print(f"Saved audio to {out_path}")
    except Exception as e:
        print(f"Failed to save audio: {e}")


def main():
    base = os.getenv('BASE_URL', 'http://127.0.0.1:8010')
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='cmd')

    p_stt = sub.add_parser('stt')
    p_stt.add_argument('audio', help='Path to WAV/MP3/FLAC file')
    p_stt.add_argument('--lang', default='zh')

    p_tts = sub.add_parser('tts')
    p_tts.add_argument('text')
    p_tts.add_argument('--lang', default='zh')
    p_tts.add_argument('--out', default='tts_out.wav')

    args = parser.parse_args()
    if args.cmd == 'stt':
        stt(base, args.audio, args.lang)
    elif args.cmd == 'tts':
        tts(base, args.text, args.lang, args.out)
    else:
        parser.print_help()
        sys.exit(2)

if __name__ == '__main__':
    main()

