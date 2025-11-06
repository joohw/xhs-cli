# MCP 使用指南

本项目已实现完整的 MCP (Model Context Protocol) 服务器，可以通过 Claude Desktop、Cursor 或其他支持 MCP 的客户端使用。

## 🚀 一键部署（推荐）

最简单的方式是使用自动配置脚本，**无需手动配置路径**：

```bash
# 1. 安装依赖（如果还没安装）
npm install

# 2. 一键部署到所有支持的客户端（Claude Desktop 和 Cursor）
npm run setup

# 或者只部署到特定客户端
npm run setup:claude    # 仅 Claude Desktop
npm run setup:cursor    # 仅 Cursor
npm run setup:all       # 所有客户端（等同于 npm run setup）
```

脚本会自动：
- ✅ 检测并构建项目（如果未构建）
- ✅ 自动检测项目路径（无需手动输入）
- ✅ 配置 Claude Desktop 和/或 Cursor
- ✅ 创建必要的配置文件和目录

部署完成后，重启对应的客户端即可使用！

## 前置要求

1. 确保已安装依赖：`npm install`
2. 确保已登录小红书：`npm run xhs login`（部署后也可以在 MCP 客户端中登录）

## 手动配置（可选）

如果自动配置脚本无法正常工作，可以手动配置：

### 在 Claude Desktop 中配置

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

