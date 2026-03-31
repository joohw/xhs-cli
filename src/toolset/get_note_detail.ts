import { withLoggedInPage } from '../browser/index.js';
import type { Page } from 'puppeteer-core';
import { saveToCache, loadFromCache } from '../utils/cache.js';

interface NoteDetailTextCache {
  text: string;
  updatedAt: string;
}

interface ExtractedNoteDetail {
  title: string;
  content: string;
  tags: string[];
  publishTime: string;
  coverImage: string;
  editorUrl: string;
}

function normalizeNoteId(noteId: string): string {
  return noteId.trim();
}

function formatNoteDetail(noteId: string, detail: ExtractedNoteDetail): string {
  const lines: string[] = [
    `ID: ${noteId}`,
    `标题: ${detail.title || '未知标题'}`,
    `发布时间: ${detail.publishTime || '未知'}`,
    `编辑页: ${detail.editorUrl}`,
    `公开链接: https://www.xiaohongshu.com/explore/${noteId}`,
  ];

  if (detail.coverImage) {
    lines.push(`封面: ${detail.coverImage}`);
  }
  if (detail.tags.length > 0) {
    lines.push(`标签: ${detail.tags.join('、')}`);
  }

  lines.push('', '正文:', detail.content || '(空)');
  return lines.join('\n');
}

async function getNoteDetailById(page: Page, noteId: string): Promise<ExtractedNoteDetail | null> {
  const editUrl = `https://creator.xiaohongshu.com/publish/update?id=${noteId}`;
  await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
    throw new Error('需要登录才能查看笔记详情');
  }

  try {
    await page.waitForSelector('input.d-text, .tiptap.ProseMirror', { timeout: 10000 });
  } catch {
    console.warn('⚠️ 等待元素超时，继续尝试提取...');
  }

  const detail = await page.evaluate(() => {
    const titleInput = document.querySelector('input.d-text') as HTMLInputElement | null;
    const contentEl = document.querySelector('.tiptap.ProseMirror');

    const tags: string[] = [];
    const tagSet = new Set<string>();
    document.querySelectorAll('a.tiptap-topic').forEach((topicEl) => {
      let tagName = '';
      const dataTopic = topicEl.getAttribute('data-topic');
      if (dataTopic) {
        try {
          const topicData = JSON.parse(dataTopic) as { name?: string };
          tagName = (topicData.name ?? '').trim();
        } catch {
          tagName = (topicEl.textContent ?? '').trim().replace(/#/g, '').replace(/\[话题\]/g, '').trim();
        }
      } else {
        tagName = (topicEl.textContent ?? '').trim().replace(/#/g, '').replace(/\[话题\]/g, '').trim();
      }
      if (tagName && !tagSet.has(tagName)) {
        tagSet.add(tagName);
        tags.push(tagName);
      }
    });

    const coverEl = document.querySelector('.cover img, .note-cover img, [class*="cover"] img, .preview img');
    const timeEl = document.querySelector('.publish-time, .time, [class*="time"], [class*="date"]');

    return {
      title: (titleInput?.value ?? '').trim(),
      content: (contentEl?.textContent ?? '').trim(),
      tags,
      publishTime: (timeEl?.textContent ?? '').trim(),
      coverImage: (coverEl as HTMLImageElement | null)?.src ?? '',
      editorUrl: window.location.href,
    };
  });

  if (!detail.title && !detail.content) {
    return null;
  }
  return detail;
}

export async function getNoteDetail(noteId: string): Promise<string> {
  const id = normalizeNoteId(noteId);
  if (!id) {
    throw new Error('noteId 不能为空');
  }

  const cacheFilename = `notes/${id}_detail_text.json`;
  const cached = loadFromCache<NoteDetailTextCache>(cacheFilename);
  if (cached?.text?.trim()) {
    return cached.text;
  }

  const detail = await withLoggedInPage(async (page) => getNoteDetailById(page, id));
  if (!detail) {
    return `未找到笔记详情: ${id}`;
  }

  const text = formatNoteDetail(id, detail);
  saveToCache(cacheFilename, {
    text,
    updatedAt: new Date().toISOString(),
  });
  return text;
}