#!/bin/bash

# 主题一致性验证脚本
# 验证所有组件都使用统一的样式配置源

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}主题一致性验证${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 计数器
total_checks=0
passed_checks=0
failed_checks=0
warnings=0

# 检查函数
check_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((passed_checks++))
  ((total_checks++))
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  ((failed_checks++))
  ((total_checks++))
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((warnings++))
}

# 1. 检查CSS变量定义统一性
echo -e "${BLUE}1. 检查CSS变量定义统一性${NC}"
echo "----------------------------------------"

css_root_files=$(rg "^:root" --type css -l 2>/dev/null | wc -l | tr -d ' ')
if [ "$css_root_files" -le 2 ]; then
  check_pass "CSS变量定义集中在 $css_root_files 个文件中"
else
  check_fail "CSS变量定义分散在 $css_root_files 个文件中,应该集中管理"
  echo "  文件列表:"
  rg "^:root" --type css -l 2>/dev/null | sed 's/^/    - /'
fi
echo ""

# 2. 检查废弃类的使用
echo -e "${BLUE}2. 检查废弃类的使用${NC}"
echo "----------------------------------------"

dark_glass_count=$(rg "dark:glass-dark" src/ -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$dark_glass_count" ] || [ "$dark_glass_count" -eq 0 ]; then
  check_pass "没有使用废弃的 dark:glass-dark 类"
else
  check_fail "发现 $dark_glass_count 处使用废弃的 dark:glass-dark 类"
  echo "  位置:"
  rg "dark:glass-dark" src/ -n 2>/dev/null | head -5 | sed 's/^/    /'
fi
echo ""

# 3. 检查主题Store的使用
echo -e "${BLUE}3. 检查主题Store的使用${NC}"
echo "----------------------------------------"

theme_store_usage=$(rg "useThemeStore|useTheme" src/renderer --type tsx --type ts -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$theme_store_usage" ]; then theme_store_usage=0; fi

if [ "$theme_store_usage" -gt 0 ]; then
  check_pass "发现 $theme_store_usage 处使用主题Store"
else
  check_warn "未发现主题Store的使用,可能需要检查"
fi
echo ""

# 4. 检查玻璃效果Hook的使用
echo -e "${BLUE}4. 检查玻璃效果Hook的使用${NC}"
echo "----------------------------------------"

glass_hook_usage=$(rg "useGlassEffect|useFloatingGlassEffect" src/renderer --type tsx --type ts -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')
if [ -z "$glass_hook_usage" ]; then glass_hook_usage=0; fi

if [ "$glass_hook_usage" -gt 0 ]; then
  check_pass "发现 $glass_hook_usage 处使用玻璃效果Hook"
else
  check_warn "未发现玻璃效果Hook的使用"
fi
echo ""

# 5. 检查硬编码颜色
echo -e "${BLUE}5. 检查硬编码颜色 (排除合理默认值)${NC}"
echo "----------------------------------------"

# 排除合理的默认值文件
hardcoded_colors=$(rg "#[0-9a-fA-F]{6}" src/renderer --type tsx --type ts \
  --glob '!**/themes.ts' \
  --glob '!**/ThemeSettings.tsx' \
  --glob '!**/useGlassEffect.ts' \
  --glob '!**/useFloatingGlassEffect.ts' \
  --glob '!**/SettingsPanel.tsx' \
  -c 2>/dev/null | awk -F: '{s+=$2} END {print s}')

if [ -z "$hardcoded_colors" ]; then hardcoded_colors=0; fi

if [ "$hardcoded_colors" -eq 0 ]; then
  check_pass "没有发现不合理的硬编码颜色"
elif [ "$hardcoded_colors" -le 5 ]; then
  check_warn "发现 $hardcoded_colors 处硬编码颜色,请人工审查"
  echo "  位置:"
  rg "#[0-9a-fA-F]{6}" src/renderer --type tsx --type ts \
    --glob '!**/themes.ts' \
    --glob '!**/ThemeSettings.tsx' \
    --glob '!**/useGlassEffect.ts' \
    --glob '!**/useFloatingGlassEffect.ts' \
    --glob '!**/SettingsPanel.tsx' \
    -n 2>/dev/null | head -5 | sed 's/^/    /'
else
  check_fail "发现 $hardcoded_colors 处硬编码颜色"
  echo "  位置:"
  rg "#[0-9a-fA-F]{6}" src/renderer --type tsx --type ts \
    --glob '!**/themes.ts' \
    --glob '!**/ThemeSettings.tsx' \
    --glob '!**/useGlassEffect.ts' \
    --glob '!**/useFloatingGlassEffect.ts' \
    --glob '!**/SettingsPanel.tsx' \
    -n 2>/dev/null | head -10 | sed 's/^/    /'
fi
echo ""

# 6. 检查关键文件是否存在
echo -e "${BLUE}6. 检查关键文件是否存在${NC}"
echo "----------------------------------------"

required_files=(
  "src/renderer/index.css"
  "src/renderer/styles/glass-effect.css"
  "src/renderer/config/themes.ts"
  "src/renderer/stores/themeStore.ts"
  "src/renderer/hooks/useTheme.ts"
  "src/renderer/hooks/useGlassEffect.ts"
  "src/renderer/hooks/useFloatingGlassEffect.ts"
  "src/renderer/utils/styleUtils.ts"
  "docs/STYLE_GUIDE.md"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    check_pass "$file 存在"
  else
    check_fail "$file 不存在"
  fi
done
echo ""

# 7. 检查主题模式支持
echo -e "${BLUE}7. 检查主题模式支持${NC}"
echo "----------------------------------------"

theme_modes=("glass" "light" "dark" "auto")
for mode in "${theme_modes[@]}"; do
  mode_usage=$(rg "\"$mode\"|'$mode'" src/renderer/config/themes.ts -c 2>/dev/null)
  if [ -n "$mode_usage" ] && [ "$mode_usage" -gt 0 ]; then
    check_pass "支持 $mode 主题模式"
  else
    check_fail "不支持 $mode 主题模式"
  fi
done
echo ""

# 8. 检查样式工具函数
echo -e "${BLUE}8. 检查样式工具函数${NC}"
echo "----------------------------------------"

style_utils_functions=(
  "cn"
  "getMessageBubbleClass"
  "getButtonClass"
  "getGlassClass"
  "getCSSVar"
  "setCSSVar"
)

for func in "${style_utils_functions[@]}"; do
  func_exists=$(rg "export.*function $func|export.*const $func" src/renderer/utils/styleUtils.ts -c 2>/dev/null)
  if [ -n "$func_exists" ] && [ "$func_exists" -gt 0 ]; then
    check_pass "$func 函数存在"
  else
    check_warn "$func 函数可能不存在"
  fi
done
echo ""

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}验证总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "总检查项: $total_checks"
echo -e "${GREEN}通过: $passed_checks${NC}"
echo -e "${RED}失败: $failed_checks${NC}"
echo -e "${YELLOW}警告: $warnings${NC}"
echo ""

if [ "$failed_checks" -eq 0 ]; then
  echo -e "${GREEN}✓ 主题一致性验证通过!${NC}"
  exit 0
else
  echo -e "${RED}✗ 主题一致性验证失败,请修复上述问题${NC}"
  exit 1
fi

