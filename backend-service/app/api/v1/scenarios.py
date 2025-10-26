"""
场景配置（只读API）。
"""
from fastapi import APIRouter, HTTPException
from loguru import logger

from typing import Optional
from app.registry import load_scenarios
from app.registry.models import ScenariosData, Scenario
from app.registry.store import save_scenarios


router = APIRouter(prefix="/scenarios")


@router.get("")
async def list_scenarios():
    try:
        scs = load_scenarios()
        return {"success": True, "data": [s.model_dump() for s in scs.scenarios]}
    except Exception as e:
        logger.error(f"list_scenarios error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def add_scenario(payload: dict):
    try:
        scs = load_scenarios()
        s = Scenario(**payload)
        scs.scenarios = [x for x in scs.scenarios if x.name != s.name] + [s]
        save_scenarios(scs)
        return {"success": True}
    except Exception as e:
        logger.error(f"add_scenario error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{name}")
async def update_scenario(name: str, payload: dict):
    try:
        scs = load_scenarios()
        found = False
        new_list = []
        for x in scs.scenarios:
            if x.name == name:
                data = x.model_dump()
                data.update(payload or {})
                new_list.append(Scenario(**data))
                found = True
            else:
                new_list.append(x)
        if not found:
            raise HTTPException(status_code=404, detail="scenario_not_found")
        scs.scenarios = new_list
        save_scenarios(scs)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_scenario error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{name}")
async def delete_scenario(name: str):
    try:
        scs = load_scenarios()
        before = len(scs.scenarios)
        scs.scenarios = [x for x in scs.scenarios if x.name != name]
        if len(scs.scenarios) == before:
            raise HTTPException(status_code=404, detail="scenario_not_found")
        save_scenarios(scs)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_scenario error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
