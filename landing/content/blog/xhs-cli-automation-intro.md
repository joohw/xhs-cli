---
title: xhs-cli 是什么？小红书运营命令行工具入门
description: 了解 xhs-cli 的真实能力、安装要求、账号会话和人工确认发布机制，并用当前版本命令完成第一次操作。
date: 2026-05-20
updated: 2026-07-19
---

xhs-cli 是一个在本机运行的小红书创作者命令行工具。它把账号登录、运营指标、已发笔记查询、单篇笔记详情和图文发帖填表放进统一的 `xhs` 命令中。

这个项目适合已经习惯终端或需要把重复操作接入脚本的创作者与运营团队。它不是小红书官方 API，也不是无人值守的代运营机器人。涉及登录和发帖时，工具会连接本机 Chrome 或 Chromium，并以创作者后台的实际页面状态为准。

## 安装前准备

运行环境需要：

- Node.js 20 或更高版本
- 本机已安装 Chrome 或 Chromium
- 可正常访问的小红书创作者账号

全局安装：

```bash
npm install -g xhs-cli
xhs help
```

`xhs help` 会打印当前版本支持的完整命令。遇到博客示例与本机输出不一致时，以该帮助信息和 GitHub README 为准。

## 第一次登录

先创建账号标识，再将它设为当前账号：

```bash
xhs account add brand-a
xhs account use brand-a
xhs login
```

账号标识只能使用字母、数字、点、下划线和连字符。登录成功后，浏览器会话保存在：

```text
~/.xhs-cli/.cache/accounts/brand-a/browser-data
```

不同账号使用不同目录，避免 Cookie 和创作者后台会话互相覆盖。业务命令默认使用 registry 中的当前账号，也可以用 `--account other` 临时指定另一个账号。

## 能查询哪些数据

完成登录后可以运行：

```bash
xhs metrics
xhs recent --limit 20
xhs detail <noteId>
xhs posted
```

`metrics` 读取创作者运营指标，`recent` 返回后台最近笔记，`detail` 查询单篇笔记详情，`posted` 查看本地发布归档。这些命令适合交给其他脚本继续清洗或汇总，但 xhs-cli 本身不提供长期趋势看板。

## 发帖为何默认需要人工确认

发帖命令接收标题、正文和本地图片：

```bash
xhs post \
  --title "标题" \
  --content "正文至少十个字" \
  --image ./cover.png
```

`--image` 可以重复传入，支持 1 至 18 张图片。默认行为是填好创作页并保留浏览器窗口，由用户检查标题、正文、图片顺序和平台提示后手动发布。

只有显式添加 `--publish` 时，工具才会尝试点击发布按钮。即使使用该参数，也应检查页面最终状态，不要仅凭命令返回值判断笔记已经公开。

## 与 Agent 的关系

xhs-cli 是纯 CLI，没有内置 Agent 或 MCP 服务。外部 Agent 宿主可以把 `src/toolset/` 中的 `impl*` 方法注册成工具，并传入 `ResolvedSession`。这样可以复用 CLI 的业务实现，不需要让 Agent 直接拼接 shell 命令。

继续阅读：

- [小红书图文发布工作流](/blog/xhs-content-publishing-workflow)
- [多账号会话管理](/blog/xiaohongshu-multi-account-cli)
- [外部 Agent 集成方式](/blog/xhs-cli-agent-integration)
- [安全与本地数据说明](/security)
