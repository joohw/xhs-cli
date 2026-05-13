/** 在多账号模式下为缓存文件名加前缀，避免创作者数据互相覆盖 */

export function prefixedCacheFilename(
  cachePathPrefix: string,
  filename: string,
): string {
  if (!cachePathPrefix) return filename;
  return `${cachePathPrefix}${filename.replace(/^\//, '')}`;
}
