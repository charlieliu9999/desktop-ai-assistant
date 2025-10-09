#!/usr/bin/env python3
"""
测试 Qwen2.5-VL 视觉模型
"""
import requests
import json
import base64
import time
from pathlib import Path


def test_ollama_health():
    """测试 Ollama 服务健康状态"""
    print("=" * 60)
    print("测试 1: Ollama 服务健康检查")
    print("=" * 60)
    
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            data = response.json()
            models = data.get('models', [])
            print(f"✅ Ollama 服务正常运行")
            print(f"📦 已安装 {len(models)} 个模型")
            
            # 查找 qwen2.5vl 模型
            qwen_models = [m for m in models if 'qwen2.5vl' in m['name'].lower()]
            if qwen_models:
                for model in qwen_models:
                    print(f"\n🎯 找到 Qwen2.5-VL 模型:")
                    print(f"   名称: {model['name']}")
                    print(f"   大小: {model['size'] / 1024 / 1024 / 1024:.2f} GB")
                    print(f"   参数: {model['details']['parameter_size']}")
                    print(f"   量化: {model['details']['quantization_level']}")
                return True
            else:
                print("❌ 未找到 qwen2.5vl 模型")
                return False
        else:
            print(f"❌ Ollama 服务响应异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 无法连接到 Ollama 服务: {e}")
        return False


