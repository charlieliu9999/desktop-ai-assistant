/**
 * API 客户端服务
 * 封装所有后端 API 调用
 */

/**
 * 获取 API 基础 URL
 * 优先级：环境变量 > 默认值
 */
function getAPIBaseURL(): string {
  const val = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010/api';
  return val;
}

function getAPIBaseOrigin(): string {
  const val = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010/api';
  try {
    const u = new URL(val);
    return u.origin;
  } catch {
    return 'http://127.0.0.1:8010';
  }
}

const API_BASE_URL = getAPIBaseURL();
const API_BASE_ORIGIN = getAPIBaseOrigin();

/**
 * 模型配置相关类型
 */
export interface ModelConfig {
  model_name: string;
  base_url: string;
  api_key?: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
}

export interface AllConfigsResponse {
  configs: Record<string, ModelConfig>;
  scenarios: string[];
}

export interface ModelTestRequest {
  model_name: string;
  base_url: string;
  timeout?: number;
}

export interface ModelTestResponse {
  success: boolean;
  message: string;
  model_info?: {
    name: string;
    size: string;
    parameter_size: string;
    quantization: string;
    family: string;
  };
  error?: string;
}

/**
 * 患者信息提取相关类型
 */
export interface PatientInfo {
  name: string;
  age: number;
  gender: string;
  patient_id: string;
  department?: string;
  chief_complaint?: string;
  diagnosis?: string;
  medical_history?: string;
}

export interface PatientExtractionRequest {
  image_data: string;
  prompt_template?: string;
}

export interface PatientExtractionResponse {
  success: boolean;
  patient_info: PatientInfo;
  confidence?: number;
  error?: string;
}

// 后端配置旗标
export interface ConfigFlags {
  model_lock: boolean;
}

/**
 * 推荐生成相关类型
 */
export interface RecommendationGenerationRequest {
  patient_name: string;
  gender: string;
  age: number;
  chief_complaint: string;
  medical_history?: string;
  recommendation_types: string[];
}

export interface RecommendationGenerationResponse {
  success: boolean;
  recommendations?: Record<string, any[]> | Record<string, string>;
  error?: string;
}

// 推荐模型配置
export interface AIRecommendConfig {
  enabled: boolean;
  provider: 'openai' | 'claude' | 'gemini' | 'local';
  apiKey?: string;
  apiUrl?: string;
  temperature: number;
  maxTokens: number;
  diagnosisModel: string;
  diagnosisPrompt?: string;
  examModel: string;
  examPrompt?: string;
  medicationModel: string;
  medicationPrompt?: string;
}

/**
 * API 客户端类
 */
