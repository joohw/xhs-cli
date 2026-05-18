import { existsSync, readFileSync } from 'fs';

export type PostNoteParams = {
  title?: string;
  content: string;
  tags?: string[];
};

export function validatePostParams(params: PostNoteParams): void {
  if (!params.content || typeof params.content !== 'string') {
    throw new Error('内容(content)是必需的且必须是字符串');
  }
  if (params.content.trim().length === 0) {
    throw new Error('内容(content)不能为空');
  }
  if (params.content.length < 10) {
    throw new Error('内容太短了，不能少于10个字');
  }
  if (params.content.length > 1000) {
    throw new Error('小红书笔记长度不能超过1000个字');
  }
  if (params.title !== undefined) {
    if (typeof params.title !== 'string') {
      throw new Error('标题(title)必须是字符串');
    }
    if (params.title.length > 20) {
      throw new Error('标题长度不能超过20个字符');
    }
  }
  if (params.tags !== undefined) {
    if (!Array.isArray(params.tags)) {
      throw new Error('标签(tags)必须是数组');
    }
    for (const tag of params.tags) {
      if (typeof tag !== 'string') {
        throw new Error('每个标签必须是字符串');
      }
      if (tag.length > 50) {
        throw new Error('单个标签长度不能超过50个字符');
      }
    }
    if (params.tags.length > 10) {
      throw new Error('标签数量不能超过10个');
    }
  }
}

export function validateImagePaths(imagePaths: string[]): void {
  if (imagePaths.length === 0) {
    throw new Error('至少需要一张图片');
  }
  if (imagePaths.length > 18) {
    throw new Error(`图片数量不能超过18张，当前 ${imagePaths.length} 张`);
  }
  for (const imagePath of imagePaths) {
    if (!existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }
    try {
      readFileSync(imagePath);
    } catch (error) {
      throw new Error(
        `无法读取图片文件: ${imagePath} - ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
