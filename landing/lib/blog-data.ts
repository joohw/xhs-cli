export type BlogPostDef = {
  slug: string
  priority: number
}

export const BLOG_POSTS: BlogPostDef[] = [
  { slug: 'xhs-cli-automation-intro', priority: 0.85 },
  { slug: 'xhs-content-publishing-workflow', priority: 0.82 },
  { slug: 'xiaohongshu-multi-account-cli', priority: 0.8 },
  { slug: 'xiaohongshu-creator-data-cli', priority: 0.78 },
  { slug: 'xhs-cli-agent-integration', priority: 0.78 },
  { slug: 'xhs-cli-troubleshooting', priority: 0.76 },
]

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  date: string
  updated: string
  lastModified: Date
}

export type BlogPost = BlogPostMeta & {
  body: string
}

export function blogBySlug(slug: string): BlogPostDef | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug)
}

export function blogPathname(slug: string): string {
  return `/blog/${slug}`
}
