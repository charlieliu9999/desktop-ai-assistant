#!/usr/bin/env node
// Frontend smoke tester: hits backend /v1/* endpoints as the renderer would
// Writes docs/FRONTEND_E2E_REPORT.md with real responses

import fs from 'fs';
import path from 'path';

function getApiOrigin() {
  // Prefer VITE_API_BASE_URL env (like renderer), fallback to 127.0.0.1:8010/api
  const raw = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010/api';
  try { const u = new URL(raw); return u.origin; } catch { return 'http://127.0.0.1:8010'; }
}

async function postJson(url, body) {
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await resp.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: resp.status, ok: resp.ok, json };
}

async function getJson(url) {
  const resp = await fetch(url);
  const text = await resp.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: resp.status, ok: resp.ok, json };
}

function b64File(p) {
  const buf = fs.readFileSync(p);
  return buf.toString('base64');
}

async function main() {
  const origin = getApiOrigin();
  const reportPath = path.join(process.cwd(), 'docs', 'FRONTEND_E2E_REPORT.md');
  const sec = [];
  const TS = new Date().toISOString();
  sec.push(`# Frontend E2E Smoke Report`);
  sec.push(`Generated: ${TS}`);
  sec.push(`Backend origin: ${origin}`);

  // 1) Health
  const health = await getJson(`${origin}/health`);
  sec.push(`\n## /health`);
  sec.push('```json'); sec.push(JSON.stringify(health.json, null, 2)); sec.push('```');

  // 2) AI chat providers quick test
  const providers = [
    { name: 'openai', model: 'gpt-4o-mini', scene: 'ai_chat' },
    { name: 'deepseek', model: 'deepseek-chat', scene: 'ai_chat' },
    { name: 'dashscope', model: 'qwen3-max', scene: 'ai_chat_aliyun' },
    { name: 'local', model: 'qwen2.5:32b', scene: 'ai_chat' },
  ];
  for (const p of providers) {
    const body = {
      provider: p.name,
      messages: [ { role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: 'hello' } ],
      options: { model: p.model, max_tokens: 32, temperature: 0 }
    };
    const url = `${origin}/v1/ai/chat?scene=${encodeURIComponent(p.scene)}`;
    const t0 = Date.now();
    const res = await postJson(url, body);
    const dt = Date.now() - t0;
    sec.push(`\n## /v1/ai/chat (${p.name}:${p.model}, scene=${p.scene}) [${dt}ms] status=${res.status}`);
    sec.push('```json'); sec.push(JSON.stringify(res.json, null, 2)); sec.push('```');
  }

  // 3) Vision quick test (DashScope)
  try {
    const imgDir = path.join(process.cwd(), 'tests', 'images');
    const files = fs.readdirSync(imgDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    if (files.length) {
      const f = files[0];
      const b64 = b64File(path.join(imgDir, f));
      const body = { image_data: `data:image/png;base64,${b64}`, image_mime: 'image/png', provider: 'dashscope', strict_json: true, schema_name: 'patient_info_v1' };
      const url = `${origin}/v1/vision/understand?scene=screen_recognition_aliyun`;
      const res = await postJson(url, body);
      sec.push(`\n## /v1/vision/understand (dashscope, scene=screen_recognition_aliyun, file=${f}) status=${res.status}`);
      sec.push('```json'); sec.push(JSON.stringify(res.json, null, 2)); sec.push('```');
    }
  } catch {}

  // 4) Voice STT quick test
  try {
    const wav = path.join(process.cwd(), 'tests', 'audio', '今天是什么天气.wav');
    if (fs.existsSync(wav)) {
      const b64 = b64File(wav);
      const body = { audio_data: b64, audio_mime: 'audio/wav', language: 'zh', model: 'base' };
      const url = `${origin}/v1/voice/stt?scene=voice_stt`;
      const res = await postJson(url, body);
      sec.push(`\n## /v1/voice/stt (scene=voice_stt, file=今天是什么天气.wav) status=${res.status}`);
      sec.push('```json'); sec.push(JSON.stringify(res.json, null, 2)); sec.push('```');
    }
  } catch {}

  fs.writeFileSync(reportPath, sec.join('\n'));
  console.log(`✅ Wrote ${reportPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });

