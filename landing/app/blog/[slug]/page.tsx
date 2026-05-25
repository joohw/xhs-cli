import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { getAllBlogPosts, getBlogPost } from '@/lib/blog'
import { SITE_URL } from '@/lib/site'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return {}

  const url = `${SITE_URL}/blog/${post.slug}`

  return {
    title: post.title,
    description: post.description || undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description || undefined,
      locale: 'zh_CN',
      publishedTime: post.date || undefined,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <div className="bg-slate-950 min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← 返回博客
        </Link>
        <article className="mt-6">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-3">{post.title}</h1>
            {post.date ? <time className="text-slate-500 text-sm">{post.date}</time> : null}
          </header>
          <div className="text-slate-300 leading-7 whitespace-pre-wrap">{post.body}</div>
        </article>
      </main>
      <Footer />
    </div>
  )
}
