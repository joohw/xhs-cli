# MCP 传输方式说明

## 两种传输方式

MCP 协议支持两种传输方式：

### 1. stdio（标准输入输出）- 我们使用的

**特点**：
- ✅ 简单、轻量
- ✅ 不需要端口
- ✅ 适合命令行工具
- ✅ 更安全（不需要网络监听）
- ❌ 只能本地使用

**实现方式**：
```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

**配置方式**：
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

### 2. HTTP/SSE（HTTP 服务器）- 需要端口

**特点**：
- ✅ 可以远程访问
- ✅ 可以通过浏览器访问
- ✅ 适合 Web 应用集成
- ❌ 需要启动 HTTP 服务器
- ❌ 需要管理端口
- ❌ 需要处理 CORS

**实现方式**：
```typescript
// 需要启动 HTTP 服务器
const server = http.createServer();
// 监听 localhost:3000 等端口
```

**配置方式**：
```json
{
  "mcpServers": {
    "some-mcp": {
      "url": "http://localhost:3000"
    }
  }
}
```

## 为什么我们使用 stdio？

1. **更简单**：不需要管理服务器生命周期
2. **更安全**：不暴露端口，只能本地访问
3. **更轻量**：没有 HTTP 开销
4. **适合 CLI 工具**：我们的项目本身就是 CLI 工具

## 什么时候需要 HTTP/SSE？

- 需要从浏览器访问
- 需要远程访问
- 需要多个客户端同时连接
- 需要 Web 应用集成

## 如何切换到 HTTP/SSE（如果需要）

如果你需要 HTTP 方式，可以修改 `src/index.ts`：

```typescript
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import http from 'http';

const server = http.createServer();
const transport = new SSEServerTransport('/message', server);

await server.listen(3000, () => {
  console.error('MCP 服务器运行在 http://localhost:3000');
});

await server.connect(transport);
```

然后配置：
```json
{
  "mcpServers": {
    "xhs-mcp": {
      "url": "http://localhost:3000"
    }
  }
}
```

但通常 stdio 就足够了！


