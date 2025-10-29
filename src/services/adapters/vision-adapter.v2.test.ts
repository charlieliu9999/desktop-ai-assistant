import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { visionAdapter } from './vision-adapter';
import { setFeatureFlag } from './feature-flags';

describe('VisionServiceAdapter v2 understand (backend path)', () => {
  const fakeResponse = {
    success: true,
    result: {
      description: 'ok',
      confidence: 0.9,
      details: { structured: { patient_name: '张三' } },
      structured: { patient_name: '张三' },
    },
  } as any;

  beforeEach(() => {
    setFeatureFlag('USE_BACKEND_VISION_V2', true);
    const posts: any[] = [];
    const stub = {
      calls: posts,
      post: vi.fn(async (url: string, body: any) => {
        posts.push([url, body]);
        return fakeResponse;
      }),
    } as any;
    (visionAdapter as any).apiClient = stub;
  });

  afterEach(() => {
    setFeatureFlag('USE_BACKEND_VISION_V2', false);
  });

  it('uses /v2/vision/understand with source payload when v2 flag is on', async () => {
    await visionAdapter.understandImage({
      imageData: 'AAA',
      imageMime: 'image/png',
      prompt: '识别',
      provider: 'dashscope',
      model: 'qwen-vl-plus',
      strictJson: true,
      allowFallback: false,
      schemaName: 'patient_info_v1',
    } as any);
    const calls = (visionAdapter as any).apiClient.calls as any[];
    expect(calls.length).toBe(1);
    const [url, body] = calls[0];
    expect(String(url)).toContain('/v2/vision/understand?scene=screen_recognition_aliyun');
    expect(body?.source?.data).toBe('AAA');
    expect(body?.prompt).toBe('识别');
    expect(body?.strict_json).toBe(true);
  });
});