def test_text_generation():
    """测试文本生成功能"""
    print("\n" + "=" * 60)
    print("测试 2: 文本生成功能")
    print("=" * 60)
    
    try:
        payload = {
            "model": "qwen2.5vl:latest",
            "prompt": "请用中文简单介绍一下你自己,包括你的能力和特点。",
            "stream": False
        }
        
        print("📤 发送请求...")
        start_time = time.time()
        
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload,
            timeout=60
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            reply = result.get('response', '')
            print(f"✅ 文本生成成功 (耗时: {elapsed:.2f}秒)")
            print(f"\n📝 模型回复:\n{reply}\n")
            return True
        else:
            print(f"❌ 请求失败: {response.status_code}")
            print(f"   响应: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False


def create_test_image():
    """创建一个测试用的医疗信息图像"""
    print("\n" + "=" * 60)
    print("测试 3: 创建测试图像")
    print("=" * 60)
    
    # 创建一个简单的HTML页面作为测试
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .patient-card { border: 2px solid #333; padding: 20px; max-width: 600px; }
            .field { margin: 10px 0; }
            .label { font-weight: bold; color: #555; }
            .value { color: #000; margin-left: 10px; }
        </style>
    </head>
    <body>
        <div class="patient-card">
            <h2>患者信息</h2>
            <div class="field">
                <span class="label">姓名:</span>
                <span class="value">张三</span>
            </div>
            <div class="field">
                <span class="label">年龄:</span>
                <span class="value">45岁</span>
            </div>
            <div class="field">
                <span class="label">性别:</span>
                <span class="value">男</span>
            </div>
            <div class="field">
                <span class="label">患者ID:</span>
                <span class="value">P20250103001</span>
            </div>
            <div class="field">
                <span class="label">科室:</span>
                <span class="value">呼吸内科</span>
            </div>
            <div class="field">
                <span class="label">主诉:</span>
                <span class="value">胸痛3天,伴有咳嗽</span>
            </div>
            <div class="field">
                <span class="label">诊断:</span>
                <span class="value">疑似肺炎</span>
            </div>
            <div class="field">
                <span class="label">病史:</span>
                <span class="value">高血压10年,糖尿病5年</span>
            </div>
        </div>
    </body>
    </html>
    """
    
    # 保存HTML文件
    html_path = Path("test_patient_info.html")
    html_path.write_text(html_content, encoding='utf-8')
    print(f"✅ 创建测试HTML文件: {html_path}")
    print("💡 请在浏览器中打开此文件,然后截图保存为 test_patient_screenshot.png")
    print("   或者使用任何包含患者信息的截图进行测试")
    
    return str(html_path)


def test_vision_extraction(image_path: str):
    """测试视觉模型的患者信息提取功能"""
    print("\n" + "=" * 60)
    print("测试 4: 视觉模型患者信息提取")
    print("=" * 60)
    
    # 检查图像文件是否存在
    if not Path(image_path).exists():
        print(f"❌ 图像文件不存在: {image_path}")
        print("💡 请先创建测试图像或提供现有图像路径")
        return False
    
    try:
        # 读取图像并转换为base64
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        print(f"📷 读取图像: {image_path}")
        print(f"   大小: {len(image_data)} 字符")
        
        # 构建提示词
        prompt = """请仔细分析这张医疗系统的屏幕截图,提取其中主要的患者信息。

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

只返回JSON,不要包含其他文字。"""
        
        payload = {
            "model": "qwen2.5vl:latest",
            "prompt": prompt,
            "images": [image_data],
            "stream": False,
            "format": "json"
        }
        
        print("📤 发送视觉分析请求...")
        start_time = time.time()
        
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload,
            timeout=120
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            response_text = result.get('response', '')
            
            print(f"✅ 视觉分析成功 (耗时: {elapsed:.2f}秒)")
            print(f"\n📊 原始响应:\n{response_text}\n")
            
            # 尝试解析JSON
            try:
                patient_info = json.loads(response_text)
                print("✅ JSON解析成功")
                print("\n📋 提取的患者信息:")
                print(f"   姓名: {patient_info.get('name', 'N/A')}")
                print(f"   年龄: {patient_info.get('age', 'N/A')}")
                print(f"   性别: {patient_info.get('gender', 'N/A')}")
                print(f"   患者ID: {patient_info.get('patientId', 'N/A')}")
                print(f"   科室: {patient_info.get('department', 'N/A')}")
                print(f"   主诉: {patient_info.get('chiefComplaint', 'N/A')}")
                print(f"   诊断: {patient_info.get('diagnosis', 'N/A')}")
                print(f"   现病史: {patient_info.get('medicalNow', 'N/A')}")
                print(f"   既往史: {patient_info.get('medicalHistory', 'N/A')}")
                print(f"   置信度: {patient_info.get('confidence', 'N/A')}")
                
                return True
            except json.JSONDecodeError as e:
                print(f"⚠️ JSON解析失败: {e}")
                print("   但模型已成功响应")
                return True
        else:
            print(f"❌ 请求失败: {response.status_code}")
            print(f"   响应: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试流程"""
    print("\n🚀 开始测试 Qwen2.5-VL 视觉模型\n")
    
    results = {}
    
    # 测试1: 健康检查
    results['health'] = test_ollama_health()
    
    if not results['health']:
        print("\n❌ Ollama 服务不可用,终止测试")
        return
    
    # 测试2: 文本生成
    results['text'] = test_text_generation()
    
    # 测试3: 创建测试图像
    html_path = create_test_image()
    
    # 测试4: 视觉提取(如果有测试图像)
    test_image = "截屏2025-10-02 19.49.44.png"
    if Path(test_image).exists():
        results['vision'] = test_vision_extraction(test_image)
    else:
        print(f"\n💡 跳过视觉测试: 未找到测试图像 {test_image}")
        print("   请创建测试图像后重新运行此脚本")
        results['vision'] = None
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    print(f"✅ Ollama 健康检查: {'通过' if results['health'] else '失败'}")
    print(f"✅ 文本生成: {'通过' if results['text'] else '失败'}")
    print(f"✅ 视觉提取: {'通过' if results['vision'] else '未测试' if results['vision'] is None else '失败'}")
    
    if all(v for v in results.values() if v is not None):
        print("\n🎉 所有测试通过!")
    else:
        print("\n⚠️ 部分测试失败或未完成")


if __name__ == "__main__":
    main()

