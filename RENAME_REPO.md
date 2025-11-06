# 重命名 GitHub 仓库为 xhs-cli

## 步骤

### 1. 在 GitHub 上重命名仓库

1. 访问你的仓库：https://github.com/joohw/xhs-mcp
2. 点击 **Settings**（设置）
3. 滚动到页面底部，找到 **Danger Zone**（危险区域）
4. 点击 **Rename repository**（重命名仓库）
5. 输入新名称：`xhs-cli`
6. 点击 **I understand, rename my repository**（我理解，重命名我的仓库）

### 2. 更新本地 Git 远程地址

重命名后，GitHub 会自动重定向，但最好更新本地配置：

```bash
# 更新远程仓库地址
git remote set-url origin https://github.com/joohw/xhs-cli.git

# 验证
git remote -v
```

### 3. 更新 package.json（我会帮你完成）

repository URL 需要更新为新的仓库名。

### 4. 推送更改

```bash
git add package.json
git commit -m "chore: update repository name to xhs-cli"
git push
```

## 注意事项

- GitHub 会自动处理旧 URL 的重定向（通常永久）
- 如果有其他项目或文档引用了旧仓库，需要更新
- CI/CD 配置（如果有）也需要更新

