# xhs-cli

在终端里使用的小红书工具：**登录**、**创作者指标**、**创作者后台已发笔记**（`recent`）、**单篇笔记详情**（`detail`）、**本地发帖归档**（`posted`），以及用**标题 + 正文 + 本地图片路径**在创作后台填表发帖（`post`，需本机 Chrome/Chromium）。

v0.1 起支持**多账号隔离**（独立浏览器会话目录）、本地**草稿与审批语义**、`publish` **后的本地归档**；适合与 Agent 或自动化流程编排配合，仍以**本地人机确认**为前提。

---

## 依赖

- **Node.js** 20 及以上  
- **Chrome 或 Chromium**（不随包下载；由 Puppeteer 连接本机浏览器）

---

## 安装与本地运行

全局安装：

```bash
npm install -g xhs-cli
```

从源码：

```bash
git clone https://github.com/joohw/xhs-cli.git
cd xhs-cli
npm install
npm run build
```

构建产物入口为 `dist/cli/index.js`，等价于命令 **`xhs`**。

---

## 数据目录与安全说明

默认数据在 **`~/.xhs-cli/.cache/`**。

- **浏览器会话（CLI）**：须至少执行过一次 **`xhs account add <name>`** 并在注册表中有条目；Cookie 与用户数据目录为 **`~/.xhs-cli/.cache/accounts/<name>/browser-data`**。`resolveSession` 不会在无账号配置时静默使用全局 `cache/browser-data`。**每次**业务命令均须在命令行中通过 **`--account <slug>`** 或该命令支持的 **位置参数 `<slug>`** 指明账号；不再根据「默认账号」或「仅有一个账号」自动推断。
- **注册表**：**`accounts/registry.json`** 记录各账号目录；其中的 `currentAccount` 为旧版遗留字段，当前 CLI **不读取**。

**草稿**按账号保存在 **`~/.xhs-cli/.cache/accounts/<name>/drafts/`**（遗留的 **`drafts/`** 根目录仍可读，保存时会迁到对应账号目录）；**发布后本地归档**在 `published/`（仅记账，不可替代平台侧状态）。

### 发帖与发布（重要）

本工具 **不会静默向小红书发稿**。`xhs post` 默认只打开创作页并填入内容；是否在页面里正式发布由你本人决定。可选 `--publish` 才会在浏览器里尝试自动点击页面上「发布」。

`xhs draft post` 同上：只有在人工愿意走通该命令、且草稿已 **`draft approve`** 后才会发起浏览器发帖流程；失败后草稿状态仍为 `approved`。

---

## 多账号 Quickstart（示例）

多个本地账号条目（名称限 `[a-zA-Z0-9._-]+`，下列仅为占位示例）：

```bash
xhs account add account-a
xhs account add account-b
xhs account add account-c
```

按账号登录（会话目录互不干扰）：

```bash
xhs login --account account-a
xhs login --account account-b
```

发帖或拉数据时可以显式切换账号上下文：

```bash
xhs post --account account-c --title "标题" --content "正文至少十个字小红书校验" --image ./cover.png
xhs metrics --account account-b
xhs recent --account account-b --limit 20
xhs posted --account account-b
```

每条命令都带上 `--account <slug>`，或在支持子命令上用位置参数写同一 slug，例如 `xhs metrics account-b`、`xhs recent account-b --limit 20`。

---

## 草稿与审批 Quickstart

```bash
xhs draft --account account-b --title "选题标题" \
  --content "正文内容与长度需满足发帖校验，见报错提示" \
  --image ./1.png --image ./2.png

xhs drafts --account account-b
xhs draft show <草稿 id> [--account account-b]
xhs draft approve <草稿 id> [--account account-b]

# 仅当你确认要立即走浏览器发帖链路时：
xhs draft post <草稿 id> [--account account-b]
```

成功后：草稿标记为 **`published`**，并在 `published/` 写入一条 JSON 归档。失败则不改状态。

```bash
xhs posted --account account-b
```

---

## 命令

与 `xhs help` 一致（节选）。

| 用法 | 说明 |
|------|------|
| （无子命令） | 打印帮助到 stderr，退出码 `1` |
| `xhs help` | 打印帮助 |
| **`xhs account list`** | 列出已配置账号 |
| **`xhs account add <name>`** | 创建账号目录、`browser-data`、`policy.md` |
| **`xhs account show <name>`** | 显示单账号配置 |
| `xhs login [--account …]` | 浏览器登录 |
| `xhs metrics [<slug>] [--account <name>]` | 创作者后台运营数据摘要（与 `resolveSession` 同一套账号解析） |
| `xhs recent [<slug>] [--account …] [--limit N]` | 创作者后台已发笔记列表 |
| `xhs posted [<slug>] [--account …]` | 本地发帖归档列表 |
| `xhs detail <noteId> [<slug>] [--account …]` | 笔记详情 |
| **`xhs draft …`** | 新建草稿（无 `create` 子命令，直接跟 `--title` 等） |
| **`xhs drafts [--account …] [--status …]`** | 草稿列表 |
| **`xhs draft show <id> [--account …]`** | 草稿详情 |
| **`xhs draft approve <id> [--account …]`** | 置为 **approved** |
| **`xhs draft post <id> [--account …]`** | 对已批准草稿触发发帖逻辑（仍需真实浏览器环境） |

**`post` 子命令**

```bash
xhs post \
  --title "标题" \
  --content "正文（须满足长度校验）" \
  --image ./1.png \
  --image ./2.jpg \
  [--account <name>]
```

- `--image` 至少 1 张、最多 18 张。**`--publish`**：填表后尝试自动点击「发布」（仍视页面实际状态而定）。  

仓库内 **`src/config.ts`** 与各工具实现细节；**`AGENTS.md`** 供自动化/协作参考。

---

## 开发脚本

| 命令 | 作用 |
|------|------|
| `npm run build` | `tsc` 编译到 `dist/` |
| `npm run dev` | 先 `build` 再执行 `xhs help`（验证 CLI 可运行） |

---

## 许可证

本项目以 [GNU General Public License v3.0](./LICENSE)（GPL-3.0）发布。

---

## 链接

- 仓库：<https://github.com/joohw/xhs-cli>  
- Issues：<https://github.com/joohw/xhs-cli/issues>
