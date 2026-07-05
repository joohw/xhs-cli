# xhs-cli 使用说明书

本文档覆盖当前仓库中已经实现的 CLI 能力。xhs-cli 是一个本地命令行工具，通过本机 Chrome/Chromium 操作小红书网页，不内置 Agent 或 MCP。外部 Agent 如需集成，应调用 `src/toolset/index.ts` 中导出的 `impl*` 函数。

## 1. 基本概念

xhs-cli 现在有四类能力：

| 分组 | 前缀 | 用途 |
| --- | --- | --- |
| 账号与会话 | `xhs account ...`、`xhs login`、`xhs browser login` | 管理本地账号配置和登录态 |
| 常规浏览 | `xhs browser ...` | 搜索、读取首页、打开帖子、读取评论和@、评论帖子 |
| 创作者功能 | `xhs metrics`、`xhs posted`、`xhs note-detail`、`xhs post` | 读取创作者后台数据、已发笔记、详情、发帖 |
| 草稿与归档 | `xhs draft ...`、`xhs published list` | 本地草稿审批流和发布归档 |

账号选择采用“先切换当前账号，再执行短命令”的模式。`--account` 已移除。

```bash
xhs account use joo
xhs browser unread --limit 5
xhs metrics
```

## 2. 安装与运行

### 全局安装

```bash
npm install -g xhs-cli
xhs help
```

### 从源码运行

```bash
npm install
npm run build
node dist/cli/index.js help
```

如果已执行 `npm link`，也可以直接使用：

```bash
xhs help
```

## 3. 数据目录

默认根目录：

```text
~/.xhs-cli/.cache/
```

主要目录：

| 路径 | 用途 |
| --- | --- |
| `browser-data/` | 未配置多账号时的浏览器用户数据 |
| `accounts/registry.json` | 多账号注册表和当前账号 |
| `accounts/<name>/browser-data/` | 多账号下每个账号独立浏览器登录态 |
| `accounts/<name>/posts/` | 多账号下帖子缓存 |
| `drafts/` | 本地草稿 |
| `published/` | 本地发布归档 |
| `posts/` | 未配置多账号时的帖子缓存 |

帖子缓存保存已读取或已发布帖子的标题、正文、封面、统计等。因为已发帖子通常不会频繁修改，后续通知和评论场景会用缓存反查“这条评论属于哪个帖子”。

## 4. 账号管理

### 查看账号

```bash
xhs account list
xhs account current
```

`account list` 会用 `*` 标记当前账号。

### 添加账号

```bash
xhs account add joo --display-name Joo --role personal
```

参数：

| 参数 | 说明 |
| --- | --- |
| `<name>` | 本地账号名，也是目录 slug |
| `--display-name` | 展示名称，可选 |
| `--role` | 角色标签，可选，默认 `general` |

### 切换当前账号

```bash
xhs account use joo
```

切换后，后续 `browser`、`metrics`、`posted`、`post`、`draft` 等命令都会使用当前账号。

### 查看单账号配置

```bash
xhs account show joo
```

## 5. 登录

主站浏览登录：

```bash
xhs browser login
```

兼容旧入口：

```bash
xhs login
```

登录命令会打开或复用本机 Chrome。登录态保存在当前账号的 `browser-data/` 目录。调试和运行结束后，CLI 只断开 CDP 连接，不主动关闭用户浏览器窗口。

## 6. 常规浏览功能

### 读取首页帖子

```bash
xhs browser home --limit 10
```

行为：

- 打开或刷新小红书首页。
- 读取首页可见帖子列表。
- 输出帖子 ID、标题、作者、点赞、链接、封面。
- 写入本地帖子缓存。
- 操作前会清理已打开的帖子详情弹窗。

### 搜索帖子

```bash
xhs browser search "Agent 工作流" --limit 10
```

行为：

- 打开搜索结果页。
- 读取可见帖子列表。
- 写入本地帖子缓存。

### 读取评论和@消息

```bash
xhs browser unread --limit 5
```

行为：

