// 笔记详情和笔记统计数据接口



export interface Note {
  // 基础信息
  noteId: string;
  url: string;
  title: string;
  author?: string;
  publishTime: string;
  coverImage?: string;
  location?: string;
  tags?: string[];
  views: string;
  likes: string;
  comments: string;
  favorites: string;
  shares: string;
  exposure?: string;
  coverClickRate?: string;
  fansIncrease?: string;
  avgViewTime?: string;
  danmaku?: string;
  detailUrl?: string;
  detail?: {
    content?: string;
    images?: string[];
  }
}






export function serializeNote(note: Note): string {
  const parts: string[] = [];
  if (note.title) {
    parts.push(`标题: ${note.title}`);
  }
  if (note.publishTime) {
    parts.push(`发布时间: ${note.publishTime}`);
  }
  // 添加互动数据输出
  const stats: string[] = [];
  if (note.views && note.views !== '0') stats.push(`观看 ${note.views}`);
  if (note.likes && note.likes !== '0') stats.push(`点赞 ${note.likes}`);
  if (note.comments && note.comments !== '0') stats.push(`评论 ${note.comments}`);
  if (note.favorites && note.favorites !== '0') stats.push(`收藏 ${note.favorites}`);
  if (note.shares && note.shares !== '0') stats.push(`分享 ${note.shares}`);
  if (stats.length > 0) {
    parts.push(`互动: ${stats.join(', ')}`);
  }
  if (note.tags && note.tags.length > 0) {
    parts.push(`标签: ${note.tags.map(tag => `#${tag}`).join(' ')}`);
  }
  const advancedStats: string[] = [];
  if (note.exposure) advancedStats.push(`曝光 ${note.exposure}`);
  if (note.coverClickRate) advancedStats.push(`封面点击率 ${note.coverClickRate}`);
  if (note.fansIncrease) advancedStats.push(`涨粉 ${note.fansIncrease}`);
  if (note.avgViewTime) advancedStats.push(`人均观看时长 ${note.avgViewTime}`);
  if (note.danmaku) advancedStats.push(`弹幕 ${note.danmaku}`);
  if (advancedStats.length > 0) {
    parts.push(`数据: ${advancedStats.join(', ')}`);
  }
  if (note.detail && note.detail.images && note.detail.images.length > 0) {
    parts.push(`图片: ${note.detail.images.length}张`);
  }
  if (note.url) {
    parts.push(`链接: ${note.url}`);
  }
  return parts.join('\n');
}




export function serializeNoteDetail(note: Note): string {
  const parts: string[] = [];
  // 标题（参考标题风格）
  if (note.title) {
    parts.push(`标题: ${note.title}`);
  }
  // 内容（核心参考）
  if (note.detail && note.detail.content) {
    parts.push(`内容: ${note.detail.content}`);
  }
  // 标签（参考标签选择）
  if (note.tags && note.tags.length > 0) {
    parts.push(`标签: ${note.tags.map(tag => `#${tag}`).join(' ')}`);
  }
  // 图片链接（参考图片风格和内容，每个都输出为链接）
  if (note.detail && note.detail.images && note.detail.images.length > 0) {
    note.detail.images.forEach((imageUrl, index) => {
      parts.push(`  图片 ${index + 1}: ${imageUrl}`);
    });
  }
  return parts.join('\n');
}


