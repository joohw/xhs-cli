# xhs-cli

在终端里使用的小红书工具：**登录**、**创作者指标**、**已发笔记列表**、**单篇笔记详情**，以及用**标题 + 正文 + 本地图片路径**在创作后台填表发帖（需本机 Chrome/Chromium）。

v0.1 起支持**多账号隔离**（独立浏览器会话目录）、本地**草稿与审批语义**、`publish` **后的本地归档**；适合与 JooOS / Agent 编排配合，仍以**本地人机确认**为前提。

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

- **未配置多账号时**：会话与 Cookie 与原行为一致，使用 `~/.xhs-cli/.cache/browser-data`。  
- **配置多账号后**：每个账号有独立 **`~/.xhs-cli/.cache/accounts/<name>/browser-data`**；注册表 **`accounts/registry.json`** 记录 `currentAccount`。未设置默认账号或未带 `--account` 时仍会落回 **`browser-data`**，避免老用户突然被迁档。  

**草稿**在 `drafts/`，**发布后本地归档记录在** `published/`（仅记账，不可替代平台侧状态）。

### 发帖与发布（重要）

本工具 **不会静默向小红书发稿**。`xhs post` 默认只打开创作页并填入内容；是否在页面里正式发布由你本人决定。可选 `--publish` 才会在浏览器里尝试自动点击页面上「发布」。

`xhs draft publish` 同上：只有在人工愿意走通该命令、且草稿已 **`draft approve`** 后才会发起浏览器发帖流程；失败后草稿状态仍为 `approved`。

---

## 多账号 Quickstart（JooOS 三账号示例）

三条独立运营线可先在本地建好账号条目（名称限 `[a-zA-Z0-9._-]+`）：

```bash
xhs account add joo-main --display-name Joo --role personal
xhs account add agidaily --display-name agidaily --role media
xhs account add clovapi --display-name clovapi --role product

xhs account use agidaily
xhs account current
```

按账号登录（会话目录互不干扰）：

```bash
xhs login --account joo-main
xhs login --account agidaily
```

发帖或拉数据时可以显式切换账号上下文：

```bash
xhs post --account clovapi --title "标题" --content "正文至少十个字小红书校验" --image ./cover.png
xhs metrics --account agidaily
xhs posted --account agidaily --limit 20
```

若已 `account use <name>`，可省略 `--account`。

---

## 草稿与审批 Quickstart

```bash
xhs draft create --account agidaily --title "选题标题" \
  --content "正文内容与长度需满足发帖校验，见报错提示" \
  --image ./1.png --image ./2.png

xhs draft list --account agidaily
xhs draft show <草稿 id>
xhs draft approve <草稿 id>

# 仅当你确认要立即走浏览器发帖链路时：
xhs draft publish <草稿 id>
```

成功后：草稿标记为 **`published`**，并在 `published/` 写入一条 JSON 归档。失败则不改状态。

```bash
xhs published list --account agidaily
```

---

## 命令

与 `xhs help` 一致（节选）。

| 用法 | 说明 |
|------|------|
| `xhs` | 交互模式：提示符 `xhs> `，每行一条子命令 |
| `xhs help` | 打印帮助 |
| **`xhs account list`** | 列出账号（`*` 标当前默认） |
| **`xhs account add <name> [--display-name …] [--role …]`** | 创建账号目录、`browser-data`、`policy.md` |
| **`xhs account use <name>`** | 设为默认账号 |
| **`xhs account current`** | 显示默认账号 |
| **`xhs account show <name>`** | 显示单账号配置 |
| `xhs login [--account …]` | 浏览器登录 |
| `xhs metrics [--account …]` | 创作者后台运营数据摘要 |
| `xhs posted [--account …] [--limit N]` | 已发笔记列表 |
| `xhs note-detail <noteId> [--account …]` | 笔记详情 |
| **`xhs draft create …`** | 新建草稿 JSON |
| **`xhs draft list [--account …] [--status …]`** | 草稿列表 |
| **`xhs draft show <id>`** | 草稿详情 |
| **`xhs draft approve <id>`** | 置为 **approved** |
| **`xhs draft publish <id>`** | 对已批准草稿触发发帖逻辑（仍需真实浏览器环境） |
| **`xhs published list [--account …]`** | 本地发布归档 |

**`post` 子命令**

```bash
xhs post \
  --title "标题" \
  --content "正文（须满足长度校验）" \
  --image ./1.png \
  --image ./2.jpg \
  [--account agidaily]
```

- `--image` 至少 1 张、最多 18 张。**`--publish`**：填表后尝试自动点击「发布」（仍视页面实际状态而定）。  

**交互模式**

- 支持单引号/双引号包裹含空格的参数。  
- 输入 `help` 查看帮助，`exit` / `quit` 退出；**Ctrl+C** 正常退出，不当作错误。

仓库内 **`src/config.ts`** 与各工具实现细节；**`AGENTS.md`** 供自动化/协作参考。

---

## 开发脚本

| 命令 | 作用 |
|------|------|
| `npm run build` | `tsc` 编译到 `dist/` |
| `npm run dev` | 先 `build` 再执行无参 `xhs`（进入交互模式） |

---

## 许可证

本项目以 [GNU General Public License v3.0](./LICENSE)（GPL-3.0）发布。

---

## 链接

- 仓库：<https://github.com/joohw/xhs-cli>  
- Issues：<https://github.com/joohw/xhs-cli/issues>
