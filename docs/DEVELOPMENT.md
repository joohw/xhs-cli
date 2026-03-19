# 开发与测试 CLI

## 构建 → 安装到系统 → 动态调试（总览）

### 1. 这条命令行是怎么「构建」出来的？

| 步骤 | 做什么 |
|------|--------|
| **源码** | `src/cli.ts` 为入口，业务在 `src/core/*`、`src/agent/*` |
| **`npm run build`** | ① `tsc` 把 TypeScript 编译到 **`dist/`**（含 `dist/cli.js`）<br>② `copy:assets` 拷贝 `prompts`、`templates`、`src/agent/boot.md` → `dist/` 下对应位置 |
| **可执行入口** | `package.json` 里 **`"bin": { "xhs": "dist/cli.js" }`**：全局安装后，系统里的 `xhs` 命令会执行 **`node dist/cli.js`**（首行 `#!/usr/bin/env node`） |

没有 `build` 时，`dist/` 可能不存在或过旧，**不要指望**全局 `xhs` 能代表你刚改的源码。

### 2. 怎么「安装到系统」里？

**正式用户（从 npm）：**

```bash
npm install -g xhs-cli
```

npm 会把包装到全局 `node_modules`，并在 PATH 里注册 **`xhs`** → 指向该包内的 `dist/cli.js`。

**开发者（本仓库直接当全局命令用）：**

```bash
cd /path/to/xhs-cli
npm run build
npm link          # 把当前目录链接到全局，xhs 指向这里的 dist/cli.js
```

或：**`npm install -g .`**（同样需先 `build`，在仓库根目录执行）。

卸载链接：`npm unlink -g xhs-cli`（包名以 `package.json` 的 `name` 为准）。

### 3. 怎么「动态调试」（改代码立刻跑，不必每次 build）？

- **日常最快**：用 **tsx 直接跑 TS 源码**，改完保存再跑即可：

  ```bash
  npm run dev -- help
  npx tsx src/cli.ts login
  ```

- **需要断点调试（Chrome / Cursor）**：让 Node 进入 inspect 模式再启动 CLI，例如 PowerShell：

  ```powershell
  $env:NODE_OPTIONS="--inspect-brk"
  npm run dev -- help
  ```

  然后在浏览器打开 `chrome://inspect` 或 Cursor/VS Code 的 **Attach to Node** 连接到该进程。用完记得清空 `NODE_OPTIONS`。

- **与「全局 xhs」对比**：`npm link` 后的 `xhs` 跑的是 **编译后的 `dist/`**；要验证刚改的 `.ts`，请用上面的 **`npm run dev`**，或在改完后 **`npm run build`** 再执行 `xhs`。

---

## 若提示 `Missing script: "dev"`

### 为什么会这样？和「我预期的不一样」？

- **`npm run dev` 只读磁盘上的 `package.json`**，不读你在编辑器里「还没保存」的内容，也不读 GitHub 上「还没 pull」的内容。  
  所以：**仓库里明明有 `dev`，但你本机报错** = 你当前目录下的那份 `package.json` 里**实际上没有** `"dev"` 这一段（旧文件、别的分支、未保存、拷错目录）。
- **`npm warn … puppeteer_skip_chromium_download`** 来自 **npm 配置**，除了项目里的 `.npmrc`，还会合并：  
  **上级文件夹的 `.npmrc`**、**用户目录** `C:\Users\<你>\.npmrc`、**全局** `npm config -g`。  
  只要**任意一层**写了 `puppeteer_skip_chromium_download`，就会警告；**删掉项目根 `.npmrc` 里的那一行也不够**，要查其它层级。

### 在本机立刻核对（PowerShell）

在 **`E:\projects\xhs-cli`** 执行：

```powershell
Get-Location
Select-String -Path package.json -Pattern '"dev"'
npm run
```

- 若 **`Select-String` 没有匹配**，说明磁盘上的 `package.json` 里**没有** `dev`：保存/拉取/合并代码，或从远程把 `package.json` 更新到和仓库一致。
- **`npm run` 列表里应有 `dev`**；若没有，同上。

查 puppeteer 警告来源：

```powershell
npm config list
# 看输出里是否仍有 puppeteer_skip_chromium_download；若有，根据提示的文件路径删掉对应行
```

### 仍缺 `dev` 时的替代

1. **`npm run xhs`** 或 **`npm start`**（与 `dev` 等价，前提是 `package.json` 里也有这两个脚本）。  
2. 不依赖 scripts：**`npx tsx src/cli.ts help`**

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
