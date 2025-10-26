"""
DashScope (Aliyun) Vision client using OpenAI-compatible chat.completions API.

Builds a content array with image_url (data URL) + text, then posts to
{base_url}/chat/completions.
"""
from __future__ import annotations

from typing import Optional, Tuple, Any
from loguru import logger
import httpx


async def understand_image(
    *,
    image_input: str,
    text: str,
    model: str,
    api_base: str,
    api_key: Optional[str],
    image_mime: str = "image/png",
    temperature: float = 0.2,
    max_tokens: int = 1000,
    force_json: bool = False,
) -> Tuple[str, Optional[dict]]:
    """
    Call DashScope chat.completions with an image+text mixed content.

    Returns (content, usage_dict or None).
    """
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    # Build image content: accept data URL / http(s) URL / pure base64
    if image_input.startswith("data:"):
        img_url = image_input
    elif image_input.startswith("http://") or image_input.startswith("https://"):
        img_url = image_input
    else:
        # assume pure base64
        img_url = f"data:{image_mime};base64,{image_input}"

    user_content = [
        {"type": "image_url", "image_url": {"url": img_url}}
    ]
    # 在 user 消息内不再强行拼接大段提示，改为 system 注入（更符合 OpenAI 兼容语义）
    if not force_json and text:
        user_content.append({"type": "text", "text": text})

    messages = []
    if force_json and text:
        messages.append({"role": "system", "content": text})
    messages.append({"role": "user", "content": user_content})

    body = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    # 强制 JSON（若 DashScope 兼容该字段则会生效；不兼容时服务器会忽略）
    if force_json:
        body["response_format"] = {"type": "json_object"}

    url = api_base.rstrip("/") + "/chat/completions"
    logger.info(f"DashScope vision call: model={model}, base={api_base}")

    # 诊断日志（不记录图片base64）
    try:
        logger.info(
            "DashScope vision request meta: model=%s, force_json=%s, temp=%.2f, max_tokens=%s",
            model,
            force_json,
            temperature,
            max_tokens,
        )
    except Exception:
        pass

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code != 200:
            logger.error(f"DashScope vision error: HTTP {resp.status_code} {resp.text[:300]}")
            raise RuntimeError(f"dashscope_http_{resp.status_code}")
        data = resp.json()
        try:
            from json import dumps as _dumps
            logger.info("DashScope raw response: %s", (_dumps(data, ensure_ascii=False)[:500]))
        except Exception:
            pass
        try:
            raw_content = data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"DashScope parse error: {e}; data={str(data)[:300]}")
            raise
        usage = data.get("usage")
        content = _ensure_text(raw_content)
        return content, usage


def _ensure_text(value: Any) -> str:
    """
    DashScope 的 content 可能是字符串，也可能是 OpenAI 兼容的数组。
    将其规整为字符串，便于后续 JSON 解析。
    """
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple)):
        parts: list[str] = []
        for item in value:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                # OpenAI 兼容：{"type": "text", "text": "..."}
                text_value = item.get("text") or item.get("content")
                if text_value is not None:
                    parts.append(_ensure_text(text_value))
            else:
                parts.append(str(item))
        return "".join(parts)
    if isinstance(value, dict):
        # 某些实现会返回 {"text": "..."} 或 {"content": "..."}
        for key in ("text", "content", "value"):
            if key in value:
                return _ensure_text(value[key])
        return str(value)
    return str(value)
