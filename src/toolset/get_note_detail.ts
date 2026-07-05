import type { Browser, Page } from 'puppeteer-core';
import { CREATOR_HOME_URL, withLoggedInPage } from '../browser/index.js';
import { saveToCache, loadFromCache } from '../utils/cache.js';
import { findPostedNoteById, type PostedNoteApi } from './get_recent_posts.js';
import { prefixedCacheFilename } from './cachePaths.js';
import { upsertCachedPost } from './postCache.js';
import type { ResolvedSession } from './sessionTypes.js';

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
  previewUrl: string;
}

const CAROUSEL_RE = /^\d+\/\d+$/;
const COMMENTS_RE = /^共 \d+ 条评论$/;
const DATE_RE = /^\d{2}-\d{2}(?:\s+[\u4e00-\u9fffA-Za-z]+)?$/;

function normalizeNoteId(noteId: string): string {
  return noteId.trim();
}

function buildExploreUrl(noteId: string, meta: PostedNoteApi): string {
  const token = (meta.xsec_token ?? '').trim();
  const source = (meta.xsec_source ?? 'pc_creatormng').trim() || 'pc_creatormng';
  const params = new URLSearchParams({
    xsec_token: token,
    xsec_source: source,
  });
  return `https://www.xiaohongshu.com/explore/${noteId}?${params.toString()}`;
}

function parseExploreBodyText(
  raw: string,
  fallback: { title: string; publishTime: string },
): Pick<ExtractedNoteDetail, 'title' | 'content' | 'tags' | 'publishTime'> {
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);

  let titleIdx = 0;
  if (lines.length > 1) {
    if (CAROUSEL_RE.test(lines[1] ?? '')) {
      titleIdx = 2;
    } else if ((lines[0]?.length ?? 0) <= 24) {
      titleIdx = 1;
    }
  }

  const title = lines[titleIdx] ?? fallback.title;
  let i = titleIdx + 1;
  if (i < lines.length && CAROUSEL_RE.test(lines[i] ?? '')) {
    i += 1;
  }

  const contentLines: string[] = [];
  const tags = new Set<string>();
  let publishTime = fallback.publishTime;

  for (; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (
      line === '猜你想搜' ||
      line === '加载中' ||
      COMMENTS_RE.test(line) ||
      line === '说点什么...' ||
      line === '发送' ||
      line === '取消' ||
      line === '- THE END -'
    ) {
      break;
    }
    if (DATE_RE.test(line)) {
      if (!publishTime) publishTime = line;
      continue;
    }

    for (const tag of line.match(/#[\p{L}\p{N}_-]+/gu) ?? []) {
      tags.add(tag.replace(/^#/, ''));
    }
    contentLines.push(line);
  }

  return {
    title,
    content: contentLines.join('\n').trim(),
    tags: [...tags],
    publishTime,
  };
}

function formatNoteDetail(noteId: string, detail: ExtractedNoteDetail): string {
  const lines: string[] = [
    `ID: ${noteId}`,
    `标题: ${detail.title || '未知标题'}`,
    `发布时间: ${detail.publishTime || '未知'}`,
    `预览页: ${detail.previewUrl}`,
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

async function returnToCreatorHome(page: Page): Promise<void> {
  if (page.isClosed()) return;
  try {
    const url = page.url();
    if (!url.includes('/new/home')) {
      await page.goto(CREATOR_HOME_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
    }
  } catch {
    /* 回主页失败不阻断 CLI 返回 */
  }
}

async function fetchDetailFromExplorePage(
  browser: Browser,
  noteId: string,
  meta: PostedNoteApi,
): Promise<ExtractedNoteDetail | null> {
  const token = (meta.xsec_token ?? '').trim();
  if (!token) return null;

  const previewUrl = buildExploreUrl(noteId, meta);
  const detailPage = await browser.newPage();
  try {
    await detailPage.goto(previewUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const currentUrl = detailPage.url();
    if (currentUrl.includes('/404') || currentUrl.includes('/login')) {
      return null;
    }

    try {
      await detailPage.waitForFunction(
        () => {
          const text = document.body?.innerText ?? '';
          return text.length > 80 && !text.includes('当前笔记暂时无法浏览');
        },
        { timeout: 8000 },
      );
    } catch {
      /* 超时时仍尝试解析已有文本 */
    }

    const bodyText = await detailPage.evaluate(() => document.body?.innerText ?? '');
    const parsed = parseExploreBodyText(bodyText, {
      title: (meta.display_title ?? '').trim(),
      publishTime: (meta.time ?? '').trim(),
    });

    if (!parsed.title && !parsed.content) {
      return null;
    }

    return {
      ...parsed,
      coverImage: meta.images_list?.[0]?.url ?? '',
      editorUrl: `https://creator.xiaohongshu.com/publish/update?id=${noteId}`,
      previewUrl,
    };
  } finally {
    await detailPage.close().catch(() => {});
  }
}

async function getNoteDetailFromEditPage(
  page: Page,
  noteId: string,
): Promise<ExtractedNoteDetail | null> {
  const editUrl = `https://creator.xiaohongshu.com/publish/update?id=${noteId}`;
  await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
    throw new Error('需要登录才能查看笔记详情');
  }

  try {
    await page.waitForSelector('input.d-text, .tiptap.ProseMirror', { timeout: 8000 });
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

  return {
    ...detail,
    previewUrl: `https://www.xiaohongshu.com/explore/${noteId}`,
  };
}

async function getNoteDetailById(page: Page, noteId: string): Promise<ExtractedNoteDetail | null> {
  const browser = page.browser();
  try {
    const meta = await findPostedNoteById(page, noteId);
    if (meta?.xsec_token) {
      const fromExplore = await fetchDetailFromExplorePage(browser, noteId, meta);
      if (fromExplore) {
        return fromExplore;
      }
    }

    return await getNoteDetailFromEditPage(page, noteId);
  } finally {
    await returnToCreatorHome(page);
  }
}

export async function getNoteDetail(
  noteId: string,
  session: ResolvedSession,
): Promise<string> {
  const id = normalizeNoteId(noteId);
  if (!id) {
    throw new Error('noteId 不能为空');
  }

  const cacheFilename = prefixedCacheFilename(
    session.cachePathPrefix,
    `notes/${id}_detail_text.json`,
  );
  const cached = loadFromCache<NoteDetailTextCache>(cacheFilename);
  if (cached?.text?.trim()) {
    return cached.text;
  }

  const detail = await withLoggedInPage(
    async (page) => getNoteDetailById(page, id),
    session.browserUserDataDir,
  );
  if (!detail) {
    return `未找到笔记详情: ${id}`;
  }

  const text = formatNoteDetail(id, detail);
  upsertCachedPost(session, {
    noteId: id,
    title: detail.title,
    content: detail.content,
    publishTime: detail.publishTime,
    url: `https://www.xiaohongshu.com/explore/${id}`,
    coverImage: detail.coverImage,
    source: 'note-detail',
  });
  saveToCache(cacheFilename, {
    text,
    updatedAt: new Date().toISOString(),
  });
  return text;
}

export {
  parseExploreBodyText,
  buildExploreUrl,
  type ExtractedNoteDetail,
};
