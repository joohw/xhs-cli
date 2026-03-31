# xhs-cli

在终端里使用的小红书工具：**登录**、**检查登录**、**创作者指标**、**已发笔记列表**、**单篇笔记详情**，以及用**标题 + 正文 + 本地图片路径**在创作后台填表发帖（需本机 Chrome/Chromium）。

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

## 命令

与 `xhs help` 一致：

| 用法 | 说明 |
|------|------|
| `xhs` | 交互模式：提示符 `xhs> `，每行一条子命令（不必再加前缀 `xhs`） |
| `xhs help` | 打印帮助 |
| `xhs login` | 浏览器登录 |
| `xhs metrics` | 创作者后台运营数据摘要 |
| `xhs posted [--limit N]` | 已发笔记列表，可选条数上限 |
| `xhs note-detail <noteId>` | 指定笔记 ID 的详情 |
| `xhs post ...` | 见下表 |

**`post` 子命令**

```bash
xhs post \
  --title "标题" \
  --content "正文（须满足长度校验，见运行时报错提示）" \
  --image ./1.png \
  --image ./2.jpg
```

或使用文件作为正文：

```bash
xhs post --title "标题" --content-file ./body.txt --image ./cover.png
```

- `--image` 至少 1 张、最多 18 张，**顺序即上传顺序**。  
- 每次调用只使用当次参数，**不维护待发队列**。  
- **`--publish`**（或 `--publish=true`）：填表后自动点击页面「发布」；默认不带则只填表，可在浏览器里改完再手动发布。

**交互模式**

- 支持单引号/双引号包裹含空格的参数。  
- 输入 `help` 查看帮助，`exit` / `quit` 退出；**Ctrl+C** 正常退出，不当作错误。

---

## 数据目录

默认数据在 **`~/.xhs-cli/.cache/`**（Cookie、缓存、浏览器用户数据目录等），细节见 **`src/config.ts`**。仓库内 **[AGENTS.md](./AGENTS.md)** 供自动化/协作参考。

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
