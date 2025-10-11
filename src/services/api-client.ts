/**
 * API 客户端服务
 * 封装所有后端 API 调用
 */

/**
 * 获取 API 基础 URL
 * 优先级：环境变量 > 默认值
 */
function getAPIBaseURL(): string {
  // 优先级1: Vite 环境变量
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 优先级2: 默认值
  return 'http://127.0.0.1:8010/api';
}

const API_BASE_URL = getAPIBaseURL();

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
class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async ping(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseURL.replace(/\/$/, '')}/health`);
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
    const url = `${this.baseURL}${endpoint}`;
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

  /**
   * 模型配置 API
   */
  async getAllConfigs(): Promise<AllConfigsResponse> {
    return this.request<AllConfigsResponse>('/model-config/configs');
  }

  async getScenarioConfig(scenario: string): Promise<ModelConfig> {
    return this.request<ModelConfig>(`/model-config/configs/${scenario}`);
  }

  async testModelConnection(
    request: ModelTestRequest
  ): Promise<ModelTestResponse> {
    return this.request<ModelTestResponse>('/model-config/test', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateScenarioConfig(
    scenario: string,
    config: ModelConfig
  ): Promise<any> {
    return this.request(`/model-config/configs/${scenario}`, {
      method: 'PUT',
      body: JSON.stringify({ config }),
    });
  }

  async getScenarios(): Promise<{
    scenarios: string[];
    descriptions: Record<string, string>;
  }> {
    return this.request('/model-config/scenarios');
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
      '/patient-extraction/extract',
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

强制规则以避免混淆：
- 只从中间或右侧的“患者信息/基本信息/诊断信息/医嘱录入”等主工作区面板提取信息。
- 忽略左侧或边栏区域的“患者列表/历史记录/导航/候选信息/列表卡片”等内容，切勿将列表中的其他患者信息混入结果。
- 如果画面中出现多个患者或多个卡片，优先选择包含字段“姓名/年龄/性别/ID号”的主要信息卡片；如仍存在歧义，选择居中且面积最大的卡片。
- 优先使用标注为“当前就诊/当前病历/基本信息”的区域内容。

请提取以下字段(如果图像中没有相关信息,则该字段设置为空字符串):
- name: 患者姓名
- age: 年龄(数字)
- gender: 性别(男/女/未知)
- patientId: 患者ID或病历号
- department: 就诊科室
- chiefComplaint: 主诉或症状描述
- diagnosis: 诊断(如果有)
- medicalHistory: 病史(如果有)

请严格按照以下JSON格式返回:
{
  "name": "患者姓名",
  "age": 年龄数字,
  "gender": "男/女/未知",
  "patientId": "患者ID",
  "department": "科室名称",
  "chiefComplaint": "主诉内容",
  "diagnosis": "诊断内容",
  "medicalNow": "现病史",
  "medicalHistory": "既往史",
  "confidence": 0.85
}

只返回JSON,不要包含其他文字。`;
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
            console.log('⚠️ 代码块JSON解析失败，回退文本解析:', e2);
            patientInfo = this.parsePatientInfoFromText(responseText);
          }
        } else {
          console.log('ℹ️ 未找到JSON代码块，回退文本解析');
          patientInfo = this.parsePatientInfoFromText(responseText);
        }
        console.log('📝 文本解析结果:', patientInfo);
      }

      return {
        success: true,
        patient_info: patientInfo,
        raw_content: responseText, // 添加原始内容
        full_response: result, // 添加完整响应
        error: null
      };

    } catch (error) {
      console.error('图片模型提取失败:', error);
      return {
        success: false,
        patient_info: null,
        error: error instanceof Error ? error.message : '图片模型提取失败'
      };
    }
  }

  /**
   * 从文本中解析患者信息 - 宽松解析，不严格要求每个字段
   */
  private parsePatientInfoFromText(text: string): any {
    console.log('📝 开始文本解析，原始文本:', text);
    
    // 宽松的文本解析逻辑
    const patientInfo: any = {
      rawText: text, // 保存原始文本
      extractedFields: {} // 记录提取到的字段
    };
    
    // 定义字段匹配规则
    const fieldPatterns = {
      name: [/姓名[：:]\s*([^\s\n,，]+)/, /患者[：:]\s*([^\s\n,，]+)/, /name[：:]\s*([^\s\n,，]+)/i],
      age: [/年龄[：:]\s*(\d+)/, /age[：:]\s*(\d+)/i],
      gender: [/性别[：:]\s*([男女])/, /gender[：:]\s*([男女])/i],
      patientId: [/患者ID[：:]\s*([^\s\n,，]+)/, /ID[：:]\s*([^\s\n,，]+)/i],
      department: [/科室[：:]\s*([^\s\n,，]+)/, /部门[：:]\s*([^\s\n,，]+)/i],
      chiefComplaint: [/主诉[：:]\s*([^\n]+)/, /症状[：:]\s*([^\n]+)/i],
      diagnosis: [/诊断[：:]\s*([^\n]+)/, /诊断结果[：:]\s*([^\n]+)/i],
      medicalHistory: [/病史[：:]\s*([^\n]+)/, /既往史[：:]\s*([^\n]+)/i]
    };

    // 尝试提取每个字段
    Object.entries(fieldPatterns).forEach(([field, patterns]) => {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          patientInfo[field] = match[1].trim();
          patientInfo.extractedFields[field] = match[1].trim();
          console.log(`✅ 提取到字段 ${field}:`, match[1].trim());
          break; // 找到第一个匹配就停止
        }
      }
    });

    // 如果没有提取到任何字段，尝试更宽松的匹配
    if (Object.keys(patientInfo.extractedFields).length === 0) {
      console.log('⚠️ 未提取到任何字段，尝试宽松匹配...');
      
      // 尝试提取数字（可能是年龄）
      const ageMatch = text.match(/(\d+)\s*岁/);
      if (ageMatch) {
        patientInfo.age = ageMatch[1];
        patientInfo.extractedFields.age = ageMatch[1];
        console.log('✅ 宽松匹配年龄:', ageMatch[1]);
      }

      // 尝试提取性别关键词
      if (text.includes('男') || text.includes('male')) {
        patientInfo.gender = '男';
        patientInfo.extractedFields.gender = '男';
        console.log('✅ 宽松匹配性别: 男');
      } else if (text.includes('女') || text.includes('female')) {
        patientInfo.gender = '女';
        patientInfo.extractedFields.gender = '女';
        console.log('✅ 宽松匹配性别: 女');
      }
    }

    console.log('📝 文本解析完成:', patientInfo);
    return patientInfo;
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
        medical_history: patientInfo.medical_history,
        recommendation_types: recommendationTypes || []
      };
    } else {
      request = patientInfoOrRequest as RecommendationGenerationRequest;
    }

    return this.request<RecommendationGenerationResponse>(
      '/patient-extraction/recommendations',
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
    types?: string[]
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

    const patientSummary = `姓名：${patient.name}\n性别：${patient.gender}\n年龄：${patient.age}\n患者ID：${patient.patient_id}\n` +
      (patient.department ? `科室：${patient.department}\n` : '') +
      (patient.chief_complaint ? `主诉：${patient.chief_complaint}\n` : '') +
      (patient.diagnosis ? `诊断：${patient.diagnosis}\n` : '') +
      (patient.medical_history ? `病史：${patient.medical_history}\n` : '');

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

    return { success: true, recommendations: { combined: full } as any };
  }
}

// 导出单例
export const apiClient = new APIClient();
export default apiClient;
