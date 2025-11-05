# MCP 使用指南

本项目已实现完整的 MCP (Model Context Protocol) 服务器，可以通过 Claude Desktop、Cursor 或其他支持 MCP 的客户端使用。

> 💡 **Cursor 用户**: 请查看 [CURSOR_MCP.md](./CURSOR_MCP.md) 获取 Cursor 专用配置指南

## 前置要求

1. 确保已构建项目：`npm run build`
2. 确保已登录小红书：`npm run xhs login`

## 在 Claude Desktop 中配置

### 1. 找到配置文件位置

**macOS**:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

### 2. 编辑配置文件

如果文件不存在，创建它。添加以下配置：

**macOS / Linux**:
```json
{
  "mcpServers": {
    "xhs-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/xhs-mcp/dist/index.js"]
    }
  }
}
```

**Windows**:
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

**注意**：
- 路径必须是**绝对路径**
- Windows 路径可以使用双反斜杠 `\\` 或正斜杠 `/`
- 确保路径指向构建后的 `dist/index.js` 文件

### 3. 重启 Claude Desktop

配置完成后，重启 Claude Desktop 使配置生效。

## 可用工具

配置成功后，你可以在 Claude 中使用以下工具：

- `xhs_check_login` - 检查登录状态
- `xhs_get_overall_data` - 获取运营数据
- `xhs_get_note_statistics` - 获取笔记统计
- `xhs_get_note_detail_by_id` - 获取笔记详情
- `xhs_get_all_notes_detail` - 获取所有笔记详情
- `xhs_read_posting_guidelines` - 读取发帖指导原则
- `xhs_login_status` - 获取登录状态信息
- `xhs_login` - 执行登录

## 测试 MCP 服务器

直接运行服务器测试：

```bash
npm start
```

服务器会通过 stdio 与客户端通信，不应该直接输出内容（除了错误信息）。

## 故障排查

1. **服务器无法启动**
   - 确保已运行 `npm run build`
   - 检查路径是否正确
   - 查看 Claude Desktop 的错误日志

2. **工具调用失败**
   - 确保已登录：`npm run xhs check-login`
   - 如果未登录，使用 `xhs_login` 工具登录

3. **路径问题**
   - Windows 用户注意使用正确的路径格式
   - 可以使用 `path.resolve()` 或相对路径（如果配置正确）

## 开发模式

开发时可以使用：

```bash
npm run dev
```

这会启动监听模式，代码变更后自动重启。

