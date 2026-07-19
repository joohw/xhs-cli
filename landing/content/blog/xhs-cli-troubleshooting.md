---
title: xhs-cli 常见错误排查：账号、登录、图片与发布状态
description: 按错误类型排查 xhs-cli 的当前账号、浏览器登录、内容参数、图片路径和发布结果问题。
date: 2026-07-19
updated: 2026-07-19
---

使用 xhs-cli 时，大部分错误来自账号上下文、浏览器登录态或发帖参数。先保留终端错误信息，再按下面的顺序检查。

## 提示没有当前账号

先查看 registry：

```bash
xhs account list
xhs account current
```

已有账号但没有当前账号时：

```bash
xhs account use <slug>
```

业务命令不会自动选择唯一账号。临时操作也可以直接传入 `--account <slug>`。

## 登录页面反复出现

每个账号使用独立的 `browser-data` 目录。确认命令使用的 slug 与预期一致：

```bash
xhs account current
xhs login --account <slug>
```

如果平台要求重新验证，应在打开的浏览器中完成。不要通过复制 Cookie 文本解决问题，也不要把整个缓存目录发送给他人。

## post 提示缺少正文

发帖需要 `--content` 或 `--content-file`：

```bash
xhs post --title "标题" --content "正文至少十个字" --image ./cover.png
```

使用文件时先确认路径存在：

```bash
xhs post --title "标题" --content-file ./content.txt --image ./cover.png
```

两个参数同时出现时，应避免依赖覆盖顺序，团队脚本最好固定只使用其中一种。

## 图片上传失败

检查以下项目：

- 至少传入一个 `--image`
- 每个路径都指向本机实际文件
- 图片数量不超过 18
- 运行命令的用户有读取权限
- 相对路径基于当前工作目录，而不是内容文件所在目录

多图时重复参数：

```bash
xhs post --title "标题" --content-file ./content.txt \
  --image ./01-cover.png \
  --image ./02-detail.png
```

## 命令结束但没看到公开笔记

默认 `xhs post` 只填表，不点击发布。浏览器窗口会保留，等待人工确认。

添加 `--publish` 后，工具也只是尝试点击页面中的发布按钮。平台校验、账号状态、风控或页面结构变化都可能使发布失败。检查顺序：

1. 查看浏览器页面提示。
2. 查看 `xhs posted` 本地记录。
3. 查看 `xhs recent --limit 20` 后台笔记。
4. 取得 note ID 后运行 `xhs detail <noteId>`。

## 页面改版导致元素找不到

xhs-cli 通过本机浏览器操作创作者后台。小红书页面改版后，选择器可能需要更新。请记录：

- xhs-cli 版本
- 操作系统与 Chrome 版本
- 使用的子命令和完整错误
- 页面截图，但要遮盖账号和敏感数据

然后在 [GitHub Issues](https://github.com/joohw/xhs-cli/issues) 检查是否已有相同问题，再提交可复现信息。
