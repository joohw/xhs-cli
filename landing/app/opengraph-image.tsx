import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/lib/social-image'

export const alt = 'xhs-cli, an open-source Xiaohongshu creator CLI'
export const size = SOCIAL_IMAGE_SIZE
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return createSocialImage()
}
