import asyncio
import json
import os
import time
from typing import Any, Dict, List

import httpx


BASE = os.environ.get("BACKEND_BASE", "http://localhost:8010")


async def fetch_json(client: httpx.AsyncClient, method: str, url: str, **kwargs) -> Dict[str, Any]:
    t0 = time.time()
    try:
        resp = await client.request(method, url, timeout=60.0, **kwargs)
        elapsed = (time.time() - t0) * 1000.0
        data = None
        try:
            data = resp.json()
        except Exception:
            data = {"raw": (await resp.aread()).decode(errors="ignore")[:500]}
        return {"ok": resp.is_success, "status": resp.status_code, "elapsed_ms": elapsed, "url": url, "data": data}
    except Exception as e:
        return {"ok": False, "status": 0, "elapsed_ms": (time.time() - t0) * 1000.0, "url": url, "error": str(e)}


async def test_ai_matrix(client: httpx.AsyncClient) -> Dict[str, Any]:
    report: Dict[str, Any] = {"providers": [], "runs": []}
    # providers
    prov = await fetch_json(client, "GET", f"{BASE}/v1/ai/providers")
    report["providers_response"] = prov
    # models per provider
    models = await fetch_json(client, "GET", f"{BASE}/v1/ai/models")
    report["models_response"] = models

    # provider list
    plist: List[str] = []
    try:
        plist = prov.get("data", {}).get("data", {}).get("providers", []) or []
    except Exception:
        plist = []
    # fallback: use keys from models list
    if not plist:
        try:
            plist = [p.get("name") for p in models.get("data", {}).get("data", {}).get("providers", []) if p.get("name")]
        except Exception:
            plist = []

    tests: List[Dict[str, Any]] = []
    for p in plist:
        # Pick a model from models list
        model = None
        base_url = None
        try:
            for entry in models.get("data", {}).get("data", {}).get("providers", []):
                if entry.get("name") == p:
                    arr = entry.get("models") or []
                    base_url = entry.get("base_url")
                    model = (arr[0] if arr else None)
                    # dashscope prefers qwen3-max if present
                    if p == "dashscope" and "qwen3-max" in arr:
                        model = "qwen3-max"
                    break
        except Exception:
            pass

        # basic user message
        messages = [{"role": "user", "content": "Hello from provider test"}]
        payload = {"messages": messages, "provider": p, "options": {"model": model, "max_tokens": 64}}
        res = await fetch_json(client, "POST", f"{BASE}/v1/ai/chat", json=payload)
        tests.append({"provider": p, "model": model, "base_url": base_url, "result": res})

    report["runs"] = tests
    return report


async def test_vision(client: httpx.AsyncClient) -> Dict[str, Any]:
    vis = {"models": None, "ocr_health": None, "vision_health": None, "vision_run": None}
    vis["models"] = await fetch_json(client, "GET", f"{BASE}/v1/vision/models")
    # health
    vis["vision_health"] = await fetch_json(client, "GET", f"{BASE}/v1/vision/health")
    # run a VL test against dashscope if available using a public image url
    image_url = "https://img.alicdn.com/imgextra/i1/O1CN01gDEY8M1W114Hi3XcN_!!6000000002727-0-tps-1024-406.jpg"
    body = {
        "image_data": image_url,  # backend supports url or base64
        "image_mime": "image/jpeg",
        "prompt": "请用中文简要描述图片，并输出严格的 JSON 对象 {\"summary\": string}",
        "provider": "dashscope",
        "model": "qwen3-vl-plus",
        "strict_json": False,
    }
    vis["vision_run"] = await fetch_json(client, "POST", f"{BASE}/v1/vision/understand?scene=screen_recognition_aliyun", json=body)
    return vis


async def main():
    async with httpx.AsyncClient() as client:
        out: Dict[str, Any] = {"base": BASE}
        out["ai"] = await test_ai_matrix(client)
        out["vision"] = await test_vision(client)

    # Save report
    os.makedirs("docs", exist_ok=True)
    with open("docs/BACKEND_PROVIDER_TEST_REPORT.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("Saved docs/BACKEND_PROVIDER_TEST_REPORT.json")


if __name__ == "__main__":
    asyncio.run(main())

