#!/bin/bash

# 脚本: 将旧的服务代码迁移到legacy目录
# 用途: 为新架构腾出空间，同时保留旧代码供参考
# 日期: 2025-10-10

set -e  # 遇到错误立即退出

echo "========================================="
echo "开始迁移服务代码到legacy目录"
echo "========================================="

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}项目根目录: $PROJECT_ROOT${NC}"

# 确保legacy目录存在
echo -e "\n${GREEN}1. 创建legacy目录...${NC}"
mkdir -p src/services/legacy

# 需要迁移的服务文件列表
SERVICES=(
    "ai.ts"
    "patient-info-extractor.ts"
    "desktop-recognition.ts"
    "voice.ts"
    "voice-recognition.ts"
    "bisheng.ts"
    "medical-integration.ts"
    "web-search.ts"
    "screenshot.ts"
)

# 迁移服务文件
echo -e "\n${GREEN}2. 迁移服务文件到legacy目录...${NC}"
for service in "${SERVICES[@]}"; do
    if [ -f "src/services/$service" ]; then
        echo -e "  ${YELLOW}迁移: $service${NC}"
        git mv "src/services/$service" "src/services/legacy/$service" 2>/dev/null || \
        mv "src/services/$service" "src/services/legacy/$service"
        echo -e "  ${GREEN}✓ 完成${NC}"
    else
        echo -e "  ${YELLOW}⚠ 文件不存在，跳过: $service${NC}"
    fi
done

# 创建legacy目录的README
echo -e "\n${GREEN}3. 创建legacy目录README...${NC}"
cat > src/services/legacy/README.md << 'EOF'
# Legacy Services (旧服务实现)

⚠️ **警告**: 此目录包含旧的服务实现，仅供参考。

## 说明

这些文件是原有的前端服务实现，在架构重构过程中被迁移到此目录。

### 不要在新代码中使用

- ❌ 不要导入此目录的代码
- ❌ 不要修改此目录的代码
- ✅ 使用 `src/services/adapters/` 中的新实现

### 保留原因

1. **参考**: 了解原有实现逻辑
2. **对比**: 验证新实现的正确性
3. **回滚**: 紧急情况下的备份方案

### 迁移状态

| 服务 | 新实现 | 状态 |
|------|--------|------|
| AI服务 | `adapters/ai-adapter.ts` | ⏳ 开发中 |
| 患者信息提取 | `adapters/patient-adapter.ts` | ⏳ 待开始 |
| OCR识别 | `adapters/ocr-adapter.ts` | ⏳ 待开始 |
| 语音服务 | `adapters/voice-adapter.ts` | ⏳ 待开始 |
| Bisheng集成 | `adapters/bisheng-adapter.ts` | ⏳ 待开始 |
| 医疗系统集成 | `adapters/medical-adapter.ts` | ⏳ 待开始 |
| 网络搜索 | `adapters/search-adapter.ts` | ⏳ 待开始 |

### 清理计划

所有服务迁移完成后，此目录将被删除。

---

**最后更新**: 2025-10-10
EOF

echo -e "  ${GREEN}✓ README创建完成${NC}"

# 创建adapters目录的README
echo -e "\n${GREEN}4. 创建adapters目录README...${NC}"
cat > src/services/adapters/README.md << 'EOF'
# Service Adapters (服务适配器)

✅ **推荐**: 所有新代码应使用此目录中的适配器。

## 说明

服务适配器实现了统一的接口，内部可以切换新旧实现。

### 设计模式

使用**适配器模式**实现新旧服务的无缝切换：

```typescript
export class AIServiceAdapter {
  private useBackend = true; // 配置开关
  
  async processMessage(message: string) {
    if (this.useBackend) {
      // 调用后端API (新实现)
      return this.apiClient.post('/ai/chat', { message });
    } else {
      // 调用前端服务 (旧实现)
      return this.legacyService.processMessage(message);
    }
  }
}
```

### 使用方法

```typescript
import { AIServiceAdapter } from '@/services/adapters/ai-adapter';

const aiService = new AIServiceAdapter();
const response = await aiService.processMessage('你好');
```

### 配置开关

在 `config/features.ts` 中控制使用新旧实现：

```typescript
export const FEATURE_FLAGS = {
  USE_BACKEND_AI: true,      // 使用后端AI服务
  USE_BACKEND_OCR: false,    // 使用后端OCR服务
  USE_BACKEND_VOICE: false,  // 使用后端语音服务
};
```

### 开发指南

1. **创建适配器**: 继承基础适配器类
2. **实现接口**: 保持与旧服务相同的接口
3. **添加开关**: 支持新旧实现切换
4. **编写测试**: 确保新旧实现行为一致
5. **更新文档**: 记录使用方法和注意事项

### 迁移进度

| 适配器 | 状态 | 负责人 | 完成日期 |
|--------|------|--------|---------|
| ai-adapter.ts | ⏳ 开发中 | - | - |
| patient-adapter.ts | ⏳ 待开始 | - | - |
| ocr-adapter.ts | ⏳ 待开始 | - | - |
| voice-adapter.ts | ⏳ 待开始 | - | - |
| bisheng-adapter.ts | ⏳ 待开始 | - | - |
| medical-adapter.ts | ⏳ 待开始 | - | - |
| search-adapter.ts | ⏳ 待开始 | - | - |