- 优先通过页面 DOM 点击侧边栏“通知”，URL 跳转只作为兜底。
- 进入通知页后点击 `评论和@` Tab。
- 输出评论者、动作、时间、评论内容、关联原文。
- 若本地帖子缓存能根据通知缩略图匹配，会额外输出帖子标题、帖子 ID、帖子链接。

示例输出字段：

```text
1. 心平气和 评论了你的笔记（9小时前）
帖子: 这下真的核弹爆炸，震惊瘫坐了
帖子ID: 6a2908330000000006021244
帖子链接: https://www.xiaohongshu.com/explore/6a2908330000000006021244
内容: ...
关联: ...
用户: ...
```

### 打开帖子详情

```bash
xhs browser open 6a2908330000000006021244
xhs browser open "https://www.xiaohongshu.com/explore/6a2908330000000006021244?..."
```

行为：

- 如果当前帖子已经打开，直接复用当前详情弹窗。
- 如果没打开，优先点击页面中已有帖子链接；找不到时才使用 URL 兜底。
- 输出标题、作者、正文和当前能读取到的评论列表。
- 写入本地帖子缓存。
- 命令结束后保留帖子详情弹窗，方便后续评论。

### 评论帖子

```bash
xhs browser comment 6a2908330000000006021244 --content "这个观点很有启发。"
```

从文件读取评论：

```bash
xhs browser comment 6a2908330000000006021244 --content-file ./comment.txt
```

只验证不发送：

```bash
xhs browser comment 6a2908330000000006021244 --content "测试评论" --dry-run
```

行为：

- 如果目标帖子已打开，直接在当前弹窗评论。
- 如果未打开，先打开目标帖子。
- `--dry-run` 会填入评论、验证发送按钮可用、清空输入框，但不会发送。
- 真实发送后会清理帖子详情弹窗，回到稳定浏览状态。

## 7. 创作者功能

### 运营数据

```bash
xhs metrics
```

读取创作者后台运营数据摘要。该能力属于 creator 功能。

### 已发笔记列表

```bash
xhs posted --limit 20
```

行为：

- 打开创作者后台笔记管理。
- 读取已发笔记列表和统计。
- 输出 ID、标题、发布时间、链接、浏览、点赞、评论、收藏、分享。
- 写入本地帖子缓存。

建议在使用 `browser unread` 前先跑一次：

```bash
xhs posted --limit 50
```

这样通知里的评论更容易反查到对应帖子。

### 笔记详情

```bash
xhs note-detail 6a2908330000000006021244
```

行为：

- 优先从缓存读取详情文本。
- 无缓存时尝试通过公开预览页或创作者编辑页读取标题、正文、标签、发布时间、封面。
- 成功后写入本地帖子缓存。

### 发帖

```bash
xhs post \
  --title "标题" \
  --content "正文内容至少满足平台校验" \
  --image ./cover.png
```

从文件读取正文：

```bash
xhs post \
  --title "标题" \
  --content-file ./content.md \
  --image ./1.png \
  --image ./2.png
```

自动点击发布：

```bash
xhs post \
  --title "标题" \
  --content-file ./content.md \
  --image ./cover.png \
  --publish
```

或显式关闭发布：

```bash
xhs post \
  --title "标题" \
  --content "正文" \
  --image ./cover.png \
  --publish=false
```

注意：

- `post` 至少需要一张图片。
- 默认不会自动发布，只会打开创作页并填入内容。
- `--publish` 才会尝试点击平台“发布”按钮。
- 发布后仍建议人工确认平台状态。

## 8. 草稿与审批流

草稿功能适合把“准备发布”和“真实发布”拆开。

### 创建草稿

```bash
xhs draft create \
  --title "选题标题" \
  --content-file ./content.md \
  --image ./1.png \
  --image ./2.png
```

### 查看草稿

```bash
xhs draft list
xhs draft list --status draft
xhs draft list --status approved
xhs draft show <draft-id>
```

### 批准草稿

```bash
xhs draft approve <draft-id>
```

### 发布草稿

```bash
xhs draft publish <draft-id>
```

规则：

- 只有 `approved` 草稿才能发布。
- 发布流程会打开真实浏览器。
- 只有工具确认平台侧已发布时，草稿才会标记为 `published` 并写入 `published/` 归档。
- 如果需要人工确认或平台状态无法自动确认，草稿会保持 `approved`，可稍后重试。

