# XHS-CLI

面向个人创作者的小红书 **CLI 工具** — 帮助创作者管理、分析和发布小红书内容，支持自动生成封面图片。


## Why XHS-CLI

个人创作越来越依赖各种数字工具，却缺少把它们串联起来的粘合剂。XHS-CLI 把浏览器自动化、内容模板与数据接口打包在一起，让创作者可以在本地脚本或智能助手（通过终端与文件约定协作）中调用同一套小红书工作流。


## 核心功能

- 📥 扫描并缓存历史笔记，作为上下文喂给智能助手或自动化流程
- 🎯 按模板生成新内容、封面与素材，确保账号调性一致
- 📊 拉取运营/画像数据并序列化输出，便于可视化或进一步分析
- 🚀 将发布、排期、素材管理全流程开放出来，方便接入任何数字工具链


## 安装

```bash
# 全局安装（推荐）
npm install -g xhs-cli

```

**注意**：
- 本包在安装时**不会下载 Chromium**（减少安装体积），会自动使用系统已安装的 Chrome/Chromium 浏览器
- 如果您的系统没有安装 Chrome/Chromium，请先安装 Chrome 浏览器，然后再运行`xhs login`命令。


## 前置要求

- Node.js >= 20.0.0（`@mariozechner/pi-agent-core` 要求；纯子命令亦建议 20+）
- Chrome/Chromium 浏览器（Puppeteer 需要）

## 快速开始

### 1. 登录

```bash
xhs login
```

这会打开浏览器，让你登录小红书账号。

xhs-cli 不会保存您的登录信息，所有的信息都存储在您的浏览器里。


### 2. 检查登录状态

```bash
xhs check-login
```

### 3. 退出登录

```bash
xhs logout
```

这会清除保存在 `~/.xhs-cli/.cache/browser-data` 下的浏览器缓存文件，下次需要重新登录。


### 4. 获取账号信息

```bash
xhs get-my-profile
```

## 可用命令

### 账号管理

```bash
# 登录小红书账号
xhs login

# 退出登录并清除缓存
xhs logout

# 检查登录状态
xhs check-login

# 获取用户资料
xhs get-my-profile
```

### 数据获取

```bash
# 获取运营数据
xhs get-operation-data

# 获取近期笔记列表
xhs get-recent-notes

# 根据笔记ID获取笔记详情
xhs get-note-detail <noteId>
```

### 内容发布

```bash
# 创建待发布笔记（写入发布队列）
xhs write-post --title "标题" --content "正文" [--image ./a.jpg]

# 自然语言 + 工具调用（需配置 LLM API Key，见下文）
xhs agent "用工具检查登录并列出待发队列"

# 发布队列中的笔记（可省略文件名进入交互选择）
xhs post [filename]

# 列出待发布的笔记
xhs list-post
```

### 查看帮助

```bash
xhs
```

运行不带参数会打印 **boot.md** 摘要；角色与数据约定见 [src/agent/boot.md](src/agent/boot.md)（工具列表以运行时注册为准）。


## 与 AI 助手协作

本包**不包含 MCP**。推荐：

- 阅读 **[src/agent/boot.md](src/agent/boot.md)**：角色、缓存目录、沙盒范文约定等；**具体工具名与参数**由 Agent 侧 tools 提供。范文与用户范例请放在 **`~/.xhs-cli/.cache/sandbox/`**（建议 `examples/*.txt`）。
- 本地 LLM 对话：配置好 `OPENAI_API_KEY`（或其它 pi-ai 支持的 Key）后运行：

```bash
xhs agent "帮我检查登录并发一条测试笔记到队列"
```

可选环境变量：`XHS_AI_PROVIDER`（默认 `openai`）、`XHS_AI_MODEL`（默认 `gpt-4o-mini`）。

- 编辑器内助手：见 [AGENTS.md](AGENTS.md)。


## 功能特性

- ✅ 完整的 TypeScript 支持
- ✅ 缓存机制保护账号访问频率
- ✅ 命令行工具，易于使用
- ✅ **`xhs agent`**：基于 `@mariozechner/pi-agent-core`，**`src/agent/boot.md`** 补充角色与数据约定（工具由注册表提供）
- ✅ 面向个人创作者设计

## 参与开发

本地调试 CLI、全局注册 `xhs`、新增子命令的步骤见 **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**。

## 许可证

MIT

## 相关链接

- GitHub: https://github.com/joohw/xhs-cli
- 问题反馈: https://github.com/joohw/xhs-cli/issues
