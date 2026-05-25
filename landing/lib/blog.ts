import fs from 'node:fs'
import path from 'node:path'

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  date: string
  lastModified: Date
}

export type BlogPost = BlogPostMeta & {
  body: string
}

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

function readPostFile(filename: string): BlogPost | null {
  if (!filename.endsWith('.md')) return null

  const slug = filename.slice(0, -3)
  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  const title = meta.title?.trim()
  if (!title) {
    throw new Error(`Blog post "${filename}" is missing required frontmatter field: title`)
  }

  const date = meta.date?.trim() ?? ''
  const lastModified = date ? new Date(`${date}T00:00:00+08:00`) : new Date()

  return {
    slug,
    title,
    description: meta.description?.trim() ?? '',
    date,
    lastModified,
    body,
  }
}

export function getAllBlogPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  return fs
    .readdirSync(BLOG_DIR)
    .map(readPostFile)
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    .map(({ slug, title, description, date, lastModified }) => ({
      slug,
      title,
      description,
      date,
      lastModified,
    }))
}

export function getBlogPost(slug: string): BlogPost | null {
  const filename = `${slug}.md`
  const filePath = path.join(BLOG_DIR, filename)
  if (!fs.existsSync(filePath)) return null
  return readPostFile(filename)
}
