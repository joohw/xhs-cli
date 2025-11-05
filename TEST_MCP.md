# MCP 服务器测试指南

## 快速测试

### 1. 基本功能测试

```bash
# 构建项目
npm run build

# 运行测试脚本
tsx src/mcp/test.ts
```

### 2. 启动 MCP 服务器

```bash
# 开发模式（自动重载）
npm run dev

# 生产模式
npm run build
npm start
```

服务器启动后，会通过 stdio 与客户端通信。不会在控制台输出内容（除了错误信息）。

### 3. 测试工具调用

#### 方法1: 使用 Node.js 脚本测试

创建一个测试文件 `test-mcp-call.js`:

```javascript
import { spawn } from 'child_process';

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// 发送 MCP 请求
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

server.stdin.write(JSON.stringify(request) + '\n');

server.stdout.on('data', (data) => {
  console.log('收到响应:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('错误:', data.toString());
});

server.on('close', (code) => {
  console.log(`进程退出，代码: ${code}`);
});
```

#### 方法2: 使用 MCP Inspector

MCP Inspector 是一个用于测试 MCP 服务器的工具：

```bash
# 安装 MCP Inspector（如果可用）
npm install -g @modelcontextprotocol/inspector

# 运行 inspector
mcp-inspector node dist/index.js
```

#### 方法3: 在 Claude Desktop 中测试

1. **配置 Claude Desktop**

   找到配置文件：
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **添加配置**

   ```json
   {
     "mcpServers": {
       "xhs-mcp": {
         "command": "node",
         "args": ["F:\\gitProject\\xhs-mcp\\dist\\index.js"]
       }
     }
   }
   ```

   **注意**: 路径必须是绝对路径，Windows 路径可以使用正斜杠或双反斜杠。

3. **重启 Claude Desktop**

   配置完成后，重启 Claude Desktop。

4. **测试工具**

   在 Claude 对话中，你可以：
   - 直接使用工具，如："使用 xhs_check_login 检查登录状态"
   - 查看可用工具列表

### 4. 测试单个工具

#### 测试登录检查

```bash
# 先确保已登录
npm run xhs login

# 测试工具
tsx src/mcp/test.ts
```

#### 测试获取运营数据

```bash
# 确保已登录后
# 在 Claude Desktop 中使用: "使用 xhs_get_overall_data 获取运营数据"
```

## 调试技巧

### 1. 查看服务器日志

MCP 服务器的错误信息会输出到 `stderr`，所以启动时可以看到：

```bash
npm run dev
# 会看到: "小红书 MCP 服务器已启动"
```

### 2. 测试工具定义

```bash
# 测试工具列表是否正确
node -e "
import('./dist/mcp/tools.js').then(m => {
  const tools = m.getTools();
  console.log('工具数量:', tools.length);
  tools.forEach(t => console.log('-', t.name));
});
"
```

### 3. 测试工具处理器

```bash
# 测试处理器
tsx -e "
import { handleCheckLogin } from './src/mcp/handlers.js';
handleCheckLogin().then(r => console.log(JSON.stringify(r, null, 2)));
"
```

## 常见问题

### 问题1: 服务器启动失败

**症状**: 运行 `npm start` 时报错

**解决**:
- 确保已构建: `npm run build`
- 检查 `dist/index.js` 是否存在
- 查看错误信息

### 问题2: Claude Desktop 无法连接

**症状**: 配置后 Claude Desktop 无法使用工具

**解决**:
- 检查路径是否正确（必须是绝对路径）
- 检查文件是否存在: `dist/index.js`
- 查看 Claude Desktop 的日志文件
- 确保路径中没有特殊字符

### 问题3: 工具调用返回错误

**症状**: 工具调用时返回错误

**解决**:
- 确保已登录: `npm run xhs check-login`
- 检查登录状态工具: `xhs_check_login`
- 查看服务器 stderr 输出

## 完整测试流程

1. **构建项目**
   ```bash
   npm run build
   ```

2. **测试工具定义**
   ```bash
   tsx src/mcp/test.ts
   ```

3. **启动服务器**
   ```bash
   npm run dev
   ```

4. **在另一个终端测试 CLI（确保功能正常）**
   ```bash
   npm run xhs check-login
   npm run xhs get-overall-data
   ```

5. **配置 Claude Desktop**
   - 编辑配置文件
   - 重启 Claude Desktop

6. **在 Claude 中测试**
   - 使用 `xhs_check_login` 检查登录状态
   - 使用 `xhs_get_overall_data` 获取数据
   - 使用其他工具测试

## 自动化测试（可选）

如果需要自动化测试，可以创建测试套件：

```bash
# 安装测试框架
npm install --save-dev jest @types/jest

# 创建测试文件
# src/mcp/__tests__/handlers.test.ts
```

## 性能测试

测试 MCP 服务器的响应时间：

```bash
# 使用 time 命令
time node dist/index.js
```

## 下一步

- 查看 [GUIDEFORMCP.md](./GUIDEFORMCP.md) 了解详细配置
- 查看 [README.md](./README.md) 了解项目概述

