---
title: 用 CLI 查询小红书创作者指标与笔记数据
description: 说明 xhs metrics、recent、detail 与 posted 的用途、账号参数和数据来源，帮助运营人员建立可重复的数据检查流程。
date: 2026-07-19
updated: 2026-07-19
---

xhs-cli 提供四类数据命令：运营指标、最近笔记、单篇笔记详情和本地发布归档。它们的数据来源不同，适合解决的问题也不同。

## 运营指标：metrics

```bash
xhs metrics
```

该命令使用当前账号的浏览器会话读取创作者后台运营数据。临时查询另一个账号时：

```bash
xhs metrics --account brand-b
```

输出适合做当天检查或交给其他脚本解析。xhs-cli 不提供数据库和长期趋势图；需要周报或月报时，应由外部任务定期执行并保存结果。

## 最近笔记：recent

```bash
xhs recent --limit 20
```

`--limit` 必须是正整数。该命令读取创作者后台已发笔记列表，可用于快速检查近期内容和获取 note ID。

如果只想看少量结果：

```bash
xhs recent --limit 5 --account brand-a
```

## 单篇详情：detail

从最近笔记或其他可信来源取得 note ID 后：

```bash
xhs detail <noteId>
```

也可以显式指定账号：

```bash
xhs detail <noteId> --account brand-a
```

note ID 是位置参数，不能用标题代替。查询失败时先确认 ID、目标账号登录态和创作者后台是否仍能看到该笔记。

## 本地归档：posted

```bash
xhs posted
```

`posted` 读取 `~/.xhs-cli/.cache/published/` 下的本地记录。它不是创作者后台的完整笔记列表，也不能证明一篇笔记已经成功公开。

排查发帖结果时，可以按顺序检查：

1. 浏览器页面是否显示成功或校验错误。
2. `xhs posted` 是否有本地记录。
3. `xhs recent` 是否出现对应笔记。
4. 必要时用 `xhs detail <noteId>` 查看详情。

## 建立每日数据检查

一个简单流程可以包含：

```bash
xhs account current
xhs metrics
xhs recent --limit 20
```

如果由脚本执行，建议把账号 slug 写入任务配置并通过 `--account` 显式传入。这样不会因为团队成员切换了当前账号而读取错误数据。

浏览器页面和平台字段可能调整，采集结果应保留时间戳，并在关键报表中抽样核对后台原始值。遇到异常可查看 [常见错误排查](/blog/xhs-cli-troubleshooting)。
