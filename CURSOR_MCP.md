# 在 Cursor 中使用 MCP 服务器

Cursor 编辑器支持 MCP (Model Context Protocol)，可以通过配置使用本项目的小红书 MCP 服务器。

## 前置要求

1. **构建项目**
   ```bash
   npm run build
   ```

2. **确保已登录小红书**（可选，配置时不需要）
   ```bash
   npm run xhs login
   ```

## 一键配置（推荐）

最简单的方式是使用内置的一键配置命令：

```bash
# 在项目目录下运行
npm run xhs setup-cursor
```

这个命令会自动：
- ✅ 检测你的操作系统（Windows/macOS/Linux）
- ✅ 找到 Cursor 配置文件位置
- ✅ 获取项目绝对路径
- ✅ 创建或更新配置文件
- ✅ 显示配置结果和下一步操作

**注意**：必须在项目根目录下运行此命令。

## 手动配置步骤

如果你想手动配置，可以按照以下步骤：

### 方法 1: 找到 Cursor 配置文件

Cursor 的 MCP 配置文件位置：

**macOS**:
```
~/Library/Application Support/Cursor/User/globalStorage/cursor.mcp/mcp.json
```

**Windows**:
```
%APPDATA%\Cursor\User\globalStorage\cursor.mcp\mcp.json
```

或者通过 Cursor 设置：
- 打开 Cursor 设置 (Cmd/Ctrl + ,)
- 搜索 "MCP" 或 "Model Context Protocol"
- 找到 MCP 配置选项

### 方法 2: 编辑配置文件

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

### 方法 3: 获取项目绝对路径

**Windows**:
```powershell
# 在项目目录下运行
pwd
# 或
cd $PWD; echo "$PWD\dist\index.js"
```

**macOS / Linux**:
```bash
# 在项目目录下运行
pwd
# 输出结果类似: /Users/yourname/projects/xhs-mcp
# 完整路径: /Users/yourname/projects/xhs-mcp/dist/index.js
```

### 方法 4: 重启 Cursor

配置完成后，重启 Cursor 使配置生效。

## 验证配置

### 方法 1: 检查 Cursor 日志

1. 打开 Cursor
2. 查看开发者工具（Help > Toggle Developer Tools）
3. 查看 Console 标签，应该看到 MCP 服务器连接信息

### 方法 2: 在 Cursor 中使用

配置成功后，在 Cursor 的 AI 聊天中：

1. 打开 Cursor 的 AI 面板（Cmd/Ctrl + L）
2. 尝试使用工具，例如：
   - "检查我的小红书登录状态"
   - "获取我的运营数据"
   - "查看我的笔记统计"

Cursor 会自动调用相应的 MCP 工具。

## 可用工具

配置成功后，你可以在 Cursor 中使用以下工具：

- `xhs_check_login` - 检查登录状态
- `xhs_get_overall_data` - 获取运营数据
- `xhs_get_note_statistics` - 获取笔记统计
- `xhs_get_note_detail_by_id` - 获取笔记详情
- `xhs_get_all_notes_detail` - 获取所有笔记详情
- `xhs_read_posting_guidelines` - 读取发帖指导原则
- `xhs_login_status` - 获取登录状态信息
- `xhs_login` - 执行登录

## 使用示例

### 示例 1: 检查登录状态

在 Cursor 的 AI 聊天中输入：
```
检查我的小红书登录状态
```

Cursor 会自动调用 `xhs_check_login` 工具。

### 示例 2: 获取运营数据

```
帮我获取今天的小红书运营数据
```

Cursor 会自动调用 `xhs_get_overall_data` 工具。

### 示例 3: 分析笔记数据

```
分析我的笔记数据，给我一些建议
```

Cursor 会调用相关工具获取数据并进行分析。

## 故障排查

### 问题 1: MCP 服务器未连接

**症状**: Cursor 中无法使用工具

**解决**:
1. 检查配置文件路径是否正确
2. 确保已构建项目：`npm run build`
3. 检查 `dist/index.js` 是否存在
4. 查看 Cursor 开发者工具中的错误信息

### 问题 2: 路径错误

**症状**: 配置后 Cursor 报路径错误

**解决**:
- Windows 用户使用绝对路径，例如：
  ```
  F:\gitProject\xhs-mcp\dist\index.js
  ```
  或
  ```
  F:/gitProject/xhs-mcp/dist/index.js
  ```
- macOS/Linux 用户使用绝对路径，例如：
  ```
  /Users/yourname/projects/xhs-mcp/dist/index.js
  ```

### 问题 3: 工具调用失败

**症状**: 工具调用时返回错误

**解决**:
1. 确保已登录：`npm run xhs check-login`
2. 如果未登录，先在终端运行：`npm run xhs login`
3. 检查 Cursor 控制台的错误信息

### 问题 4: Node.js 路径问题

**症状**: 找不到 node 命令

**解决**:
- 使用 node 的完整路径，例如：
  ```json
  {
    "mcpServers": {
      "xhs-mcp": {
        "command": "C:\\Program Files\\nodejs\\node.exe",
        "args": ["F:\\gitProject\\xhs-mcp\\dist\\index.js"]
      }
    }
  }
  ```

## 开发模式配置

如果你在开发过程中需要热重载，可以配置使用 tsx：

```json
{
  "mcpServers": {
    "xhs-mcp": {
      "command": "npx",
      "args": ["tsx", "F:\\gitProject\\xhs-mcp\\src\\index.ts"]
    }
  }
}
```

**注意**: 开发模式需要安装 `tsx`，并且路径指向 `src/index.ts` 而不是 `dist/index.js`。

## 为什么需要绝对路径？

MCP 服务器使用标准输入输出（stdio）与 Cursor 通信，因此 Cursor 需要知道如何启动服务器。配置文件中需要指定：
- `command`: 启动命令（通常是 `node`）
- `args`: 启动参数（必须是 `dist/index.js` 的绝对路径）

一键配置脚本 `npm run xhs setup-cursor` 会自动处理这些细节，你不需要手动查找路径。

## 快速配置脚本（Windows PowerShell）

如果你更喜欢手动配置，可以使用以下 PowerShell 脚本：

```powershell
# 获取项目路径
$projectPath = (Get-Location).Path
$configPath = "$env:APPDATA\Cursor\User\globalStorage\cursor.mcp"

# 创建配置目录
New-Item -ItemType Directory -Force -Path $configPath

# 创建配置文件
$config = @{
    mcpServers = @{
        "xhs-mcp" = @{
            command = "node"
            args = @("$projectPath\dist\index.js")
        }
    }
} | ConvertTo-Json -Depth 10

$config | Out-File -FilePath "$configPath\mcp.json" -Encoding UTF8

Write-Host "配置已创建: $configPath\mcp.json"
Write-Host "请重启 Cursor 使配置生效"
```

**推荐使用 `npm run xhs setup-cursor` 而不是手动配置。**

## 下一步

- 查看 [GUIDEFORMCP.md](./GUIDEFORMCP.md) 了解 Claude Desktop 配置
- 查看 [TEST_MCP.md](./TEST_MCP.md) 了解测试方法
- 查看 [README.md](./README.md) 了解项目概述

