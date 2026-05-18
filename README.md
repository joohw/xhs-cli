# xhs-cli

在终端里使用的小红书工具：**登录**、**创作者指标**、**创作者后台已发笔记**（`recent`）、**单篇笔记详情**（`detail`）、**本地发帖归档**（`posted`），以及用**标题 + 正文 + 本地图片路径**在创作后台填表发帖（`post`，需本机 Chrome/Chromium）。

支持**多账号隔离**（每账号独立浏览器会话目录），适合与 Agent 或自动化流程编排配合；发帖仍以**本地人机确认**为前提。

## 依赖

- **Node.js** 20 及以上
- **Chrome 或 Chromium**（本机已安装；CLI 通过 Puppeteer 连接，不随包下载浏览器）

## 安装

```bash
npm install -g xhs-cli
```

安装后使用命令 **`xhs`**。完整子命令列表：`xhs help`。

## 快速开始

### 1. 添加账号并登录

账号名仅允许 `[a-zA-Z0-9._-]+`：

```bash
xhs account add my-account
xhs account use my-account
xhs login
```

`login` 成功后会自动把该账号记为**当前账号**。会话保存在 `~/.xhs-cli/.cache/accounts/<name>/browser-data`。

### 2. 发帖（填表）

```bash
xhs post \
  --title "标题" \
  --content "正文至少十个字，须满足小红书长度校验" \
  --image ./cover.png
```

- `--image` 可重复，至少 1 张、最多 18 张；也可用 `--content-file <路径>` 代替 `--content`。
- 默认只填表，**不会**自动点击发布；加 `--publish` 会在填表后尝试点击页面「发布」按钮。
- 临时操作其他账号：`--account other`。

### 3. 查看数据

```bash
xhs metrics
xhs recent --limit 20
xhs detail <noteId>
xhs posted
```

## 当前账号

| 命令 | 说明 |
|------|------|
| `xhs account use <name>` | 设置当前账号（写入 `registry.json`） |
| `xhs account current` | 打印当前账号 slug |
| `xhs account list` | 列表中带 `*` 的为当前账号 |

业务命令**默认使用当前账号**，无需每次写账号参数。临时切换仅支持 **`--account <slug>`**。

未设置当前账号时，命令会提示先执行 `xhs account use <name>`。

## 命令一览

| 命令 | 说明 |
|------|------|
| `xhs help` | 打印帮助 |
| `xhs account list` | 列出已配置账号 |
| `xhs account add <name>` | 新建账号（首个账号会自动设为当前） |
| `xhs account show <name>` | 查看单账号配置 |
| `xhs account use <name>` | 设置当前账号 |
| `xhs account current` | 显示当前账号 |
| `xhs login [--account <name>]` | 登录创作者中心 |
| `xhs metrics [--account <name>]` | 运营数据摘要 |
| `xhs recent [--limit N] [--account <name>]` | 创作者后台已发笔记 |
| `xhs detail <noteId> [--account <name>]` | 笔记详情 |
| `xhs posted [--account <name>]` | 本地 `published/` 归档列表 |
| `xhs post --title … (--content … \| --content-file …) --image … [--account <name>]` | 创作页填表发帖 |

## 数据目录

默认路径：**`~/.xhs-cli/.cache/`**

| 路径 | 说明 |
|------|------|
| `accounts/registry.json` | 账号注册表（含 `currentAccount`） |
| `accounts/<name>/browser-data/` | 该账号 Chrome 会话（Cookie 等） |
| `published/` | 本地发帖归档 JSON（`xhs posted`） |

## 发帖说明

- 本工具**不会**在未经你确认的情况下向小红书发稿。
- `xhs post` 未加 `--publish` 时：填入标题、正文、图片后保持浏览器窗口，由你在页面中确认并发布。
- `--publish` 会尝试自动点击「发布」，是否成功以页面实际状态为准。

## 许可证

[GNU General Public License v3.0](./LICENSE)（GPL-3.0）

## 链接

- 仓库：<https://github.com/joohw/xhs-cli>
- Issues：<https://github.com/joohw/xhs-cli/issues>
