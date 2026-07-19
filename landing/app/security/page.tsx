import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { SITE_URL, SOCIAL_IMAGE_URL } from '@/lib/site'

const pageUrl = `${SITE_URL}/security`

export const metadata: Metadata = {
  title: '安全与本地数据说明',
  description: '了解 xhs-cli 的本地缓存、账号浏览器会话、发帖确认边界，以及多账号环境中的数据保护建议。',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'article',
    url: pageUrl,
    title: 'xhs-cli 安全与本地数据说明',
    description: '账号会话、缓存目录、发布确认和 Agent 集成的安全边界。',
    locale: 'zh_CN',
    images: [
      {
        url: SOCIAL_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'xhs-cli 安全与本地数据说明',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'xhs-cli 安全与本地数据说明',
    description: '账号会话、缓存目录、发布确认和 Agent 集成的安全边界。',
    images: [SOCIAL_IMAGE_URL],
  },
}

export default function SecurityPage() {
  return (
    <div className="bg-slate-950 min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-bold text-white mb-4">安全与本地数据说明</h1>
        <p className="text-slate-300 leading-relaxed mb-10">
          xhs-cli 在用户自己的电脑上运行，通过本机 Chrome 或 Chromium 访问小红书创作者后台。项目不提供用于中转账号数据的 xhs-cli 云服务。
        </p>

        <div className="blog-prose">
          <h2>本地目录</h2>
          <p>应用根目录为 <code>~/.xhs-cli</code>，业务生成的数据位于 <code>~/.xhs-cli/.cache/</code>。</p>
          <ul>
            <li><code>accounts/registry.json</code>：账号 registry 和当前账号标识。</li>
            <li><code>accounts/&lt;slug&gt;/browser-data</code>：每个账号独立的浏览器会话。</li>
            <li><code>published/</code>：可选的本地发布归档。</li>
          </ul>

          <h2>需要保护的内容</h2>
          <p>
            browser-data 可能包含仍可使用的登录状态。不要将 <code>~/.xhs-cli</code> 加入 Git 仓库、网盘共享目录或工单附件，也不要把该目录复制给 Agent 作为分析材料。
          </p>
          <p>团队共用设备时，应使用独立的系统账号和最小文件权限。离职、设备丢失或账号风险发生后，应在小红书侧退出相关会话并重新登录。</p>

          <h2>发布确认边界</h2>
          <p>
            <code>xhs post</code> 默认只填写标题、正文和图片，随后保留浏览器窗口供用户检查。只有明确传入 <code>--publish</code> 时，工具才会尝试点击页面中的发布按钮。
          </p>
          <p>页面校验、平台风控和网络错误可能阻止发布。最终状态应以创作者后台为准，不能只依赖终端输出或本地归档。</p>

          <h2>外部 Agent 集成</h2>
          <p>
            xhs-cli 本身不内置 Agent 或 MCP 服务。宿主应用注册 <code>impl*</code> 工具时，应把读取命令与发帖命令分开授权，并让 <code>publish</code> 默认为 <code>false</code>。Agent 无需读取 Cookie 内容；会话型操作使用解析后的 <code>ResolvedSession</code>，发帖只传入目标账号的 browserUserDataDir。
          </p>

          <h2>问题报告</h2>
          <p>
            提交 Issue 前请删除截图、日志和路径中的账号信息。安全问题不应公开附带可复用的 Cookie、会话目录或其他凭据。
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/blog/xhs-cli-troubleshooting" className="text-rose-300 hover:text-rose-200">常见错误排查</Link>
          <a href="https://github.com/joohw/xhs-cli" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white">查看开源代码</a>
        </div>
      </main>
      <Footer />
    </div>
  )
}
