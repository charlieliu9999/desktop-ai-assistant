"""
工具与集成功能 API（搜索等）
"""
from fastapi import APIRouter, HTTPException, Query
from loguru import logger
import httpx
import os

from app.config_models import load_config


router = APIRouter(prefix="/tools")


@router.get("/search")
async def web_search(
    q: str = Query(..., description="查询关键词"),
    provider: str = Query('duckduckgo'),
    max_results: int = 5,
):
    """基础网络搜索接口。

    支持提供商：
    - duckduckgo/ddg（无需 Key，HTML 解析，结构可能变化）
    - serpapi（需要 SerpAPI API Key，返回 Google 搜索结果）
    """
    try:
        p = (provider or '').lower().strip()
        if p in ('ddg',):
            p = 'duckduckgo'

        if p == 'duckduckgo':
            url = f"https://duckduckgo.com/html/?q={q}"
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                if resp.status_code != 200:
                    return {"success": False, "error": f"http_{resp.status_code}"}
                html = resp.text

            # 极简解析（非常脆弱，仅作为占位）
            import re
            items = []
            for m in re.finditer(r'<a rel="nofollow" class="result__a" href="(.*?)".*?>(.*?)</a>', html, re.DOTALL):
                link = m.group(1)
                title = re.sub(r'<.*?>', '', m.group(2))
                items.append({"title": title, "url": link, "snippet": ""})
                if len(items) >= max_results:
                    break

            return {
                "success": True,
                "data": {
                    "results": items,
                    "totalResults": len(items),
                    "provider": "duckduckgo",
                    "query": q,
                },
            }

        if p == 'serpapi':
            # 从运行期模型配置文件读取 API Key（前端可通过 /v1/config/models 更新），或从环境变量读取
            try:
                cfg = load_config()
                key = getattr(getattr(cfg, 'web_search', None), 'apiKey', None) or os.getenv('SERPAPI_API_KEY', '')
            except Exception:
                key = os.getenv('SERPAPI_API_KEY', '')

            if not key:
                return {"success": False, "error": "missing_api_key: serpapi"}

            params = {
                "engine": "google",
                "q": q,
                "num": max_results,
                "api_key": key,
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://serpapi.com/search.json",
                    params=params,
                    headers={"User-Agent": "DesktopAIAssistant/1.0"},
                )
                if resp.status_code != 200:
                    return {"success": False, "error": f"http_{resp.status_code}"}
                data = resp.json()

            organic = data.get('organic_results') or []
            items = []
            for it in organic[:max_results]:
                title = it.get('title') or ''
                link = it.get('link') or ''
                snippet = it.get('snippet') or ''
                if link:
                    items.append({"title": title, "url": link, "snippet": snippet})

            return {
                "success": True,
                "data": {
                    "results": items,
                    "totalResults": len(items),
                    "provider": "serpapi",
                    "query": q,
                },
            }

        return {"success": False, "error": f"provider_not_supported: {provider}"}
    except Exception as e:
        logger.error(f"web_search error: {e}")
        return {"success": False, "error": str(e)}

