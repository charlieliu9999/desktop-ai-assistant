## Why
使项目代码风格与结构执行落地，并在 PR 与 CI 阶段提供可预期的校验门禁，降低评审成本与回归风险。

## What Changes (Minimal, Phase 1)
- 以文档为“当前真相”：`openspec/specs/code-standards/spec.md`
- 在 CI/本地脚本添加最小校验：
  - 前端：`npm run lint`、`npm run type-check`
  - 后端：`pytest -q`（覆盖率门槛沿用 80%）
- 在 PR 模板中提示：提交前本地运行上述命令
- 不做大规模自动修复与全库风格化；只添加“门禁 + 提示”，避免一次性大改动

## Impact
- 影响范围：贡献流程（PR 模板）、CI 流程（新增/补充 job）、开发者本地脚本
- 代码：不强制重构历史代码；仅对增量代码生效

