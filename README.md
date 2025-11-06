# XHS-CLI/XHS-MCP

面向个人创作者的小红书 MCP 服务器和 CLI 工具 - 帮助创作者管理、分析和发布小红书内容


## Why XHS-CLI

众所周知，运营自媒体是一件非常耗精力的事，此项目面向缺乏运营精力的个人创作者，提供一套运营小红书的解决方案。



## 核心功能

- 📊 管理您所有已发布的笔记列表，作为上下文随时待命
- 🎨 定义您发布帖子的风格、个人设定
- 🚀 一键呈送符合您过往风格的候选帖子，随时发布
- 📈 分析你的账号数据，提供专业的洞察意见

## 安装

```bash
# 全局安装（推荐：跳过 Chromium 下载，使用系统浏览器）
PUPPETEER_SKIP_DOWNLOAD=true npm install -g xhs-cli

# 或者使用 npx（无需安装）
npx xhs-cli <command>
```

**注意**：
- 本包在安装时**不会下载 Chromium**（减少安装体积），会自动使用系统已安装的 Chrome/Chromium 浏览器
- 如果您的系统没有安装 Chrome/Chromium，请先安装，或者使用 npm install -g xhs-cli,但是在国内的网络环境，直接安装可能会报错


## 前置要求

- Node.js >= 18.0.0
- Chrome/Chromium 浏览器（Puppeteer 需要）

## 快速开始

### 1. 登录

```bash
xhs login
```

这会打开浏览器，让你登录小红书账号。

### 2. 检查登录状态

```bash
xhs check-login
```

### 3. 获取账号信息

```bash
xhs get-my-profile
```

## 可用命令

### 账号管理

```bash
# 登录小红书账号
xhs login

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
xhs get-note-detail-by-id <noteId>
```

### 内容发布

```bash
# 添加 post 到队列
xhs add-post "内容" --title "标题" --images "img1.jpg,img2.jpg" --scheduled-time "2024-01-01T10:00:00Z"

# 发布队列中的 post
xhs post [filename]

# 列出待发布的 post
xhs list-available-post
```

### 查看帮助

```bash
xhs
```

运行不带参数会显示所有可用命令的详细说明。



## MCP 服务器

这个包同时也是一个 MCP（Model Context Protocol）服务器，可以与支持 MCP 的客户端（如 Cursor、Claude Desktop 等）集成。



### 配置 MCP 客户端

详细的 MCP 配置说明请访问项目主页：
https://github.com/joohw/xhs-cli

## 功能特性

- ✅ 完整的 TypeScript 支持
- ✅ 缓存机制保护账号访问频率
- ✅ 命令行工具，易于使用
- ✅ MCP 协议支持，可集成 AI 工具
- ✅ 面向个人创作者设计

## 许可证

MIT

## 相关链接

- GitHub: https://github.com/joohw/xhs-cli
- 问题反馈: https://github.com/joohw/xhs-cli/issues

