# xhs-cli

面向个人创作者的 **小红书命令行工具**：用子命令完成登录校验、创作者数据与笔记详情，以及**一次性参数发帖**（标题、正文、本地图片路径）。

---

## 环境要求

| 项目 | 说明 |
|------|------|
| Node.js | ≥ 20 |
| 浏览器 | 需本机已安装 **Chrome 或 Chromium**（包内不自带 Chromium；Puppeteer 使用系统浏览器） |

---

## 安装

```bash
npm install -g xhs-cli
```

本地开发可将仓库链接为全局命令：

```bash
git clone <本仓库 URL>
cd xhs-cli
npm install
npm run build
npm link
```

---

## 命令一览

```text
xhs                    # 交互模式：提示符 xhs> ，每行一条子命令（不必写前缀 xhs）
xhs help
xhs login
xhs check-login
xhs metrics
xhs posted [--limit <n>]
xhs note-detail <noteId>
xhs post --title <标题> (--content <正文> | --content-file <路径>)
        [--image <图片路径>] ...   # 至少 1 张、最多 9 张；顺序即上传顺序
```

运行 `xhs help` 与上述一致。

### 交互模式

- 直接执行 **`xhs`**（无参数）进入 REPL；语法与 **`xhs <子命令 …>`** 相同，支持用 **单引号/双引号** 包裹含空格的参数。
- **`help`** 打印帮助；**`exit`** / **`quit`** 退出；**Ctrl+C** 视为正常结束（不当作错误）。

### `post` 说明

- **无队列、无状态**：每次发帖只使用当次传入的 `--title`、`--content` 或 `--content-file`，以及若干 `--image`；不会在 CLI 层维护待发文件。
- 正文长度需符合实现中的校验（例如不少于 10 字、不超过 1000 字，以运行时提示为准）。

---

## 数据目录

应用数据默认在 **`~/.xhs-cli/.cache/`**（Cookie、笔记缓存、浏览器用户数据等）。详见 **`src/config.ts`**。给自动化助手看的约定见 **[AGENTS.md](./AGENTS.md)**。

---

## 开发与构建

```bash
npm install
npm run build    # 生成 dist/，入口为 dist/cli/index.js
node dist/cli/index.js help
```

`package.json` 中的 **`npm run dev`** 会先 `build` 再执行无参入口（进入交互模式）。

---

## 许可证

MIT

---

## 链接

- 源码 / 发行：<https://github.com/joohw/xhs-cli>
- 问题反馈：<https://github.com/joohw/xhs-cli/issues>
