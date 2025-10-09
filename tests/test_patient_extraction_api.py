#!/usr/bin/env python3
"""
测试患者信息提取 API
"""
import requests
import json
import base64
from pathlib import Path


def create_test_image():
    """创建测试图像(简单的文本图像)"""
    from PIL import Image, ImageDraw, ImageFont
    
    # 创建白色背景图像
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    # 使用默认字体
    try:
        font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 24)
    except:
        font = ImageFont.load_default()
    
    # 绘制患者信息
    y = 50
    info = [
        "患者信息",
        "",
        "姓名: 张三",
        "年龄: 45岁",
        "性别: 男",
        "患者ID: P20250103001",
        "科室: 呼吸内科",
        "主诉: 胸痛3天,伴有咳嗽",
        "诊断: 疑似肺炎",
        "病史: 高血压10年,糖尿病5年"
    ]
    
    for line in info:
        draw.text((50, y), line, fill='black', font=font)
        y += 40
    
    # 保存图像
    img_path = Path("test_patient_image.png")
    img.save(img_path)
    print(f"✅ 创建测试图像: {img_path}")
    
    return img_path


def test_patient_extraction():
    """测试患者信息提取"""
    print("=" * 60)
    print("测试患者信息提取 API")
    print("=" * 60)
    
    # 创建测试图像
    img_path = create_test_image()
    
    # 读取图像并转换为 base64
    with open(img_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')
    
    # 调用 API
    url = "http://localhost:8010/api/patient-extraction/extract"
    payload = {
        "image_data": image_data,
        "prompt_template": "medical_patient_info"
    }
    
    print(f"\n📤 发送请求到: {url}")
    print(f"📦 图像大小: {len(image_data)} 字符")
    
    try:
        response = requests.post(url, json=payload, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ 请求成功")
            print(f"\n📊 提取结果:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            if result.get('success'):
                patient_info = result.get('patient_info', {})
                print(f"\n🎯 患者信息:")
                print(f"   姓名: {patient_info.get('name', 'N/A')}")
                print(f"   年龄: {patient_info.get('age', 'N/A')}")
                print(f"   性别: {patient_info.get('gender', 'N/A')}")
                print(f"   患者ID: {patient_info.get('patientId', 'N/A')}")
                print(f"   科室: {patient_info.get('department', 'N/A')}")
                print(f"   主诉: {patient_info.get('chiefComplaint', 'N/A')}")
                print(f"   诊断: {patient_info.get('diagnosis', 'N/A')}")
                print(f"   病史: {patient_info.get('medicalHistory', 'N/A')}")
                print(f"   置信度: {patient_info.get('confidence', 'N/A')}")
            else:
                print(f"\n❌ 提取失败: {result.get('error')}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
            print(f"   响应: {response.text}")
    
    except Exception as e:
        print(f"\n❌ 请求异常: {e}")


def test_recommendations():
    """测试推荐生成"""
    print("\n" + "=" * 60)
    print("测试推荐生成 API")
    print("=" * 60)
    
    url = "http://localhost:8010/api/patient-extraction/recommendations"
    payload = {
        "patient_name": "张三",
        "gender": "男",
        "age": 45,
        "chief_complaint": "胸痛3天,伴有咳嗽",
        "medical_history": "高血压10年,糖尿病5年",
        "recommendation_types": ["exam", "medication", "diagnosis"]
    }
    
    print(f"\n📤 发送请求到: {url}")
    print(f"📦 患者信息: {payload['patient_name']}, {payload['age']}岁, {payload['gender']}")
    print(f"📦 推荐类型: {payload['recommendation_types']}")
    
    try:
        response = requests.post(url, json=payload, timeout=180)
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ 请求成功")
            
            if result.get('success'):
                recommendations = result.get('recommendations', {})
                
                for rec_type, recs in recommendations.items():
                    print(f"\n🎯 {rec_type.upper()} 推荐 ({len(recs)} 条):")
                    for i, rec in enumerate(recs, 1):
                        print(f"\n   {i}. {rec.get('title', 'N/A')}")
                        for key, value in rec.items():
                            if key != 'title':
                                print(f"      {key}: {value}")
            else:
                print(f"\n❌ 生成失败: {result.get('error')}")
        else:
            print(f"\n❌ 请求失败: {response.status_code}")
            print(f"   响应: {response.text}")
    
    except Exception as e:
        print(f"\n❌ 请求异常: {e}")


if __name__ == "__main__":
    # 测试患者信息提取
    test_patient_extraction()
    
    # 测试推荐生成
    test_recommendations()
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

