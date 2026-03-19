# 开发与测试 CLI

## 若提示 `Missing script: "dev"`

说明当前目录下的 **`package.json` 里没有 `dev` 脚本**。请确认：

1. 在仓库根目录（与 `package.json` 同级）执行命令；
2. 已保存/拉取最新代码（`scripts` 里应有 `"dev": "tsx src/cli.ts"`）；
3. 可改用等价命令：**`npm start`** 或 **`npm run xhs`**（同样跑 `tsx src/cli.ts`）。

---

## 开发模式跑 CLI（无需先 build）

仓库已配置脚本，直接用 **tsx** 跑源码（**`dev` / `start` / `xhs` 等价**）：

```bash
# 在仓库根目录
npm run dev -- help
npm start -- help          # 与 dev 相同
npm run xhs -- help

npm run dev -- login
npm run dev -- agent "检查登录状态"
```

注意：`npm run` 后面必须加 **`--`**，后面的参数才会传给 CLI。

等价于：

```bash
npx tsx src/cli.ts help
```

这样会走 **`src/agent/paths.ts`** 里的路径解析（优先 `dist/agent/boot.md`，没有则用 `src/agent/boot.md`）。若希望与发布版一致，可先执行一次 `npm run build`。

---

## 全局注册 `xhs` 命令（本机调试「像用户一样」用）

1. 先编译（`bin` 指向的是 `dist/cli.js`）：

   ```bash
   npm run build
   ```

2. 在仓库根目录执行：

   ```bash
   npm link
   ```

3. 任意目录即可使用：

   ```bash
   xhs help
   xhs login
   ```

取消链接：

```bash
npm unlink -g xhs-cli
```

（包名以 `package.json` 的 `name` 为准。）

---

## 新增或修改子命令

1. **实现**：在 `src/agent/toolImplementations.ts` 增加 `implXxx`（若与 Agent 工具共用），或在 `src/core/*` 写逻辑。
2. **挂到 CLI**：编辑 **`src/agent/cliRouter.ts`**：
   - 在 `runCli` 的 `switch (command)` 里增加 `case 'your-cmd': ...`
   - 更新 **`printHelp()`** 末尾那行「子命令（脚本）」提示，避免用户看不到新命令。
3. **（可选）暴露给 Agent**：在 **`src/agent/xhsTools.ts`** 的 `buildXhsAgentTools()` 里注册同名能力的工具，并在各工具的 `description` 里写清楚用途。

开发时用 `npm run dev -- your-cmd ...`（或 `npm run xhs -- ...`）验证即可。

---

## 其它脚本

| 命令 | 说明 |
|------|------|
| `npm run build` | `tsc` + 拷贝 prompts/templates/`boot.md` |
| `npm run test` | 测试入口 |
| `npm run test:cover` | 封面相关测试 |
| `npm run preview` | 模板预览 |

---

## Agent 模式（`xhs agent`）本地调试

需 **Node ≥ 20**，并配置对应平台的 API Key（如 `OPENAI_API_KEY`）。可选：

- `XHS_AI_PROVIDER`（默认 `openai`）
- `XHS_AI_MODEL`（默认 `gpt-4o-mini`）

```bash
npm run dev -- agent "列出待发队列"
```
