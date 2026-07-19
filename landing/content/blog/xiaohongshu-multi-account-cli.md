---
title: 小红书多账号 CLI 管理：会话隔离与临时切换
description: 使用 xhs-cli 创建、切换和检查多个小红书账号，理解 currentAccount、browser-data 目录与 --account 参数的区别。
date: 2026-07-19
updated: 2026-07-19
---

代运营团队或同时维护多个品牌账号时，最容易出错的地方不是命令本身，而是“当前浏览器到底登录了谁”。xhs-cli 用账号 registry 和独立浏览器目录隔离会话，业务命令不会在未指定账号时自行猜测。

## 添加账号

账号标识只用于本地管理，允许字母、数字、点、下划线和连字符：

```bash
xhs account add brand-a
xhs account add brand-b
```

第一个账号会自动成为当前账号。账号信息写入：

```text
~/.xhs-cli/.cache/accounts/registry.json
```

每个账号的 Chrome 会话位于：

```text
~/.xhs-cli/.cache/accounts/<slug>/browser-data
```

不要把这个目录上传到代码仓库或发送给其他人，其中可能包含可用的登录状态。

## 查看与切换当前账号

```bash
xhs account list
xhs account current
xhs account show brand-a
xhs account use brand-b
```

`account list` 会用 `*` 标出当前账号。运行 `account use` 会修改 registry 中的 `currentAccount`，后续未传 `--account` 的业务命令都会使用它。

例如：

```bash
xhs account use brand-a
xhs metrics
xhs recent --limit 10
```

这两条业务命令都使用 `brand-a`。

## 只临时操作另一个账号

不想改变当前账号时，在业务命令中传入：

```bash
xhs metrics --account brand-b
xhs recent --limit 10 --account brand-b
xhs post --account brand-b --title "标题" --content "正文至少十个字" --image ./cover.png
```

`--account` 只影响当前命令。下一条未指定账号的命令仍使用 registry 中的 `currentAccount`。

## 为什么不自动选择唯一账号

即使 registry 里只有一个账号，业务命令也只使用明确设置的当前账号。没有 `currentAccount` 时，`resolveSession()` 会报错并提示先运行：

```bash
xhs account use <slug>
```

这个限制可以防止脚本在 registry 状态异常时操作错误账号。自动化任务开始前，建议显式执行 `account current`，或者始终传入 `--account`。

## 多账号运行检查表

1. 用 `xhs account list` 确认账号存在。
2. 用 `xhs account current` 或 `--account` 明确目标账号。
3. 首次使用该账号时运行 `xhs login --account <slug>`。
4. 发帖前在浏览器页面再次确认账号头像与名称。
5. 备份业务内容，不要复制整个 browser-data 目录作为协作方式。

继续阅读 [图文发布工作流](/blog/xhs-content-publishing-workflow) 和 [安全与数据说明](/security)。