export class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async ping(): Promise<boolean> {
    try {
      // 统一走服务根的 /health，避免出现 /api/health 404
      const resp = await fetch(`${API_BASE_ORIGIN}/health`);
      return resp.ok;
    } catch {
      return false;
    }
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // /v1/* 走服务根路径；其余沿用 baseURL（通常为 /api 前缀）
    const url = endpoint.startsWith('/v1/')
      ? `${API_BASE_ORIGIN}${endpoint}`
      : `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Convenience HTTP helpers for adapters that need generic calls
  async get<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...(init || {}), method: 'GET' });
  }
  async post<T = any>(endpoint: string, body?: any, init?: RequestInit): Promise<T> {
    const options: RequestInit = { ...(init || {}), method: 'POST' };
    if (body !== undefined) {
      (options as any).body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    return this.request<T>(endpoint, options);
  }
  async put<T = any>(endpoint: string, body?: any, init?: RequestInit): Promise<T> {
    const options: RequestInit = { ...(init || {}), method: 'PUT' };
    if (body !== undefined) {
      (options as any).body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    return this.request<T>(endpoint, options);
  }

  /**
   * 模型配置 API
   */
  async getAllConfigs(): Promise<AllConfigsResponse> {
    // Adapt legacy per-scenario config to v1 models config
    const cfg = await this.getModelsConfig();
    const data = cfg?.data || {};
    const scenarios = [
      'ai_chat',
      'screen_recognition',
      'diagnosis_suggestion',
      'exam_recommendation',
      'medication_recommendation',
    ];
    const defaults: Record<string, Pick<ModelConfig, 'temperature'|'max_tokens'>> = {
      ai_chat: { temperature: 0.7, max_tokens: 2000 },
      screen_recognition: { temperature: 0.1, max_tokens: 1000 },
      diagnosis_suggestion: { temperature: 0.5, max_tokens: 2000 },
      exam_recommendation: { temperature: 0.3, max_tokens: 2000 },
      medication_recommendation: { temperature: 0.3, max_tokens: 2000 },
    };
    const configs: Record<string, ModelConfig> = {};
    for (const sc of scenarios) {
      const scObj = (data && (data as any)[sc]) || {};
      const d = (defaults as any)[sc] || {};
      configs[sc] = {
        model_name: scObj.selected_model || '',
        base_url: scObj.base_url || '',
        temperature: d.temperature ?? 0.7,
        max_tokens: d.max_tokens ?? 1000,
        timeout: 60,
      };
    }
    return { configs, scenarios };
  }

  async getScenarioConfig(scenario: string): Promise<ModelConfig> {
    const cfg = await this.getAllConfigs();
    return cfg.configs[scenario] || { model_name: '', base_url: '', temperature: 0.7, max_tokens: 1000, timeout: 60 };
  }

  async testModelConnection(
    request: ModelTestRequest
  ): Promise<ModelTestResponse> {
    // Client-side connectivity test against Ollama-compatible endpoint
    const base = request.base_url.replace(/\/$/, '');
    try {
      // 1) list models
      const tagsResp = await fetch(`${base}/api/tags`);
      if (!tagsResp.ok) {
        return { success: false, message: `服务不可用: HTTP ${tagsResp.status}`, error: String(tagsResp.status) };
      }
      const tags = await tagsResp.json();
      const models = Array.isArray(tags?.models) ? tags.models : [];
      let modelFound: any = null;
      const names = models.map((m: any) => m?.name).filter(Boolean);
      for (const m of models) {
        if (!m?.name) continue;
        if (m.name === request.model_name || String(m.name).includes(request.model_name)) {
          modelFound = m; break;
        }
      }
      if (!modelFound) {
        return { success: false, message: `模型 '${request.model_name}' 未找到`, error: `可用模型: ${names.join(', ')}` };
      }
      // 2) simple generate
      const genResp = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: request.model_name, prompt: 'Hello', stream: false })
      });
      if (!genResp.ok) {
        return { success: false, message: `模型测试失败: HTTP ${genResp.status}`, error: await genResp.text() };
      }
      const mi = modelFound || {};
      return {
        success: true,
        message: `模型 '${request.model_name}' 可用`,
        model_info: {
          name: mi.name || request.model_name,
          size: mi.size || '',
          parameter_size: mi.parameter_size || '',
          quantization: mi.quantization || '',
          family: mi.family || ''
        }
      };
    } catch (e: any) {
      return { success: false, message: `测试失败: ${e?.message || e}`, error: String(e) };
    }
  }

  async updateScenarioConfig(
    scenario: string,
    config: ModelConfig
  ): Promise<any> {
    // Read-modify-write the v1 models config for the specific scenario
    const current = await this.getModelsConfig();
    const data = (current?.data as any) || {};
    if (!data[scenario]) data[scenario] = {};
    data[scenario].selected_model = config.model_name;
    data[scenario].base_url = config.base_url;
    await this.updateModelsConfig(data);
    return { success: true };
  }

  async getScenarios(): Promise<{
    scenarios: string[];
    descriptions: Record<string, string>;
  }> {
    const cfg = await this.getModelsConfig();
    const data = cfg?.data || {};
    const scenarios = Object.keys(data).filter((k) => (
      ['ai_chat','screen_recognition','diagnosis_suggestion','exam_recommendation','medication_recommendation'].includes(k)
    ));
    const descriptions: Record<string, string> = {
      ai_chat: '通用AI对话',
      screen_recognition: '屏幕视觉识别',
      diagnosis_suggestion: '诊断建议',
      exam_recommendation: '检查推荐',
      medication_recommendation: '用药推荐'
    };
    return { scenarios, descriptions };
  }

  // v1 config flags
  async getConfigFlags(): Promise<{ success: boolean; data: ConfigFlags }>{
    return this.request('/v1/config/flags');
  }
  async updateConfigFlags(flags: Partial<ConfigFlags>): Promise<{ success: boolean; data: ConfigFlags }>{
    return this.request('/v1/config/flags', { method: 'PUT', body: JSON.stringify(flags) });
  }
  // v1 general config
  async getFullConfig(): Promise<{ success: boolean; data: any }>{
    return this.request('/v1/config');
  }
  async getConfigKey<T = any>(key: string): Promise<{ success: boolean; data: Record<string, T> }>{
    return this.request(`/v1/config/${encodeURIComponent(key)}`);
  }
  async updateConfigKey<T = any>(key: string, value: T): Promise<{ success: boolean; data: Record<string, T> }>{
    return this.request(`/v1/config/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(value) });
  }

  // v1 models
  async getAIModels(): Promise<{ success: boolean; data: { providers: Array<{ name: string; models: string[] }> } }>{
    return this.request('/v1/ai/models');
  }
  async getVisionModels(): Promise<{ success: boolean; data: { default: string; models: string[] } }>{
    return this.request('/v1/vision/models');
  }
  async getVoiceModels(): Promise<{ success: boolean; data: { stt: { default: string; models: string[] }, tts: { default: string; models: string[] } } }>{
    return this.request('/v1/voice/models');
  }
  // v2 voice models
  async getVoiceModelsV2(): Promise<{ success: boolean; data: { stt: string[]; tts: string[] } }>{
    return this.request('/v2/voice/models');
  }
  async getVoiceHealthV2(): Promise<{ success: boolean; data: { services: { stt: { healthy: boolean; available: boolean }, tts: { healthy: boolean; available: boolean } } } }>{
    return this.request('/v2/voice/health');
  }

  // v1 config models (full models.json)
  async getModelsConfig(): Promise<{ success: boolean; data: any }>{
    return this.request('/v1/config/models');
  }
  async updateModelsConfig(configObj: any): Promise<{ success: boolean }>{
    return this.request('/v1/config/models', { method: 'PUT', body: JSON.stringify(configObj) });
  }
  async applyModelPreset(preset: any): Promise<{ success: boolean }>{
    return this.request('/v1/config/model-preset', { method: 'PUT', body: JSON.stringify(preset) });
  }

  /**
   * 患者信息提取 API - 使用配置的图片模型
   */
  async extractPatientInfo(
    imageDataOrRequest: string | PatientExtractionRequest,
    aiImageConfig?: any
  ): Promise<PatientExtractionResponse> {
    const request: PatientExtractionRequest = typeof imageDataOrRequest === 'string'
      ? { image_data: imageDataOrRequest }
      : imageDataOrRequest;

    // 如果提供了AI图片配置，则直接调用图片模型API
    if (aiImageConfig && aiImageConfig.enabled) {
      return this.extractPatientInfoWithImageModel(request, aiImageConfig);
    }

    // 否则使用后端API
    return this.request<PatientExtractionResponse>(
      '/v1/patient/extraction/extract',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * 使用配置的图片模型直接提取患者信息
   * 基于 test_image_processing.py 的成功实现
   */
  private async extractPatientInfoWithImageModel(
    request: PatientExtractionRequest,
    aiImageConfig: any
  ): Promise<PatientExtractionResponse> {
    try {
      // 提取base64图片数据（去掉data:image前缀）
      const base64Data = request.image_data.includes('data:image') 
        ? request.image_data.split(',')[1] 
        : request.image_data;

      // 组装提示词：优先使用配置中的 systemPrompt，再附加结构化字段要求
      const systemPrompt = (aiImageConfig?.systemPrompt || '').trim();
            const structuredGuide = `请仔细分析这张医疗系统的屏幕截图,提取其中主要的患者信息。

强制规则（很重要）：
- 仅从“右侧详情/信息面板”提取（如：基本信息/诊断信息/医嘱录入/病历详情）。
- 严格忽略左侧边栏与“中间患者列表/历史记录/导航/候选卡片/表格行”等内容，绝对不要从列表或卡片集合中取值。
- 如画面出现多个候选区域，优先选择标注为“当前就诊/当前病历/基本信息”的详情区域；若仍不确定，选择最靠右且面积最大的详情面板。
- 字段必须来自同一位患者的同一详情面板，不要把不同患者的内容混在一起。
- 姓名规则：必须来自详情面板内标注为“姓名/患者姓名/name”的字段，不得从患者列表/卡片标题/表格行中取值。
- 年龄规则：优先使用详情面板中标注“年龄”的字段（如“年龄：65岁”），仅输出0-120的整数；如出现“出生日期/生日”，不要自行推算年龄，除非截图中同时有明确“年龄”字段；若数值可疑或不一致，输出0。

请提取以下字段(没有则置空；年龄未知填0)：
- name: 患者姓名
- age: 年龄(数字)
- gender: 性别(男/女/未知)
- patientId: 患者ID或病历号
- department: 就诊科室
- chiefComplaint: 主诉或症状描述
- diagnosis: 诊断(如果有)
- medicalHistory: 病史(如果有)

请严格按照以下JSON格式返回(仅JSON，不要解释)：
{
  "name": "",
  "age": 0,
  "gender": "",
  "patientId": "",
  "department": "",
  "chiefComplaint": "",
  "diagnosis": "",
  "medicalNow": "",
  "medicalHistory": "",
  "confidence": 0.85
}`;
      const prompt = systemPrompt ? `${systemPrompt}

${structuredGuide}` : structuredGuide;

      // 规范化本地提供商（Ollama）的端点为 /api/generate
      const isLocal = (aiImageConfig?.provider || 'local') === 'local';
      let endpoint = aiImageConfig?.apiUrl || (isLocal
        ? 'http://localhost:11434/api/generate'
        : '');

      if (isLocal) {
        try {
          const u = new URL(endpoint);
          // 如果是 OpenAI 兼容的 /v1/chat/completions，改为 /api/generate
          if (u.pathname.startsWith('/v1')) {
            endpoint = `${u.origin}/api/generate`;
          } else if (!u.pathname.startsWith('/api/generate')) {
            // 非预期路径时，强制改为 /api/generate
            endpoint = `${u.origin}/api/generate`;
          }
        } catch {
          // 如果无法解析URL，则回退到默认
          endpoint = 'http://localhost:11434/api/generate';
        }
      }

      // 使用 Ollama generate 请求体（本地 provider）
      const ollamaRequest = {
        model: aiImageConfig?.model || 'qwen2.5vl:latest',
        prompt,
        images: [base64Data],
        stream: false,
        format: 'json',
        options: {
          temperature: typeof aiImageConfig?.temperature === 'number' ? aiImageConfig.temperature : 0.1,
          num_predict: typeof aiImageConfig?.maxTokens === 'number' ? aiImageConfig.maxTokens : 1000
        }
      } as any;

      // 目前仅支持本地（Ollama）视觉识别。云端(OpenAI等)可后续扩展。
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(aiImageConfig.apiKey && { 'Authorization': `Bearer ${aiImageConfig.apiKey}` })
        },
        body: JSON.stringify(ollamaRequest)
      });

      if (!response.ok) {
        throw new Error(`图片模型API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const responseText = (result && (result.response || result.message || '')) || '';

      // 打印接收的完整数据 - 参考测试代码
      const timestamp = new Date().toISOString();
      console.log('🔍 图片识别接收的完整数据:', {
        timestamp,
        fullResponse: result,
        responseText: responseText,
        responseLength: responseText.length
      });
      
      // 在timestamp中显示返回数据
      console.log(`📅 [${timestamp}] 模型识别结果:`, responseText);

      // 解析JSON响应：容错处理，剥离代码块/非JSON前后缀
      let patientInfo: any;
      try {
        // 尝试直接解析
        patientInfo = JSON.parse(responseText);
        console.log('✅ JSON解析成功:', patientInfo);
      } catch (e) {
        console.log('⚠️ 直接JSON解析失败，尝试提取代码块中的JSON');
        const codeBlockMatch = responseText.match(/```json[\s\S]*?({[\s\S]*?})[\s\S]*?```/) || responseText.match(/({[\s\S]*})/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          try {
            patientInfo = JSON.parse(codeBlockMatch[1]);
            console.log('✅ 代码块JSON解析成功:', patientInfo);
          } catch (e2) {
        console.log('⚠️ 代码块JSON解析失败，放弃回退解析');
        patientInfo = null as any;
          }
        } else {
          console.log('ℹ️ 未找到JSON代码块，放弃回退解析');
          patientInfo = null as any;
        }
        console.log('📝 JSON解析结果:', patientInfo);
      }

      if (!patientInfo || typeof patientInfo !== 'object') {
        return { success: false, patient_info: { name: '', age: 0, gender: '', patient_id: '' } as any, error: 'no_result' } as any;
      }

      return {
        success: true,
        patient_info: patientInfo,
        raw_content: responseText, // 添加原始内容
        full_response: result // 添加完整响应
      } as any;

    } catch (error) {
      console.error('图片模型提取失败:', error);
      return { success: false, patient_info: { name: '', age: 0, gender: '', patient_id: '' }, error: 'no_result' } as any;
    }
  }


  /**
   * 推荐生成 API
   */
  async generateRecommendations(
    patientInfoOrRequest: PatientInfo | RecommendationGenerationRequest,
    recommendationTypes?: string[]
  ): Promise<RecommendationGenerationResponse> {
    let request: RecommendationGenerationRequest;

    // 如果第一个参数是 PatientInfo,转换为 RecommendationGenerationRequest
    if ('patient_id' in patientInfoOrRequest) {
      const patientInfo = patientInfoOrRequest as PatientInfo;
      request = {
        patient_name: patientInfo.name,
        gender: patientInfo.gender,
        age: patientInfo.age,
        chief_complaint: patientInfo.chief_complaint || '',
        medical_history: patientInfo.medical_history || '',
        recommendation_types: recommendationTypes || []
      };
    } else {
      request = patientInfoOrRequest as RecommendationGenerationRequest;
    }

    return this.request<RecommendationGenerationResponse>(
      '/v1/patient/extraction/recommendations',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * 直接使用配置的文本模型生成 Markdown 风格推荐（不依赖后端）
   */
  async generateRecommendationsWithAI(
    patient: PatientInfo,
    types: string[],
    cfg: AIRecommendConfig
  ): Promise<RecommendationGenerationResponse> {
    const isLocal = (cfg.provider || 'local') === 'local';
    let endpoint = cfg.apiUrl || (isLocal ? 'http://127.0.0.1:11434/v1/chat/completions' : '');

    // 规范化：如果误填了 /api/generate，则切回聊天端点
    try {
      const u = new URL(endpoint);
      if (u.pathname.startsWith('/api/')) {
        endpoint = `${u.origin}/v1/chat/completions`;
      }
    } catch {
      endpoint = 'http://127.0.0.1:11434/v1/chat/completions';
    }

    const patientSummary = `姓名：${patient.name}\n性别：${patient.gender}\n年龄：${patient.age}\n患者ID：${patient.patient_id}\n` +
      (patient.department ? `科室：${patient.department}\n` : '') +
      (patient.chief_complaint ? `主诉：${patient.chief_complaint}\n` : '') +
      (patient.diagnosis ? `诊断：${patient.diagnosis}\n` : '') +
      (patient.medical_history ? `病史：${patient.medical_history}\n` : '');

    const buildPayload = (model: string, prompt: string) => ({
      model,
      messages: [
        { role: 'system', content: '你是资深临床智能助手，请基于患者信息提供专业建议，输出为中文Markdown。' },
        { role: 'user', content: `${prompt}\n\n患者信息：\n${patientSummary}` }
      ],
      temperature: typeof cfg.temperature === 'number' ? cfg.temperature : 0.3,
      max_tokens: typeof cfg.maxTokens === 'number' ? cfg.maxTokens : 1200,
      stream: false
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

    const results: Record<string, string> = {};

    // 针对每个类型分别调用
    for (const t of types) {
      let model = cfg.diagnosisModel;
      let prompt = cfg.diagnosisPrompt || '请根据患者信息生成可能的诊断列表，采用有序列表，并给出简短依据与置信度（0-1）。';
      if (t === 'exam') {
        model = cfg.examModel;
        prompt = cfg.examPrompt || '请根据患者信息列出需要完善的检查项目（血常规、生化、影像等），采用有序列表，并说明每项的目的和预期价值。';
      } else if (t === 'medication') {
        model = cfg.medicationModel;
        prompt = cfg.medicationPrompt || '请根据患者信息给出初步用药建议（如有禁忌需注明），采用有序列表，并说明每种药物的适应理由。';
      }

      const payload = buildPayload(model, prompt);
      try {
        const resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || '';
        results[t] = content || '（无内容）';
      } catch (e) {
        results[t] = `生成失败：${e instanceof Error ? e.message : '未知错误'}`;
      }
    }

    return { success: true, recommendations: results };
  }

  /**
   * 合并一次调用，生成诊断/检查/用药三部分（Markdown），支持流式回调
   */
  async generateCombinedRecommendationsStream(
    patient: PatientInfo,
    cfg: AIRecommendConfig,
    onChunk?: (chunk: string) => void,
    types?: string[],
    rawPatientText?: string
  ): Promise<RecommendationGenerationResponse> {
    const isLocal = (cfg.provider || 'local') === 'local';
    let endpoint = cfg.apiUrl || (isLocal ? 'http://127.0.0.1:11434/v1/chat/completions' : '');
    try {
      const u = new URL(endpoint);
      if (u.pathname.startsWith('/api/')) {
        endpoint = `${u.origin}/v1/chat/completions`;
      }
    } catch {
      endpoint = 'http://127.0.0.1:11434/v1/chat/completions';
    }

    // 构建患者信息摘要：优先使用模型原文文本，其次使用结构化字段
    let patientSummary = '';
    const allBlank = !patient?.name && !patient?.gender && !patient?.age && !patient?.patient_id
      && !patient?.department && !patient?.chief_complaint && !patient?.diagnosis && !patient?.medical_history;
    if (rawPatientText && rawPatientText.trim().length > 0) {
      patientSummary = rawPatientText.trim();
    } else if (!allBlank) {
      patientSummary = `姓名：${patient.name}\n性别：${patient.gender}\n年龄：${patient.age}\n患者ID：${patient.patient_id}\n` +
        (patient.department ? `科室：${patient.department}\n` : '') +
        (patient.chief_complaint ? `主诉：${patient.chief_complaint}\n` : '') +
        (patient.diagnosis ? `诊断：${patient.diagnosis}\n` : '') +
        (patient.medical_history ? `病史：${patient.medical_history}\n` : '');
    } else {
      // 没有任何可用信息：直接返回错误，阻止无效推理
      return { success: false, recommendations: { combined: '' } as any, error: 'empty_patient_info' };
    }

    const selected = types && types.length ? types : ['diagnosis','exam','medication'];
    const parts: string[] = [];
    if (selected.includes('diagnosis')) parts.push(cfg.diagnosisPrompt || '请根据患者信息生成可能的诊断列表，采用有序列表，附简短依据与置信度（0-1）。');
    if (selected.includes('exam')) parts.push(cfg.examPrompt || '请根据患者信息列出需要完善的检查项目（血常规、生化、影像等），采用有序列表，并说明每项的目的和预期价值。');
    if (selected.includes('medication')) parts.push(cfg.medicationPrompt || '请根据患者信息给出初步用药建议（如有禁忌需注明），采用有序列表，并说明每种药物的适应理由。');
    let structure = '请将输出组织为以下Markdown结构：\n';
    if (selected.includes('diagnosis')) structure += '## 诊断建议\n- 使用有序列表，简短依据与置信度（0-1）。\n\n';
    if (selected.includes('exam')) structure += '## 检查项目推荐\n- 使用有序列表，说明目的与预期价值。\n\n';
    if (selected.includes('medication')) structure += '## 用药建议\n- 使用有序列表，如有禁忌需注明，说明理由。\n';
    const prompt = (parts.join('\n\n') + '\n\n' + structure).trim();

    const payload = {
      model: cfg.diagnosisModel || 'qwen3:30b',
      messages: [
        { role: 'system', content: '你是资深临床智能助手，请基于患者信息一次性输出诊断/检查/用药建议，使用中文Markdown。不要输出任何开头说明或结束总结，不要致谢或免责声明，仅输出内容本身。' },
        { role: 'user', content: `${prompt}\n\n患者信息：\n${patientSummary}\n\n只输出上述三部分的Markdown内容，不要任何额外说明。` }
      ],
      temperature: typeof cfg.temperature === 'number' ? cfg.temperature : 0.3,
      max_tokens: typeof cfg.maxTokens === 'number' ? cfg.maxTokens : 2000,
      stream: !!onChunk
    } as any;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

    const resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!resp.ok) {
      return { success: false, recommendations: { combined: `生成失败：${resp.status} ${resp.statusText}` } as any, error: 'http_error' };
    }

    let full = '';
    if (onChunk && resp.body) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const data = line.replace(/^data:\s*/, '');
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || '';
            if (delta) {
              full += delta;
              onChunk(delta);
            }
          } catch {
            // 忽略解析失败的片段
          }
        }
      }
    } else {
      const data = await resp.json();
      full = data?.choices?.[0]?.message?.content || '';
    }

    if (!full || full.trim().length === 0) {
      return { success: false, recommendations: { combined: '' } as any, error: 'empty_recommendation' };
    }

    return { success: true, recommendations: { combined: full } as any };
  }
}

// 导出单例
export const apiClient = new APIClient();
export default apiClient;
