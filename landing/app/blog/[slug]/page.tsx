import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import StructuredData from '@/components/StructuredData'
import { blogBySlug, buildBlogPostingJsonLd, getAllBlogPosts, getBlogPost } from '@/lib/blog'
import { renderMarkdown } from '@/lib/markdown'
import { AUTHOR_NAME, AUTHOR_URL, SITE_URL, SOCIAL_IMAGE_URL } from '@/lib/site'

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
      modifiedTime: post.updated || post.date || undefined,
      authors: [AUTHOR_URL],
      images: [
        {
          url: SOCIAL_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: `${post.title} — xhs-cli`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description || undefined,
      images: [SOCIAL_IMAGE_URL],
    },
    authors: [{ name: AUTHOR_NAME, url: AUTHOR_URL }],
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  if (!blogBySlug(slug)) notFound()

  const post = getBlogPost(slug)
  if (!post) notFound()

  const html = await renderMarkdown(post.body)
  const jsonLd = buildBlogPostingJsonLd(slug)

  return (
    <div className="bg-slate-950 min-h-screen">
      <StructuredData data={jsonLd} />
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← 返回博客
        </Link>
        <article className="mt-6">
          <header className="mb-8 max-w-none">
            <h1 className="text-3xl font-bold text-white mb-3">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300 text-sm">
              <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                作者：{AUTHOR_NAME}
              </a>
              {post.date ? <time dateTime={post.date}>发布于 {post.date}</time> : null}
              {post.updated && post.updated !== post.date ? (
                <time dateTime={post.updated}>更新于 {post.updated}</time>
              ) : null}
            </div>
            {post.description ? (
              <p className="mt-4 text-base leading-relaxed text-slate-400">{post.description}</p>
            ) : null}
          </header>
          <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </main>
      <Footer />
    </div>
  )
}
