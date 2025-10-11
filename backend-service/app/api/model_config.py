"""
模型配置管理 API
"""
from fastapi import APIRouter, HTTPException
from loguru import logger
import httpx
from typing import Dict, Any

from app.config import settings
from app.schemas.model_config import (
    ModelConfigSchema,
    AllConfigsResponse,
    ModelTestRequest,
    ModelTestResponse,
    UpdateConfigRequest,
    UpdateConfigResponse
)

router = APIRouter()


@router.get("/configs", response_model=AllConfigsResponse)
async def get_all_configs():
    """获取所有场景的模型配置"""
    try:
        scenarios = settings.get_all_scenarios()
        configs = {}
        
        for scenario in scenarios:
            config_dict = settings.get_model_config(scenario)
            configs[scenario] = ModelConfigSchema(
                model_name=config_dict["model_name"],
                base_url=config_dict["base_url"],
                temperature=config_dict["temperature"],
                max_tokens=config_dict["max_tokens"],
                timeout=settings.LOCAL_AI_TIMEOUT
            )
        
        return AllConfigsResponse(
            configs=configs,
            scenarios=scenarios
        )
    except Exception as e:
        logger.error(f"获取配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取配置失败: {str(e)}")


@router.get("/configs/{scenario}", response_model=ModelConfigSchema)
async def get_scenario_config(scenario: str):
    """获取指定场景的模型配置"""
    try:
        if scenario not in settings.get_all_scenarios():
            raise HTTPException(status_code=404, detail=f"场景 '{scenario}' 不存在")
        
        config_dict = settings.get_model_config(scenario)
        return ModelConfigSchema(
            model_name=config_dict["model_name"],
            base_url=config_dict["base_url"],
            temperature=config_dict["temperature"],
            max_tokens=config_dict["max_tokens"],
            timeout=settings.LOCAL_AI_TIMEOUT
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取场景配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取场景配置失败: {str(e)}")


@router.post("/test", response_model=ModelTestResponse)
async def test_model_connection(request: ModelTestRequest):
    """测试模型连通性"""
    try:
        logger.info(f"测试模型连通性: {request.model_name} @ {request.base_url}")
        
        # 1. 测试 Ollama 服务是否可用
        async with httpx.AsyncClient(timeout=request.timeout) as client:
            try:
                response = await client.get(f"{request.base_url}/api/tags")
                if response.status_code != 200:
                    return ModelTestResponse(
                        success=False,
                        message=f"Ollama 服务不可用: HTTP {response.status_code}",
                        error=f"HTTP {response.status_code}"
                    )
                
                # 2. 检查模型是否存在
                data = response.json()
                models = data.get('models', [])
                model_names = [m['name'] for m in models]
                
                # 查找匹配的模型
                model_found = None
                for model in models:
                    if model['name'] == request.model_name or request.model_name in model['name']:
                        model_found = model
                        break
                
                if not model_found:
                    return ModelTestResponse(
                        success=False,
                        message=f"模型 '{request.model_name}' 未找到",
                        error=f"可用模型: {', '.join(model_names)}"
                    )
                
                # 3. 测试模型生成(简单测试)
                test_payload = {
                    "model": request.model_name,
                    "prompt": "Hello",
                    "stream": False
                }
                
                test_response = await client.post(
                    f"{request.base_url}/api/generate",
                    json=test_payload,
                    timeout=request.timeout
                )
                
                if test_response.status_code != 200:
                    return ModelTestResponse(
                        success=False,
                        message=f"模型测试失败: HTTP {test_response.status_code}",
                        error=test_response.text
                    )
                
                # 成功
                model_info = {
                    "name": model_found['name'],
                    "size": f"{model_found['size'] / 1024 / 1024 / 1024:.2f} GB",
                    "parameter_size": model_found['details'].get('parameter_size', 'Unknown'),
                    "quantization": model_found['details'].get('quantization_level', 'Unknown'),
                    "family": model_found['details'].get('family', 'Unknown')
                }
                
                return ModelTestResponse(
                    success=True,
                    message=f"模型 '{request.model_name}' 连接成功",
                    model_info=model_info
                )
                
            except httpx.TimeoutException:
                return ModelTestResponse(
                    success=False,
                    message=f"连接超时: 无法在 {request.timeout} 秒内连接到 {request.base_url}",
                    error="连接超时"
                )
            except httpx.ConnectError:
                return ModelTestResponse(
                    success=False,
                    message=f"连接失败: 无法连接到 {request.base_url}",
                    error="连接失败,请确保 Ollama 服务正在运行"
                )
                
    except Exception as e:
        logger.error(f"测试模型连通性失败: {e}")
        return ModelTestResponse(
            success=False,
            message=f"测试失败: {str(e)}",
            error=str(e)
        )


@router.put("/configs/{scenario}", response_model=UpdateConfigResponse)
async def update_scenario_config(scenario: str, request: UpdateConfigRequest):
    """更新指定场景的模型配置
    
    注意: 此API仅更新运行时配置,不会持久化到.env文件
    要持久化配置,需要手动修改.env文件或使用配置管理系统
    """
    try:
        if scenario not in settings.get_all_scenarios():
            raise HTTPException(status_code=404, detail=f"场景 '{scenario}' 不存在")
        
        # 更新运行时配置
        scenario_upper = scenario.upper()
        setattr(settings, f"{scenario_upper}_MODEL", request.config.model_name)
        setattr(settings, f"{scenario_upper}_BASE_URL", request.config.base_url)
        setattr(settings, f"{scenario_upper}_TEMPERATURE", request.config.temperature)
        setattr(settings, f"{scenario_upper}_MAX_TOKENS", request.config.max_tokens)
        
        logger.info(f"更新场景 '{scenario}' 的配置: {request.config.model_name}")
        
        return UpdateConfigResponse(
            success=True,
            message=f"场景 '{scenario}' 的配置已更新(运行时)",
            config=request.config
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新配置失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新配置失败: {str(e)}")


@router.get("/scenarios")
async def get_all_scenarios():
    """获取所有支持的场景列表"""
    return {
        "scenarios": settings.get_all_scenarios(),
        "descriptions": {
            "ai_chat": "AI对话 - 通用对话和问答",
            "exam_recommendation": "检查项目推荐 - 根据患者信息推荐检查项目",
            "medication_recommendation": "用药推荐 - 根据诊断推荐用药方案",
            "diagnosis_suggestion": "诊断建议 - 根据症状提供诊断建议",
            "screen_recognition": "屏幕识别 - 从截图中提取患者信息"
        }
    }

