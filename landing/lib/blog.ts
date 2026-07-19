import fs from 'node:fs'
import path from 'node:path'
import { BLOG_POSTS, blogBySlug, blogPathname, type BlogPost, type BlogPostMeta } from '@/lib/blog-data'
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  SITE_NAME,
  SITE_URL,
  SOCIAL_IMAGE_URL,
} from '@/lib/site'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    return { meta: {}, body: raw.trim() }
  }

  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) meta[key] = value
  }

  return { meta, body: match[2].trim() }
}

function readPostFile(slug: string): BlogPost | null {
  const filename = `${slug}.md`
  const filePath = path.join(BLOG_DIR, filename)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  const title = meta.title?.trim()
  if (!title) {
    throw new Error(`Blog post "${filename}" is missing required frontmatter field: title`)
  }

  const date = meta.date?.trim() ?? ''
  const updated = meta.updated?.trim() ?? date
  const lastModified = updated ? new Date(`${updated}T00:00:00+08:00`) : new Date(0)

  return {
    slug,
    title,
    description: meta.description?.trim() ?? '',
    date,
    updated,
    lastModified,
    body,
  }
}

export function getBlogPost(slug: string): BlogPost | null {
  if (!blogBySlug(slug)) return null
  return readPostFile(slug)
}

export function getAllBlogPosts(): BlogPostMeta[] {
  return BLOG_POSTS.map((def) => readPostFile(def.slug))
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    .map(({ slug, title, description, date, updated, lastModified }) => ({
      slug,
      title,
      description,
      date,
      updated,
      lastModified,
    }))
}

export function buildBlogPostingJsonLd(slug: string): Record<string, unknown> {
  const post = getBlogPost(slug)
  if (!post) return {}

  const pageUrl = `${SITE_URL}${blogPathname(slug)}`

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${pageUrl}#article`,
    headline: post.title,
    description: post.description || post.title,
    image: [SOCIAL_IMAGE_URL],
    datePublished: post.date || undefined,
    dateModified: post.updated || post.date || undefined,
    inLanguage: 'zh-CN',
    url: pageUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    author: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` },
    },
  }
}

export { BLOG_POSTS, blogBySlug } from '@/lib/blog-data'