---

**最后更新**: 2025-10-10
EOF

echo -e "  ${GREEN}✓ README创建完成${NC}"

# 创建ESLint规则配置
echo -e "\n${GREEN}5. 创建ESLint规则...${NC}"
cat > .eslintrc.legacy-restriction.json << 'EOF'
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["**/services/legacy/*"],
            "message": "❌ 不要导入legacy目录的代码！请使用 services/adapters/ 中的适配器。"
          }
        ]
      }
    ]
  }
}
EOF

echo -e "  ${GREEN}✓ ESLint规则创建完成${NC}"

# 创建迁移状态跟踪文件
echo -e "\n${GREEN}6. 创建迁移状态跟踪文件...${NC}"
cat > docs/MIGRATION_STATUS.md << 'EOF'
# 服务迁移状态跟踪

## 总体进度

- **总服务数**: 8
- **已迁移**: 0
- **进行中**: 0
- **待开始**: 8
- **完成率**: 0%

## 详细状态

### 阶段1: 核心AI服务

| 服务 | 旧实现 | 新实现 | 适配器 | 状态 | 开始日期 | 完成日期 |
|------|--------|--------|--------|------|---------|---------|
| AI对话 | legacy/ai.ts | backend API | ai-adapter.ts | ⏳ 待开始 | - | - |

### 阶段2: 患者信息服务

| 服务 | 旧实现 | 新实现 | 适配器 | 状态 | 开始日期 | 完成日期 |
|------|--------|--------|--------|------|---------|---------|
| 患者提取 | legacy/patient-info-extractor.ts | backend API | patient-adapter.ts | ⏳ 待开始 | - | - |

### 阶段3: OCR服务

| 服务 | 旧实现 | 新实现 | 适配器 | 状态 | 开始日期 | 完成日期 |
|------|--------|--------|--------|------|---------|---------|
| OCR识别 | legacy/desktop-recognition.ts | backend API | ocr-adapter.ts | ⏳ 待开始 | - | - |

### 阶段4: 配置管理

| 服务 | 旧实现 | 新实现 | 适配器 | 状态 | 开始日期 | 完成日期 |
|------|--------|--------|--------|------|---------|---------|
| 配置管理 | - | backend API | config-adapter.ts | ⏳ 待开始 | - | - |

### 阶段5: 智能体集成

| 服务 | 旧实现 | 新实现 | 适配器 | 状态 | 开始日期 | 完成日期 |
|------|--------|--------|--------|------|---------|---------|
| Bisheng | legacy/bisheng.ts | backend API | bisheng-adapter.ts | ⏳ 待开始 | - | - |

### 阶段6: 语音服务

| 服务 | 旧实现 | 新实现 | 适配器 | 状态 | 开始日期 | 完成日期 |
|------|--------|--------|--------|------|---------|---------|
| 语音识别 | legacy/voice-recognition.ts | backend API | voice-adapter.ts | ⏳ 待开始 | - | - |
| 语音合成 | legacy/voice.ts | backend API | voice-adapter.ts | ⏳ 待开始 | - | - |

### 阶段7: 医疗系统集成

| 服务 | 旧实现 | 新实现 | 适配器 | 状态 | 开始日期 | 完成日期 |
|------|--------|--------|--------|------|---------|---------|
| 医疗集成 | legacy/medical-integration.ts | backend API | medical-adapter.ts | ⏳ 待开始 | - | - |
| 网络搜索 | legacy/web-search.ts | backend API | search-adapter.ts | ⏳ 待开始 | - | - |

## 状态说明

- ⏳ 待开始
- 🔄 进行中
- ✅ 已完成
- ❌ 已取消

---

**最后更新**: 2025-10-10
EOF

echo -e "  ${GREEN}✓ 迁移状态文件创建完成${NC}"

# 总结
echo -e "\n========================================="
echo -e "${GREEN}迁移完成！${NC}"
echo -e "========================================="
echo -e "\n${YELLOW}已完成的工作:${NC}"
echo -e "  ✓ 创建 src/services/legacy/ 目录"
echo -e "  ✓ 迁移服务文件到legacy目录"
echo -e "  ✓ 创建README文档"
echo -e "  ✓ 创建ESLint规则"
echo -e "  ✓ 创建迁移状态跟踪文件"

echo -e "\n${YELLOW}下一步:${NC}"
echo -e "  1. 检查迁移的文件是否正确"
echo -e "  2. 更新导入路径（如果有其他文件引用了这些服务）"
echo -e "  3. 提交Git更改"
echo -e "  4. 开始创建适配器"

echo -e "\n${YELLOW}提交命令:${NC}"
echo -e "  git add ."
echo -e "  git commit -m \"refactor: migrate legacy services to legacy directory\""
echo -e "  git push"

echo ""

