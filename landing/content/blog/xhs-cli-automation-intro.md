---
title: xhs-cli 是什么？小红书运营自动化入门
description: 面向小红书创作者与运营团队的开源 CLI，自动化内容发布、数据抓取与重复操作，支持 AI Agent 集成。
date: 2026-05-20
---

小红书运营里大量工作是重复的：登录创作者中心、上传图文、填写标题标签、查看数据、回复评论。网页端适合偶尔操作，**不适合规模化与 Agent 协作**。

## xhs-cli 解决什么

xhs-cli 是小红书运营自动化的开源命令行工具：

- 封装创作者平台常见操作
- 支持脚本化批量任务
- 可与 AI Agent 配合，让 agent 代运营执行重复步骤
- 开源可审计，本地运行

## 典型场景

| 场景 | 价值 |
| --- | --- |
| 批量发布 / 定时发布 | 减少手工上传 |
| 数据导出与分析 | 配合内部报表 |
| Agent 工作流 | 文案生成 + CLI 发布 |

## 安装

```bash
npm install -g xhs-cli
```

首次使用需完成小红书账号登录（CLI 会引导浏览器登录）。

## 下一步

- 阅读 [内容发布工作流](/blog/xhs-content-publishing-workflow)
- 查看 [GitHub 文档](https://github.com/joohw/xhs-cli#readme)
- 首页 [功能介绍](/#features)
