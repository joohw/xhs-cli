import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { getAllBlogPosts } from '@/lib/blog'
import { SITE_URL, SOCIAL_IMAGE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: '小红书运营自动化教程',
  description: 'xhs-cli 教程：小红书多账号会话、运营数据查询、图文发帖工作流与外部 Agent 集成实践。',
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/blog`,
    title: '小红书运营自动化教程 | xhs-cli',
    description: 'xhs-cli 教程：小红书多账号会话、运营数据查询、图文发帖工作流与外部 Agent 集成实践。',
    locale: 'zh_CN',
    images: [
      {
        url: SOCIAL_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'xhs-cli 小红书运营命令行工具',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '小红书运营自动化教程 | xhs-cli',
    description: 'xhs-cli 教程：小红书多账号会话、运营数据查询、图文发帖工作流与外部 Agent 集成实践。',
    images: [SOCIAL_IMAGE_URL],
  },
}

export default function BlogIndexPage() {
  const posts = getAllBlogPosts()

  return (
    <div className="bg-slate-950 min-h-screen">
      <Navbar />
      <main className="px-6 pt-28 pb-16">
        <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-3">小红书运营自动化教程</h1>
        <p className="text-slate-400 mb-10">从安装登录到数据查询、图文发帖和外部 Agent 集成，所有示例均与当前 CLI 命令保持一致。</p>

        {posts.length === 0 ? (
          <p className="text-slate-300">暂无文章。</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="block rounded-lg border border-slate-800 p-5 transition-colors hover:border-slate-700"
                >
                  {post.date ? <time dateTime={post.date} className="text-xs text-slate-300">{post.date}</time> : null}
                  <h2 className="mt-2 text-xl font-semibold text-white">{post.title}</h2>
                  {post.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{post.description}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
