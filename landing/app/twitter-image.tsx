import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/lib/social-image'

export const dynamic = 'force-static'
export const alt = 'xhs-cli, an open-source Xiaohongshu creator CLI'
export const size = SOCIAL_IMAGE_SIZE
export const contentType = 'image/png'

export default function TwitterImage() {
  return createSocialImage()
}
