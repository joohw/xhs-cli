# 给 AI / 自动化助手的说明（xhs-cli）

本仓库是 **纯命令行工具**：子命令在 **`src/cli/cliRouter.ts`**，业务能力在 **`src/toolset/`** 的 **`impl*`** 与相关模块（无内置 Agent / MCP）。

## 与外部 Agent 集成

- 若使用 **pi-agent-core** 等宿主：在宿主侧注册工具，**execute** 里直接调用同名 **`impl*`**（与 CLI 共用实现）。业务调用须传入 **`ResolvedSession`**（例如先 `resolveSession()` 或 `resolveSession('<slug>')` 再传给 `implLogin` 等）。
- **账号**：未传 `--account` 时仅使用 registry 的 **`currentAccount`**（无单账号自动推断、无位置参数 slug）。无当前账号时 `resolveSession()` 会抛错，须 `xhs account use <slug>` 或 `resolveSession('<slug>')`。
- 数据与缓存目录约定见 **`src/config.ts`**（应用根 `~/.xhs-cli`，业务数据在 `~/.xhs-cli/.cache/`）。

## 入口

- 本地：`npm run build` 后 `node dist/cli/index.js <子命令>`，或全局 `xhs`（`npm link`）。
- 帮助：`xhs help`。

## 本地调试约定

- 调试需要小红书登录态时，优先复用当前账号对应的本机 Chrome 会话（`~/.xhs-cli/.cache/accounts/<slug>/browser-data`，未配置多账号时为 `~/.xhs-cli/.cache/browser-data`），不要清理或替换用户已有登录态。
- 若当前会话已经登录，可直接通过 CLI / toolset 作为接口继续调试，例如 `node dist/cli/index.js browser home --limit 3`、`node dist/cli/index.js browser search <关键词>`、`node dist/cli/index.js metrics`。
- 若调试命令提示未登录、登录态失效或需要验证码/扫码/人工确认，应暂停并请求用户在打开的浏览器中完成登录，再继续调试。
- 调试或实现站内跳转时，尽可能优先使用页面 DOM 操作（点击现有入口、按钮、菜单、Tab）来导航，保留平台前端状态与上下文参数；只有找不到可用入口时才使用直接 URL 跳转作为兜底。
- 调试结束后只 detach CDP，不关闭用户浏览器窗口；不要主动删除 `browser-data` 或账号目录。

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
