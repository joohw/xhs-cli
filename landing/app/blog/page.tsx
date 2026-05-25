import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { getAllBlogPosts } from '@/lib/blog'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: '博客',
  description: 'xhs-cli 博客：小红书运营自动化、内容发布工作流与 Agent 集成实践。',
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/blog`,
    title: '博客 | xhs-cli',
    description: 'xhs-cli 博客：小红书运营自动化、内容发布工作流与 Agent 集成实践。',
    locale: 'zh_CN',
  },
}

export default function BlogIndexPage() {
  const posts = getAllBlogPosts()

  return (
    <div className="bg-slate-950 min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-3xl font-bold text-white mb-3">博客</h1>
        <p className="text-slate-400 mb-10">xhs-cli 教程、运营技巧与产品实践。</p>

        {posts.length === 0 ? (
          <p className="text-slate-500">暂无文章。</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="block rounded-lg border border-slate-800 p-5 transition-colors hover:border-slate-700"
                >
                  {post.date ? <time className="text-xs text-slate-500">{post.date}</time> : null}
                  <h2 className="mt-2 text-xl font-semibold text-white">{post.title}</h2>
                  {post.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{post.description}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  )
}
