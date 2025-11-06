# 检查 npm 包名占用

## 方法一：使用 npm search（推荐）

```bash
npm search xhs-mcp
```

如果包名被占用，会显示包的信息；如果没被占用，会显示 "No matches found"。

## 方法二：使用 npm view（最直接）

```bash
npm view xhs-mcp
```

- **如果包存在**：会显示包的详细信息（版本、描述等）
- **如果包不存在**：会显示错误 `404 'xhs-mcp' is not in the npm registry`

## 方法三：直接在 npm 网站查看

访问：
```
https://www.npmjs.com/package/xhs-mcp
```

如果页面显示 404 或 "This package is not found"，说明包名可用。

## 方法四：使用 npm 命令行检查

```bash
# 检查包是否存在
npm info xhs-mcp 2>&1 | grep -q "404" && echo "包名可用" || echo "包名已被占用"
```

## 方法五：使用 npx 检查（如果包存在会尝试安装）

```bash
npx xhs-mcp --version 2>&1 | grep -q "404" && echo "可用" || echo "已占用"
```

## 实际检查示例

让我帮你检查一下 `xhs-mcp` 是否可用：

```bash
# 最简单的方法
npm view xhs-mcp
```

## 如果包名被占用怎么办？

### 选项 1：使用 scoped package（推荐）

```json
{
  "name": "@your-username/xhs-mcp"
}
```

优点：
- 更安全，不会冲突
- 表明所有权
- 可以发布私有包

### 选项 2：使用不同的包名

建议的替代名称：
- `xhs-mcp-creator`
- `xiaohongshu-mcp-server`
- `xhs-mcp-toolkit`
- `xhs-cli-mcp`
- `xiaohongshu-cli`

### 选项 3：联系包所有者

如果包名被占用但包已废弃，可以联系 npm 支持：
https://www.npmjs.com/support

## 快速检查脚本

创建一个检查脚本 `check-package-name.sh`：

```bash
#!/bin/bash
PACKAGE_NAME=$1

if [ -z "$PACKAGE_NAME" ]; then
    echo "用法: ./check-package-name.sh <包名>"
    exit 1
fi

echo "检查包名: $PACKAGE_NAME"
npm view "$PACKAGE_NAME" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "❌ 包名已被占用"
    npm view "$PACKAGE_NAME" | head -5
else
    echo "✅ 包名可用"
fi
```

使用方法：
```bash
chmod +x check-package-name.sh
./check-package-name.sh xhs-mcp
```

