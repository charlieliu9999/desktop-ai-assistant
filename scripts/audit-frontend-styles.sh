#!/bin/bash

# 前端样式审计脚本
# 用于自动检测样式统一性问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  前端样式统一性审计工具${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 初始化计数器
total_issues=0
critical_issues=0
warnings=0

# 函数：打印问题
print_issue() {
    local severity=$1
    local title=$2
    local count=$3
    
    if [ "$severity" == "CRITICAL" ]; then
        echo -e "${RED}🔴 [严重] $title: $count 处${NC}"
        ((critical_issues+=count))
    elif [ "$severity" == "WARNING" ]; then
        echo -e "${YELLOW}🟡 [警告] $title: $count 处${NC}"
        ((warnings+=count))
    else
        echo -e "${GREEN}✅ [通过] $title${NC}"
    fi
    
    ((total_issues+=count))
}

# 1. 检查 CSS 变量重复定义
echo -e "${BLUE}1. 检查 CSS 变量重复定义${NC}"
echo "----------------------------------------"

css_root_count=$(rg "^:root" --type css -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
css_files_with_root=$(rg "^:root" --type css -l 2>/dev/null | wc -l | tr -d ' ')

if [ "$css_files_with_root" -gt 2 ]; then
    print_issue "CRITICAL" "CSS :root 定义在 $css_files_with_root 个文件中" "$css_files_with_root"
    echo "  文件列表:"
    rg "^:root" --type css -l 2>/dev/null | sed 's/^/    - /'
else
    print_issue "OK" "CSS :root 定义" 0
fi
echo ""

# 2. 检查废弃的 glass-dark 类
echo -e "${BLUE}2. 检查废弃的 dark:glass-dark 类${NC}"
echo "----------------------------------------"

glass_dark_count=$(rg "dark:glass-dark" --glob "*.tsx" --glob "*.ts" -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$glass_dark_count" ]; then glass_dark_count=0; fi

if [ "$glass_dark_count" -gt 0 ]; then
    print_issue "CRITICAL" "使用了废弃的 dark:glass-dark" "$glass_dark_count"
    echo "  位置:"
    rg "dark:glass-dark" --glob "*.tsx" --glob "*.ts" -n 2>/dev/null | head -10 | sed 's/^/    /'
else
    print_issue "OK" "没有使用废弃的 dark:glass-dark" 0
fi
echo ""

# 3. 检查旧的语义化玻璃类
echo -e "${BLUE}3. 检查旧的语义化玻璃类${NC}"
echo "----------------------------------------"

old_glass_classes="glass-header|glass-card|glass-effect"
old_class_count=$(rg "($old_glass_classes)" --glob "*.tsx" --glob "*.ts" -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$old_class_count" ]; then old_class_count=0; fi

if [ "$old_class_count" -gt 0 ]; then
    print_issue "WARNING" "使用了旧的语义化玻璃类" "$old_class_count"
    echo "  注意: glass-scrollbar 等特殊类是允许的"
    echo "  位置:"
    rg "($old_glass_classes)" --glob "*.tsx" --glob "*.ts" -n 2>/dev/null | head -10 | sed 's/^/    /'
else
    print_issue "OK" "没有使用旧的语义化玻璃类" 0
fi
echo ""

# 4. 检查硬编码颜色值
echo -e "${BLUE}4. 检查硬编码颜色值 (十六进制)${NC}"
echo "----------------------------------------"

hex_color_count=$(rg "#[0-9a-fA-F]{6}" --glob "*.tsx" --glob "*.ts" -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$hex_color_count" ]; then hex_color_count=0; fi

if [ "$hex_color_count" -gt 10 ]; then
    print_issue "WARNING" "硬编码的十六进制颜色" "$hex_color_count"
    echo "  建议: 使用 Tailwind 类或 CSS 变量"
    echo "  前10处:"
    rg "#[0-9a-fA-F]{6}" --glob "*.tsx" --glob "*.ts" -n 2>/dev/null | head -10 | sed 's/^/    /'
elif [ "$hex_color_count" -gt 0 ]; then
    print_issue "OK" "少量硬编码颜色 (可接受)" "$hex_color_count"
else
    print_issue "OK" "没有硬编码颜色" 0
fi
echo ""

# 5. 检查内联样式中的颜色
echo -e "${BLUE}5. 检查内联样式中的颜色${NC}"
echo "----------------------------------------"

inline_color_count=$(rg "style=.*color:|style=.*background:" --glob "*.tsx" -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$inline_color_count" ]; then inline_color_count=0; fi

if [ "$inline_color_count" -gt 5 ]; then
    print_issue "WARNING" "内联样式中的颜色定义" "$inline_color_count"
    echo "  建议: 使用 className 代替内联样式"
else
    print_issue "OK" "内联样式中的颜色定义数量合理" "$inline_color_count"
fi
echo ""

# 6. 检查 px 单位 vs rem 单位
echo -e "${BLUE}6. 检查样式单位一致性${NC}"
echo "----------------------------------------"

px_in_css=$(rg ":\s*\d+px" --type css -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$px_in_css" ]; then px_in_css=0; fi

rem_in_css=$(rg ":\s*[\d.]+rem" --type css -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$rem_in_css" ]; then rem_in_css=0; fi

echo "  CSS 中使用 px 单位: $px_in_css 处"
echo "  CSS 中使用 rem 单位: $rem_in_css 处"

if [ "$px_in_css" -gt "$rem_in_css" ]; then
    print_issue "WARNING" "px 单位使用过多，建议统一使用 rem" 1
else
    print_issue "OK" "单位使用基本合理" 0
fi
echo ""

# 7. 检查响应式断点硬编码
echo -e "${BLUE}7. 检查响应式断点硬编码${NC}"
echo "----------------------------------------"

hardcoded_breakpoints=$(rg "@media.*\((min|max)-width:\s*\d+px\)" --type css -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$hardcoded_breakpoints" ]; then hardcoded_breakpoints=0; fi

if [ "$hardcoded_breakpoints" -gt 3 ]; then
    print_issue "WARNING" "硬编码的响应式断点" "$hardcoded_breakpoints"
    echo "  建议: 使用 Tailwind 配置的断点"
    echo "  位置:"
    rg "@media.*\((min|max)-width:\s*\d+px\)" --type css -n 2>/dev/null | head -5 | sed 's/^/    /'
else
    print_issue "OK" "响应式断点使用合理" "$hardcoded_breakpoints"
fi
echo ""

# 8. 检查 CSS 文件大小
echo -e "${BLUE}8. 检查 CSS 文件大小${NC}"
echo "----------------------------------------"

if [ -f "src/renderer/index.css" ]; then
    index_css_size=$(wc -c < src/renderer/index.css)
    index_css_lines=$(wc -l < src/renderer/index.css)
    echo "  index.css: $index_css_lines 行, $(($index_css_size / 1024)) KB"
fi

if [ -f "src/renderer/App.css" ]; then
    app_css_size=$(wc -c < src/renderer/App.css)
    app_css_lines=$(wc -l < src/renderer/App.css)
    echo "  App.css: $app_css_lines 行, $(($app_css_size / 1024)) KB"
fi

if [ -f "src/renderer/styles/glass-effect.css" ]; then
    glass_css_size=$(wc -c < src/renderer/styles/glass-effect.css)
    glass_css_lines=$(wc -l < src/renderer/styles/glass-effect.css)
    echo "  glass-effect.css: $glass_css_lines 行, $(($glass_css_size / 1024)) KB"
fi
echo ""

# 9. 检查组件文件大小 (间接反映样式复杂度)
echo -e "${BLUE}9. 检查关键组件文件大小${NC}"
echo "----------------------------------------"

large_components=0
if [ -d "src/renderer/components" ]; then
    while IFS= read -r file; do
        lines=$(wc -l < "$file")
        if [ "$lines" -gt 800 ]; then
            echo "  ⚠️  $file: $lines 行 (可能过大)"
            ((large_components++))
        elif [ "$lines" -gt 500 ]; then
            echo "  ℹ️  $file: $lines 行"
        fi
    done < <(find src/renderer/components -name "*.tsx" -type f)
fi

if [ "$large_components" -gt 3 ]; then
    print_issue "WARNING" "超大组件文件" "$large_components"
    echo "  建议: 考虑拆分组件"
else
    print_issue "OK" "组件文件大小合理" 0
fi
echo ""

# 总结报告
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  审计总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "📊 统计信息:"
echo "  - 检查项目: 9 项"
echo "  - 严重问题: $critical_issues 个"
echo "  - 警告问题: $warnings 个"
echo "  - 总问题数: $total_issues 个"
echo ""

# 评分
total_checks=9
passing_checks=$((total_checks - critical_issues - warnings))
score=$((passing_checks * 100 / total_checks))

echo "🎯 样式一致性得分: $score%"
echo ""

# 建议
if [ "$critical_issues" -gt 0 ]; then
    echo -e "${RED}⚠️  发现严重问题，建议立即修复${NC}"
    echo ""
    echo "📋 快速修复步骤:"
    echo "  1. 查看详细分析: docs/FRONTEND_STYLE_CONSISTENCY_ANALYSIS.md"
    echo "  2. 按照行动清单修复: docs/STYLE_ACTION_CHECKLIST.md"
    echo "  3. 重新运行本脚本验证"
elif [ "$warnings" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现一些警告，建议改进${NC}"
    echo ""
    echo "📋 改进建议:"
    echo "  1. 查看完整报告: docs/FRONTEND_STYLE_CONSISTENCY_ANALYSIS.md"
    echo "  2. 逐步优化问题项"
else
    echo -e "${GREEN}✅ 样式系统状态良好！${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo "审计完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${BLUE}========================================${NC}"

# 返回退出码
if [ "$critical_issues" -gt 0 ]; then
    exit 1
else
    exit 0
fi
