import type { MetadataRoute } from 'next'
import { getAllBlogPosts } from '@/lib/blog'
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
  ]

  const posts = getAllBlogPosts()
  if (posts.length > 0) {
    entries.push({
      url: `${SITE_URL}/blog`,
      lastModified: posts[0].lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    })

    for (const post of posts) {
      entries.push({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.lastModified,
        changeFrequency: 'monthly',
        priority: 0.8,
      })
    }
  }

  return entries
}
