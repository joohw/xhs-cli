#  XHS-MCP / XHS-MHP-CREATOR


面向个人创作者的小红书MCP

众所周知，运营自媒体是一件非常耗精力的事，此项目面向缺乏运营精力的个人创作者，提供一套运营小红书的解决方案。



## 核心功能

管理您所有已发布的笔记列表，作为上下文随时待命。

定义您发布帖子的风格、个人设定。对于创作者，特别是独立开发者，可以设置你正在做的Project。

一键呈送符合您过往风格的候选帖子，只要您想，也可以随时发布。

分析你的账号数据，提供专业的洞察意见。



## 有什么亮点

有的，兄弟有的。

1.基于ts开发（这是我和AI都最喜欢的编程语言）

2.基于node环境（是的，只有node作为依赖）

3.使用缓存机制存储数据，保护您的账号的访问频率。绝不访问无关的数据。

4.面向创作者（独立开发者、个人设计师、产品设计师）

5.最后，优雅、极客



## 功能特性

获取您的账号信息和运营情况

获取您最近的笔记详情（或者所有的）

定义创作者人设




## 快速开始

还没写完，这里先留空





### MCP 配置

如果你有 MCP 使用经验，可以配置 MCP 客户端来使用：

[查看 MCP 使用指南](./GUIDEFORMCP.md)




### CLI 使用方式

除了MCP外，项目提供了完整的 CLI 工具。

从现在开始，你可以通过命令行操作小红书了。



#### 前置要求

1. 确保已安装 Node.js (v18+)
2. 克隆项目：`git clone <项目地址>`
3. 安装依赖：`npm install`
4. 构建项目：`npm run build`



#### 可用命令

```bash
# 登录小红书账号（会打开浏览器进行登录）
npm run xhs login

# 检查登录状态
npm run xhs check-login

# 获取近期笔记运营数据
npm run xhs get-overall-data

# 获取近期笔记统计数据
npm run xhs get-note-statistics

# 更新详细统计数据（从数据统计分析页面）
npm run xhs update-detailed-statistics

# 根据笔记ID获取笔记详情
npm run xhs get-note-detail-by-id <noteId>

# 批量获取所有笔记的详情
npm run xhs get-all-notes-detail

# 读取发帖指导原则
npm run xhs read-posting-guidelines
```

#### 查看帮助

运行 `npm run xhs` 不带参数，会显示所有可用命令的详细说明。




## 开发计划

- [x] 登录CLI
- [x] 读取账号详情与笔记数据CLI
- [x] 账号设定与账号分析CLI
- [ ] 接入 MCP 协议并测试
- [ ] 笔记发布
- [ ] 笔记创作
- [ ] 全自动创作与接口扩展


## 许可证

MIT
