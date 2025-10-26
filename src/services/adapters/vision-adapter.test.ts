import { describe, it, expect, vi, beforeEach } from 'vitest';
import { visionAdapter } from './vision-adapter';

describe('VisionServiceAdapter.understandImage (backend path)', () => {
  const fakeResponse = {
    success: true,
    result: {
      description: 'ok',
      confidence: 0.9,
      structured: {
        patient_name: '赵华',
        gender: '女',
        age: 45,
        medical_record_number: '13391483',
        department: '急诊科',
        chief_complaint: '突发左侧肢体活动障碍、言语不清2小时',
        diagnosis: '急性缺血性脑卒中',
        medical_history: '高血压病史5年',
        confidence: 0.9
      },
      details: { model: 'qwen-vl-plus' }
    }
  } as any;

  beforeEach(() => {
    // 注入假的 apiClient.post，捕获参数
    const posts: any[] = [];
    const stub = {
      calls: posts,
      post: vi.fn(async (url: string, body: any) => {
        posts.push([url, body]);
        return fakeResponse;
      })
    } as any;
    (visionAdapter as any).apiClient = stub;
  });

  it('uses scene for dashscope and strict JSON without fallback', async () => {
    const res = await visionAdapter.understandImage({
      imageData: 'data:image/png;base64,AAA',
      imageMime: 'image/png',
      prompt: '',
      provider: 'dashscope',
      model: 'qwen-vl-plus',
      strictJson: true,
      allowFallback: false,
      schemaName: 'patient_info_v1'
    });
    const calls = (visionAdapter as any).apiClient.calls as any[];
    expect(calls.length).toBe(1);
    const [url, body] = calls[0];
    expect(String(url)).toContain('/v1/vision/understand?scene=screen_recognition_aliyun');
    expect(body.strict_json).toBe(true);
    expect(body.schema_name).toBe('patient_info_v1');
    // allow_fallback 未显式开启时不应出现
    expect('allow_fallback' in body).toBe(false);
    // 返回包含 structured，且字段透传在 details.structured
    expect((res as any).details?.structured?.patient_name).toBe('赵华');
  });

  it('sets allow_fallback flag only when true', async () => {
    await visionAdapter.understandImage({
      imageData: 'data:image/png;base64,AAA',
      imageMime: 'image/png',
      prompt: '',
      provider: 'dashscope',
      model: 'qwen-vl-plus',
      strictJson: true,
      allowFallback: true,
      schemaName: 'patient_info_v1'
    });
    const calls = (visionAdapter as any).apiClient.calls as any[];
    const [, body] = calls[0];
    expect(body.allow_fallback).toBe(true);
  });

  it('uses screen_recognition when provider is local', async () => {
    await visionAdapter.understandImage({
      imageData: 'data:image/png;base64,AAA',
      imageMime: 'image/png',
      prompt: '',
      provider: 'local',
      model: 'qwen2.5vl:latest',
      strictJson: true,
      schemaName: 'patient_info_v1'
    });
    const calls = (visionAdapter as any).apiClient.calls as any[];
    const [url] = calls[0];
    expect(String(url)).toContain('/v1/vision/understand?scene=screen_recognition');
  });
});

