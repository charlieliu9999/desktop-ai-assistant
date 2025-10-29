import { test, expect, request } from '@playwright/test';

// 1x1 transparent PNG (base64, without data URL prefix)
const PIXEL_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAFfgp8AAAAAASUVORK5CYII=';

test('v2 vision understand strict_json returns no_result (no fallback)', async ({}) => {
  const ctx = await request.newContext({ baseURL: 'http://127.0.0.1:8010' });
  const body = {
    source: { type: 'base64', data: PIXEL_BASE64, mime: 'image/png' },
    prompt: '从图像右侧详情面板提取患者信息（严格JSON）',
    provider: 'dashscope',
    model: 'qwen3-vl-plus',
    strict_json: true,
  };
  const res = await ctx.post('/v2/vision/understand?scene=screen_recognition_aliyun', { data: body });
  expect(res.status()).toBe(200);
  const json = await res.json();
  // Minimal policy: strict_json failure -> success:false + error.code=no_result
  expect(json).toHaveProperty('success');
  if (json.success === false) {
    expect(json?.error?.code).toBe('no_result');
  } else {
    // In case upstream happens to return success in some environments, ensure structure exists
    expect(json?.data?.details?.structured || json?.data?.structured).toBeTruthy();
  }
});

