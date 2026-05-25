import type { MetadataRoute } from 'next'
import { BLOG_POSTS, getAllBlogPosts } from '@/lib/blog'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]

  for (const post of BLOG_POSTS) {
    entries.push({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: getAllBlogPosts().find((item) => item.slug === post.slug)?.lastModified ?? now,
      changeFrequency: 'monthly',
      priority: post.priority,
    })
  }

  return entries
}
