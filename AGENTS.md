# 给 AI / 自动化助手的说明（xhs-cli）

本仓库是 **纯命令行工具**：子命令在 **`src/cli/cliRouter.ts`**，业务能力在 **`src/toolset/`** 的 **`impl*`** 与相关模块（无内置 Agent / MCP）。

## 与外部 Agent 集成

- 若使用 **pi-agent-core** 等宿主：在宿主侧注册工具，**execute** 里直接调用同名 **`impl*`**（与 CLI 共用实现）。业务调用须传入 **`ResolvedSession`**（例如先 `resolveSession('<slug>')` 再传给 `implLogin` 等）；**不要**省略会话依赖隐式默认账号。
- 数据与缓存目录约定见 **`src/config.ts`**（应用根 `~/.xhs-cli`，业务数据在 `~/.xhs-cli/.cache/`）。

## 入口

- 本地：`npm run build` 后 `node dist/cli/index.js <子命令>`，或全局 `xhs`（`npm link`）。
- 帮助：`xhs help`。

## 目录约定（`src/config.ts`）

- 应用根目录：`~/.xhs-cli`（仅作父目录）
- 应用生成内容：`~/.xhs-cli/.cache/`
- **未配置多账号时**浏览器用户数据：CLI 仍要求先在注册表中有一个账号条目；数据目录为 **`~/.xhs-cli/.cache/accounts/<slug>/browser-data`**（不再将全局 `cache/browser-data` 作为会话回退）。
- **多账号时**每账号会话：同上，每 slug 独立目录（详见 `README`）
- 草稿：每账号 `~/.xhs-cli/.cache/accounts/<slug>/drafts/`（遗留根目录 `drafts/` 仍可读）；发布归档：`~/.xhs-cli/.cache/published/`

**发帖**：`post` 子命令仅使用当次传入的 `--title`、`--content`（或 `--content-file`）与 `--image` 路径，不依赖待发文件队列。

## 实现位置

- CLI：`src/cli/cliRouter.ts`（`runCli`）；入口：`src/cli/index.ts`。子命令包括 `recent`（创作者已发列表）、`posted`（本地发帖归档）、`detail`、`draft` / `drafts`、`draft post` 等；`published` 已移除。
- 小红书业务：`src/toolset/xiaohongshu/*`
- 浏览器：`src/toolset/core/browser/browser.ts`
