# 发布指南

本文档说明如何将 `xhs-mcp` 发布到 npm。

## 发布前准备

### 1. 完善 package.json

确保以下字段已正确填写：

- `author`: 你的名字和邮箱（如：`"Your Name <your.email@example.com>"`）
- `repository.url`: 你的 GitHub 仓库地址
- `bugs.url`: 你的 GitHub Issues 地址
- `homepage`: 项目主页地址

### 2. 检查包名可用性

在发布前，检查包名是否可用：

```bash
npm search xhs-mcp
```

如果包名已被占用，考虑使用：
- `@your-username/xhs-mcp`（scoped package）
- `xhs-mcp-creator`
- `xiaohongshu-mcp`

### 3. 创建 LICENSE 文件

如果还没有，创建一个 LICENSE 文件（MIT 许可证）：

```bash
# 可以从 https://choosealicense.com/licenses/mit/ 复制内容
```

### 4. 构建项目

确保项目可以正常构建：

```bash
npm run build
```

检查 `dist/` 目录是否包含所有必要的文件。

## 发布步骤

### 1. 登录 npm

```bash
npm login
```

如果没有 npm 账号，先注册：https://www.npmjs.com/signup

### 2. 检查发布内容

使用 `npm pack` 预览将要发布的内容：

```bash
npm pack --dry-run
```

这会显示将要包含的文件列表，确保没有意外包含敏感文件。

### 3. 发布测试版本（可选）

如果是第一次发布，建议先发布测试版本：

```bash
# 发布测试版本
npm publish --tag beta

# 或者使用版本号
npm version 1.0.0-beta.1
npm publish --tag beta
```

### 4. 正式发布

```bash
# 确保版本号正确
npm version patch  # 或 minor, major

# 发布到 npm
npm publish
```

### 5. 验证发布

发布后，验证包是否可用：

```bash
# 测试安装
npm install -g xhs-mcp

# 测试命令
xhs --version
```

## 版本管理

使用语义化版本（Semantic Versioning）：

- `major`: 不兼容的 API 变更
- `minor`: 向后兼容的功能新增
- `patch`: 向后兼容的问题修复

```bash
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0
npm version major  # 1.1.0 -> 2.0.0
```

## 发布后工作

1. **创建 Git Tag**

```bash
git tag v1.0.0
git push origin v1.0.0
```

2. **更新 GitHub Release**

在 GitHub 上创建 Release，添加更新说明。

3. **更新文档**

确保 README 中的安装说明和示例是最新的。

## 常见问题

### 包名冲突

如果包名已被占用：
- 使用 scoped package: `@your-username/xhs-mcp`
- 修改 `package.json` 中的 `name` 字段
- 重新发布

### 发布权限错误

确保你是包的所有者，或者有发布权限。

### 版本已存在

如果版本号已存在，需要更新版本号：

```bash
npm version patch
npm publish
```

## 注意事项

1. **不要发布敏感信息**：检查 `.npmignore` 和 `package.json` 中的 `files` 字段
2. **测试构建**：确保 `dist/` 目录包含所有必要文件
3. **文档完整**：确保 README 包含安装和使用说明
4. **依赖版本**：确保依赖版本范围合理，不要太严格也不要太宽松