### 查看发布归档

```bash
xhs published list
```

## 9. 交互模式

不带参数运行：

```bash
xhs
```

进入交互模式后，可以直接输入子命令：

```text
xhs> account current
xhs> browser unread --limit 3
xhs> posted --limit 5
xhs> exit
```

交互模式退出时会断开 CDP 连接，但不关闭浏览器。

## 10. 状态回归规则

浏览器自动化会尽量保持单一、可预测状态：

| 命令 | 状态处理 |
| --- | --- |
| `browser home` | 操作前关闭已打开的帖子详情弹窗 |
| `browser search` | 操作前关闭已打开的帖子详情弹窗 |
| `browser open` | 保留帖子详情弹窗 |
| `browser comment` | 复用或打开目标帖子；完成后关闭详情弹窗 |
| `browser unread` | 关闭帖子详情弹窗后进入通知页 |

站内跳转原则：

- 优先通过 DOM 点击现有入口、按钮、Tab。
- 这样可以保留平台前端状态和上下文参数。
- 找不到 DOM 入口时，才使用 URL 跳转兜底。

## 11. 当前命令索引

### 顶层命令

| 命令 | 说明 |
| --- | --- |
| `xhs` | 进入交互模式 |
| `xhs help` | 查看帮助 |
| `xhs login` | 主站登录，等价于 `xhs browser login` |
| `xhs metrics` | 创作者运营数据 |
| `xhs posted [--limit N]` | 已发笔记列表 |
| `xhs note-detail <noteId>` | 笔记详情 |
| `xhs post ...` | 填写或发布帖子 |

### 账号命令

| 命令 | 说明 |
| --- | --- |
| `xhs account list` | 列出账号 |
| `xhs account add <name> [--display-name <name>] [--role <role>]` | 添加账号 |
| `xhs account use <name>` | 切换当前账号 |
| `xhs account current` | 查看当前账号 |
| `xhs account show <name>` | 查看账号详情 |

### 浏览命令

| 命令 | 说明 |
| --- | --- |
| `xhs browser login` | 主站登录 |
| `xhs browser home [--limit N]` | 首页帖子 |
| `xhs browser search <关键词> [--limit N]` | 搜索帖子 |
| `xhs browser unread [--limit N]` | 评论和@通知 |
| `xhs browser open <noteId\|url>` | 打开帖子详情 |
| `xhs browser comment <noteId\|url> --content <评论> [--dry-run]` | 评论帖子 |
| `xhs browser comment <noteId\|url> --content-file <路径> [--dry-run]` | 从文件评论 |

### 草稿命令

| 命令 | 说明 |
| --- | --- |
| `xhs draft create --title <标题> (--content <正文> \| --content-file <路径>) [--image <路径>]...` | 创建草稿 |
| `xhs draft list [--status draft\|approved\|published]` | 草稿列表 |
| `xhs draft show <id>` | 草稿详情 |
| `xhs draft approve <id>` | 批准草稿 |
| `xhs draft publish <id>` | 发布已批准草稿 |
| `xhs published list` | 本地发布归档 |

## 12. 常见问题

### 已经登录但命令提示未登录

先确认当前账号是否正确：

```bash
xhs account current
```

必要时重新打开登录：

```bash
xhs browser login
```

### 为什么没有 `--account`

当前设计是单一当前账号模式。先执行：

```bash
xhs account use <name>
```

再执行短命令。这样命令更短，也避免同一操作里混用不同账号。

### `browser unread` 没显示帖子标题

通常是本地帖子缓存还没有对应封面。先运行：

```bash
xhs posted --limit 50
```

再运行：

```bash
xhs browser unread --limit 5
```

### 可以无头运行吗

默认使用有头浏览器。可以设置：

```bash
XHS_BROWSER_HEADLESS=true xhs metrics
```

但登录、发帖、browser 系列命令会强制有头，方便人工处理登录、验证码和平台状态。

### 会不会自动关闭我的浏览器

不会。命令结束后只断开 CDP 连接，不主动关闭浏览器窗口，也不会删除 `browser-data`。

