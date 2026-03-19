# 给 AI / 自动化助手的说明（xhs-cli）

本仓库是 **CLI + 可选 pi-agent** 的小红书工具（无 MCP）。

## 工具与能力约定（优先读 `src/agent/boot.md`）

- **`src/agent/boot.md`**（构建后为 `dist/agent/boot.md`）：**角色、数据目录、范文工作流与约束**（给人读、给模型补业务上下文）；**不包含工具清单**——工具定义由运行时注册（`buildXhsAgentTools()`）提供，避免重复。
- **运行时工具注册**：`src/agent/xhsTools.ts`（`buildXhsAgentTools()`）。
- **工具实现（与 CLI 共用）**：`src/agent/toolImplementations.ts`（`impl*` 函数）。

Cursor 等编辑器里的助手：规划调用终端命令或读队列文件时，以 **`src/agent/boot.md`** 为准，不必依赖本文件里的命令表为唯一真相。

## 入口

- 本地开发：`npm run dev -- <子命令> [参数]`（与 `npm run xhs -- …` 相同，详见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)）
- 全局安装：`xhs <子命令>` / `xhs agent "<任务>"`
- 不带参数 / `help`：打印**给人看的**简要子命令说明；**不会**输出 `boot.md`（`boot.md` 仅由 `xhs agent` 读入作为 LLM system prompt）。

## 目录约定（`src/config.ts`）

- 应用根目录：`~/.xhs-cli`（仅作父目录）
- **所有应用生成内容**：`~/.xhs-cli/.cache/`
- 发帖队列：`~/.xhs-cli/.cache/post/queue/`
- Agent 沙盒（范文/范例）：`~/.xhs-cli/.cache/sandbox/`（建议 `sandbox/examples/*.txt`）
- 浏览器用户数据：`~/.xhs-cli/.cache/browser-data`

## pi-agent 模式（`xhs agent`）

- 依赖 **`@mariozechner/pi-agent-core`** / **`@mariozechner/pi-ai`**，需 **Node ≥ 20**。
- 配置对应平台的 API Key（如 `OPENAI_API_KEY`）；可选 `XHS_AI_PROVIDER`、`XHS_AI_MODEL`（默认 `openai` + `gpt-4o-mini`）。

## 实现位置

- 沙盒路径校验与读写：`src/agent/sandboxFs.ts`
- CLI 路由：`src/agent/cliRouter.ts`（`runCli`）
- 入口：`src/cli.ts`
- 业务逻辑：`src/core/*`
- 浏览器：`src/browser/browser.ts`
