from fastapi.testclient import TestClient
from app.main import app


def test_scene_prompt_version_is_consistent():
    client = TestClient(app)
    r = client.get('/v1/scenarios')
    assert r.status_code == 200
    data = r.json().get('data') or []
    # pick aliyun scene first, then local
    scene = next((s for s in data if s.get('name') == 'screen_recognition_aliyun'), None)
    if scene is None:
        scene = next((s for s in data if s.get('name') == 'screen_recognition'), None)
    assert scene is not None
    # 绑定的提示词与版本应明确
    assert scene.get('prompt_id') == 'screen_recognition_cn'
    assert scene.get('prompt_version') == '20251023T10081'

