import type { MetadataRoute } from 'next'
import { BLOG_POSTS, getAllBlogPosts } from '@/lib/blog'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllBlogPosts()
  const blogLastModified = posts[0]?.lastModified
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      ...(blogLastModified ? { lastModified: blogLastModified } : {}),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/security`,
      lastModified: new Date('2026-07-19T00:00:00+08:00'),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
  ]

  for (const post of posts) {
    entries.push({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.lastModified,
      changeFrequency: 'monthly',
      priority: BLOG_POSTS.find((item) => item.slug === post.slug)?.priority ?? 0.8,
    })
  }

  return entries
}
