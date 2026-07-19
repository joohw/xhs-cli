---
title: 在外部 AI Agent 中集成 xhs-cli 的正确方式
description: xhs-cli 不内置 Agent 或 MCP 服务；本文说明如何在 Node.js 宿主注册 toolset 的 impl* 能力，并正确解析 ResolvedSession。
date: 2026-07-19
updated: 2026-07-19
---

xhs-cli 的命令行层和业务层使用同一组 TypeScript 实现。外部 Agent 宿主需要工具调用能力时，推荐直接注册 `src/toolset/` 中对应的 `impl*` 方法，而不是启动一个子进程再解析终端文本。

项目本身不包含 Agent 运行时，也不提供内置 MCP Server。MCP、pi-agent-core 或其他工具协议应在宿主项目中实现。

## 集成入口

主要代码位置：

- `src/cli/cliRouter.ts`：CLI 子命令和参数处理
- `src/toolset/`：登录、数据查询、笔记详情和发帖实现
- `src/toolset/sessionResolve.ts`：账号与会话解析
- `src/toolset/index.ts`：业务能力导出

宿主注册工具时，`execute` 应调用对应的 `impl*`。登录与数据查询等会话型方法接收 `ResolvedSession`；`implPost` 接收发帖参数，其中包含目标账号的 `browserUserDataDir`。

## 先解析账号会话

默认账号来自 registry 的 `currentAccount`：

```ts
import { resolveSession } from 'xhs-cli/dist/toolset/index.js'

const session = resolveSession()
```

需要指定账号时：

```ts
const session = resolveSession('brand-a')
```

不要把 slug 当作隐式位置参数，也不要在缺少当前账号时自行选择 registry 中的唯一账号。保持与 CLI 相同的解析规则，可以降低误操作其他账号的风险。

## 工具定义应约束输入

以发帖工具为例，宿主 schema 至少应约束：

- `account`：可选账号 slug
- `title`：非空标题
- `content` 或 `contentFile`：正文来源二选一
- `imagePaths`：1 至 18 个本地文件路径
- `publish`：默认 `false`

执行前先解析 session。调用 `implPost` 时，将 `session.browserUserDataDir` 放入发帖参数。`publish` 不应由模型自行默认为 `true`，因为该参数会尝试点击页面发布按钮。

## 为什么优先调用 impl*

直接调用业务实现有三个实际好处：

1. 输入是结构化对象，不需要处理 shell 引号和多行正文。
2. 宿主可以区分错误、日志和业务结果。
3. CLI 与 Agent 复用账号目录和业务校验，行为更一致。

如果宿主只能执行 shell，也可以调用 `xhs` 命令，但应避免把不可信文本直接拼进命令字符串。使用参数数组启动子进程，并显式传递账号与文件路径。

## 权限与确认边界

读取数据和发帖不是同一风险等级。建议把工具拆成登录、指标、最近笔记、详情和发帖五类，并为发帖设置额外确认。默认填表后由人检查；只有用户明确要求时才传入 `publish: true`。

账号会话保存在本机目录。Agent 不需要读取 Cookie 内容；会话型方法使用解析后的 `ResolvedSession`，发帖方法只需要相应的浏览器目录路径。更多目录说明见 [安全与数据说明](/security)。
