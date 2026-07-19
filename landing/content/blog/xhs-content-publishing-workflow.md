---
title: 用 xhs-cli 建立小红书图文发布工作流
description: 从素材准备、账号确认、命令填表到人工发布检查，完整说明 xhs-cli 当前版本支持的图文发布流程与参数。
date: 2026-05-22
updated: 2026-07-19
---

稳定的发布流程不只是“把内容发出去”。运营人员还需要确认账号、图片顺序、标题长度、正文内容和平台校验结果。xhs-cli 把可重复的填表步骤交给命令行，同时把最终检查留给人。

## 1. 整理本地素材

建议每篇笔记使用独立目录：

```text
campaign-0720/
├── content.txt
├── 01-cover.png
├── 02-detail.png
└── 03-result.png
```

文件名中的序号可以明确图片顺序。正文较长时使用 `--content-file`，避免 shell 引号和换行处理出错。

## 2. 确认当前账号

查看账号列表和当前账号：

```bash
xhs account list
xhs account current
```

如果当前账号不是本次要操作的账号，可以切换 registry：

```bash
xhs account use brand-a
```

也可以只对本次命令使用 `--account brand-a`，不会改变全局当前账号。

## 3. 检查登录状态

执行：

```bash
xhs login
```

工具会使用当前账号的独立浏览器目录。已经存在有效登录态时可以继续使用；登录失效时，需要在打开的浏览器中重新完成登录。

## 4. 填写图文笔记

使用正文文件和多张图片：

```bash
xhs post \
  --title "小红书运营周报怎么整理" \
  --content-file ./campaign-0720/content.txt \
  --image ./campaign-0720/01-cover.png \
  --image ./campaign-0720/02-detail.png \
  --image ./campaign-0720/03-result.png
```

当前参数规则：

- `--title` 必填
- `--content` 与 `--content-file` 二选一
- `--image` 至少 1 张，最多 18 张
- 图片必须是本机存在的文件路径
- 默认只填表，不自动点击发布

标题、正文或图片不满足平台要求时，浏览器页面可能继续显示校验提示。发布前要在页面中确认这些状态。

## 5. 何时使用 --publish

如果流程已经经过人工审核，可以显式传入：

```bash
xhs post \
  --title "标题" \
  --content-file ./content.txt \
  --image ./cover.png \
  --publish
```

该参数表示工具会尝试点击页面中的发布按钮，不代表平台一定接收成功。账号风控、页面改版、网络错误和内容校验都可能阻止发布。命令执行后仍应核对创作者后台。

## 6. 记录结果

本地发布记录可以通过以下命令查看：

```bash
xhs posted
```

创作者后台最近笔记可用：

```bash
xhs recent --limit 20
```

两者含义不同。`posted` 读取本地归档，`recent` 读取创作者后台。排查“命令执行过但后台没看到”时，应同时检查这两个来源和浏览器页面状态。

## 与内容生成 Agent 配合

Agent 可以负责生成标题草案、正文和素材清单，但发布前仍需检查事实、品牌表达、敏感内容和平台规范。xhs-cli 本身不负责选题、文案质量或合规判断。

如果 Agent 宿主使用 Node.js，优先直接调用 `implPost` 并传入解析后的会话和参数。这样比让 Agent 拼接含引号和路径的 shell 命令更可靠。

相关阅读：

- [xhs-cli 入门](/blog/xhs-cli-automation-intro)
- [多账号会话管理](/blog/xiaohongshu-multi-account-cli)
- [常见错误排查](/blog/xhs-cli-troubleshooting)
