// src/core/generate_cover.ts
// 为队列中的笔记生成封面图

import { existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { POST_QUEUE_DIR, getPostImagesDir, ensureAppDataLayout } from '../config.js';
import { generateCover } from '../Illustrate/generateCover.js';

// 为指定的 post 生成封面图片
export async function generateCoverForPost(queueFilename: string): Promise<boolean> {
  ensureAppDataLayout();
  const filename = queueFilename.endsWith('.txt') ? queueFilename : `${queueFilename}.txt`;
  const queueFilePath = join(POST_QUEUE_DIR, filename);
  if (!existsSync(queueFilePath)) {
    throw new Error(`发帖队列文件不存在: ${filename}`);
  }
  const title = filename.replace(/\.txt$/, '');
  if (!title) {
    throw new Error(`Post ${filename} 没有标题，无法生成封面`);
  }
  const postName = getPostNameFromFilename(filename);
  const postImageDir = getPostImageDir(postName);
  try {
    console.error(`🎨 正在为 post "${postName}" 生成封面图片...`);
    const coverPaths = await generateCover(title, postImageDir, '1', true);
    if (coverPaths && coverPaths.length > 0) {
      const targetPath = join(postImageDir, `0.png`);
      copyFileSync(coverPaths[0], targetPath);
      console.error(`✅ 封面图片已生成: ${targetPath}`);
      return true;
    }
    throw new Error('封面图片生成失败：未返回图片路径');
  } catch (error) {
    console.error('❌ 封面图片生成失败:', error instanceof Error ? error.message : error);
    throw error;
  }
}

function getPostImageDir(postName: string): string {
  return getPostImagesDir(postName);
}

function getPostNameFromFilename(filename: string): string {
  return filename.replace(/\.txt$/, '');
}
