## 1. Planning
- [ ] 1.1 审阅并确认 `openspec/specs/code-standards/spec.md` 为规范基线

## 2. Minimal Enforcement (Phase 1)
- [ ] 2.1 前端脚本：确保 `npm run lint`、`npm run type-check` 正常（本仓已有）
- [x] 2.2 后端测试：`pytest -q` 保持覆盖率门槛（≥80%）（当前 84%）
- [x] 2.3 CI：代码标准工作流已存在；新增可选集成测试工作流（integration-live.yml）
- [ ] 2.4 PR 模板：提示开发者本地执行脚本并粘贴结果（如必要）

## 3. Documentation
- [ ] 3.1 在 README.md 的“开发指南”中链接代码规范与校验命令
- [ ] 3.2 在贡献指南（若存在）加入规范摘要

## 4. Phase 2+（可选）
- [ ] 4.1 ESLint 规则细化与自动修复脚本（分模块逐步执行）
- [ ] 4.2 Python 静态检查（ruff/flake8/mypy）按模块增量引入
- [ ] 4.3 统一 Import 排序/路径别名治理
