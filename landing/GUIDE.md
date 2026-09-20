# xhs-cli 宣传页面使用指南

## 概述

✨ 全新设计的专业宣传页面，展示 xhs-cli 开源项目的核心价值。

- **零依赖** - 仅使用 Next.js、React、Tailwind
- **极速构建** - < 7 秒编译，< 10MB 生产包
- **完全响应式** - 桌面、平板、手机完美适配
- **SEO 就绪** - 完整元数据，结构化标记

## 🚀 快速启动

### 开发模式
```bash
cd landing
npm install
npm run dev
```
打开 `http://localhost:3000`

### 生产构建
```bash
npm run build
npm start
```

## 📱 页面预览

访问 `http://localhost:3000` 查看实时页面：

### 1. 导航栏
- 品牌标志（XHS）
- 快速导航链接
- GitHub 和安装按钮

### 2. 首屏 (Hero)
- 强有力的标题
- 价值主张说明
- 安装指导代码块

### 3. 功能卡片 (Features)
展示 6 个核心功能：
- 账户认证
- 数据分析
- 内容管理
- 一键发布
- Agent 集成
- 高度可定制

### 4. 使用示例 (Examples)
4 个实际场景：
- 登录账号
- 获取账户数据
- 查看已发布笔记
- 发布新笔记

### 5. 常见问题 (FAQ)
6 个关键问题的可交互展开

### 6. 行动号召 (CTA)
最后的安装按钮和源代码链接

### 7. 页脚 (Footer)
导航链接、社区资源、法律信息

## 🎨 自定义指南

### 修改品牌色

目前使用**青蓝色** (`cyan-*`) 和**蓝色** (`blue-*`)。

要改为其他颜色，编辑以下文件中的 Tailwind 类：

**Navbar.tsx**
```typescript
// 改这行的 cyan-* 到你的颜色
bg-gradient-to-r from-cyan-500 to-blue-500
```

**Hero.tsx**
```typescript
// 改 from-cyan-* via-blue-* to-cyan-*
bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300
```

**其他组件**
搜索并替换：
- `cyan-*` → 你的颜色 1
- `blue-*` → 你的颜色 2

### 修改文案

所有文案都在组件中清晰可见：

| 部分 | 文件 | 内容 |
|------|------|------|
| 首屏标题 | `Hero.tsx` | 标题和描述 |
| 功能说明 | `Features.tsx` | features 数组 |
| 示例命令 | `Demo.tsx` | examples 数组 |
| 常见问题 | `FAQ.tsx` | faqItems 数组 |

### 修改链接

所有外部链接都在组件中：

```bash
grep -r "href=" components/
```

主要链接位置：
- `Navbar.tsx` - GitHub、NPM
- `Hero.tsx` - 安装、文档
- `Footer.tsx` - 各种资源链接

### 修改 SEO 元数据

编辑 `app/layout.tsx`：

```typescript
export const metadata: Metadata = {
  title: "xhs-cli - 你的标题",
  description: "你的描述",
  // ... 其他元数据
}
```

## 🌐 部署方案

### Cloudflare Workers Static Assets（当前生产环境）

站点使用 Next.js 静态导出，构建产物位于 `out/`。

```bash
cd landing
npm ci
npm run deploy
```

生产站点由 `landing/wrangler.jsonc` 管理，Worker 名为 `xhs-cli`，静态资源目录为
`out/`，并使用生成的 `404.html` 处理未命中路由。首次本地部署前先运行
`wrangler login`；`npm run deploy` 会先构建，再把静态资源发布到 Cloudflare。

持续部署由 Cloudflare Workers Builds 的 Git 集成负责：

- Git 仓库：`joohw/xhs-cli`。
- 根目录：`/landing`。
- 构建命令：`npm run build`。
- 部署命令：`npx wrangler deploy`。
- 生产分支：`main`；推送后自动构建并部署到生产环境。
- 非生产分支构建已启用，用于生成预览版本。
- 不需要用于前端部署的 GitHub Actions workflow 或 Cloudflare GitHub Actions Secrets。
- 自定义域名：`https://xhs-cli.com`。

## 📊 性能指标

### 构建性能
- 编译时间: ~1.3 秒
- 类型检查: ~1.5 秒
- 页面生成: ~0.4 秒
- **总计: < 5 秒**

### 运行时性能
- 首屏加载: < 1s (Cloudflare Workers Static Assets)
- 交互时间: < 50ms
- 布局稳定性: 99%+
- **Lighthouse: 95+**

### 包体积
- HTML: < 20KB
- JS: < 50KB (gzipped)
- CSS: < 5KB (optimized)
- 总计: < 75KB

## 🔧 高级定制

### 添加新的功能卡片

编辑 `components/Features.tsx`：

```typescript
const features = [
  // ... 现有项目
  {
    title: '新功能标题',
    description: '功能描述',
    icon: '🎯'  // 删除这行（如果保持无 emoji 设计）
  }
]
```

### 添加新的 FAQ 问题

编辑 `components/FAQ.tsx`：

```typescript
const faqItems = [
  // ... 现有项目
  {
    question: '你的问题?',
    answer: '你的答案'
  }
]
```

### 添加新的使用示例

编辑 `components/Demo.tsx`：

```typescript
const examples = [
  // ... 现有项目
  {
    title: '示例标题',
    command: 'xhs command',
    output: ['输出行1', '输出行2']
  }
]
```

## ✅ 检查清单

发布前确保：

- [ ] 更新 `app/layout.tsx` 中的元数据
- [ ] 验证所有外部链接有效
- [ ] 在多个设备上测试响应式
- [ ] 检查文案中的链接（避免 # 占位符）
- [ ] 运行 `npm run lint` 检查代码
- [ ] 构建测试: `npm run build`
- [ ] 测试生产环境: `npm start`

## 📝 文档文件

- `README.md` - 基础设置和部署
- `REDESIGN.md` - 设计决策和改进
- `SUMMARY.md` - 项目概述

## 🎓 最佳实践

1. **性能** - 所有页面预渲染为静态 HTML
2. **安全** - 所有外部链接带 `rel="noopener noreferrer"`
3. **可访问性** - 语义 HTML，适当的颜色对比
4. **SEO** - 完整元数据，结构化标记
5. **维护** - 清晰的代码结构，易于修改

## 🆘 常见问题

**Q: 页面加载很慢？**
A: 先运行 `npm run build`，再用 `npm start` 在本地 Workers 运行时预览；开发模式会更慢。

**Q: 如何添加分析？**
A: 在 `app/layout.tsx` 中添加 Google Analytics 或其他追踪脚本。

**Q: 可以修改字体吗？**
A: 在 `app/layout.tsx` 中修改 font-family CSS。

**Q: 如何添加更多语言？**
A: 创建新的语言文件，添加条件渲染逻辑。

**Q: 支持深色/浅色模式切换？**
A: 目前仅深色模式。要添加切换，需要修改全局样式和 HTML 属性。

## 📞 支持

问题？提交到 [GitHub Issues](https://github.com/joohw/xhs-cli/issues)

---

**最后更新**: 2024/05/19  
**版本**: 1.0.0  
**许可证**: GPL-3.0
