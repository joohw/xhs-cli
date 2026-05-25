import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { getAllBlogPosts } from '@/lib/blog'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: '博客',
  description: 'xhs-cli 小红书运营自动化工具的使用教程、最佳实践与更新说明。',
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/blog`,
    title: '博客 | xhs-cli',
    description: 'xhs-cli 小红书运营自动化工具的使用教程、最佳实践与更新说明。',
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
        <p className="text-slate-400 mb-10">xhs-cli 教程、运营技巧与产品更新。</p>

        {posts.length === 0 ? (
          <p className="text-slate-500">暂无文章。</p>
        ) : (
          <ul className="space-y-6">
            {posts.map((post) => (
              <li key={post.slug} className="border border-slate-800 rounded-lg p-5 hover:border-slate-700 transition-colors">
                <Link href={`/blog/${post.slug}`} className="block">
                  <h2 className="text-xl font-semibold text-white mb-2">{post.title}</h2>
                  {post.description ? <p className="text-slate-400 text-sm mb-3">{post.description}</p> : null}
                  {post.date ? <time className="text-slate-500 text-xs">{post.date}</time> : null}
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
