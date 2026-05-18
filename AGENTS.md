# 给 AI / 自动化助手的说明（xhs-cli）

本仓库是 **纯命令行工具**：子命令在 **`src/cli/cliRouter.ts`**，业务能力在 **`src/toolset/`** 的 **`impl*`** 与相关模块（无内置 Agent / MCP）。

## 与外部 Agent 集成

- 若使用 **pi-agent-core** 等宿主：在宿主侧注册工具，**execute** 里直接调用同名 **`impl*`**（与 CLI 共用实现）。业务调用须传入 **`ResolvedSession`**（例如先 `resolveSession()` 或 `resolveSession('<slug>')` 再传给 `implLogin` 等）。
- **账号**：未传 `--account` 时仅使用 registry 的 **`currentAccount`**（无单账号自动推断、无位置参数 slug）。无当前账号时 `resolveSession()` 会抛错，须 `xhs account use <slug>` 或 `resolveSession('<slug>')`。
- 数据与缓存目录约定见 **`src/config.ts`**（应用根 `~/.xhs-cli`，业务数据在 `~/.xhs-cli/.cache/`）。

## 入口

- 本地：`npm run build` 后 `node dist/cli/index.js <子命令>`，或全局 `xhs`（`npm link`）。
- 帮助：`xhs help`。

## 目录约定（`src/config.ts`）

- 应用根目录：`~/.xhs-cli`（仅作父目录）
- 应用生成内容：`~/.xhs-cli/.cache/`
- **多账号**：`~/.xhs-cli/.cache/accounts/<slug>/browser-data`；**当前账号**在 `accounts/registry.json` 的 `currentAccount`
- 发布归档（可选）：`~/.xhs-cli/.cache/published/`

**发帖**：`post` 子命令仅使用当次传入的 `--title`、`--content`（或 `--content-file`）与 `--image` 路径。

## 实现位置

- CLI：`src/cli/cliRouter.ts`；会话解析：`src/toolset/sessionResolve.ts`（`resolveAccountSlug` / `resolveSession`）
- 小红书业务：`src/toolset/`（`post.ts`、`login.ts`、`get_*` 等）
- 浏览器：`src/browser/index.ts`
