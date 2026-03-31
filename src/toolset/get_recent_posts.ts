import type { Page, ElementHandle } from 'puppeteer-core';
import { withLoggedInPage } from '../browser/index.js';
import { saveToCache, loadFromCache } from '../utils/cache.js';

interface NoteRaw {
  noteId: string;
  title: string;
  publishTime: string;
  url: string;
  views: string;
  likes: string;
  comments: string;
  favorites: string;
  shares: string;
  coverImage: string;
}

function formatNote(note: NoteRaw): string {
  return [
    `ID: ${note.noteId}`,
    `标题: ${note.title}`,
    `发布时间: ${note.publishTime}`,
    `链接: ${note.url}`,
    `浏览: ${note.views}  点赞: ${note.likes}  评论: ${note.comments}  收藏: ${note.favorites}  分享: ${note.shares}`,
  ].join('\n');
}

async function getInteractionCount(page: Page, card: ElementHandle, type: string): Promise<string> {
  const iconList = await card.$('.icon_list');
  if (!iconList) return '0';
  const icons = await iconList.$$('.icon');
  for (const icon of icons) {
    const iconText = await page.evaluate((el, targetType) => {
      const d = el.querySelector('svg path')?.getAttribute('d') ?? '';
      const count = (el.querySelector('span')?.textContent ?? '').trim();
      if (targetType === 'views'     && (d.includes('M21.83 11.442') || d.includes('M15 12')))        return count;
      if (targetType === 'likes'     && (d.includes('M12 22c5.5 0')  || d.includes('M8.4 11')))       return count;
      if (targetType === 'favorites' && (d.includes('M12 4.32A6.19') || d.includes('l7.244 7.17')))   return count;
      if (targetType === 'comments'  && (d.includes('M5.873 21.142') || d.includes('l.469-4.549')))   return count;
      if (targetType === 'shares'    && (d.includes('M20.673 12.764')|| d.includes('l-8.612-6.236'))) return count;
      return null;
    }, icon, type);
    if (iconText) return iconText;
  }
  return '0';
}

async function scrapeRecentPosts(page: Page, limit?: number): Promise<string> {
  await page.goto('https://creator.xiaohongshu.com/new/note-manager', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 3000));

  const noteCards = await page.$$('div.note');
  const results: NoteRaw[] = [];

  for (const card of noteCards) {
    if (typeof limit === 'number' && results.length >= limit) break;

    const impressionData = await page.evaluate((el) => {
      const raw = el.getAttribute('data-impression');
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    }, card);

    const noteId: string = impressionData?.noteTarget?.value?.noteId ?? '';
    if (!noteId) continue;

    const cacheKey = `notes/${noteId}.json`;
    const cached = loadFromCache<NoteRaw>(cacheKey);

    const views    = await getInteractionCount(page, card, 'views');
    const likes    = await getInteractionCount(page, card, 'likes');
    const comments = await getInteractionCount(page, card, 'comments');
    const favorites= await getInteractionCount(page, card, 'favorites');
    const shares   = await getInteractionCount(page, card, 'shares');

    let note: NoteRaw;
    if (cached) {
      note = { ...cached, views, likes, comments, favorites, shares };
    } else {
      const titleEl = await card.$('.info .title');
      const title   = titleEl ? await page.evaluate((el) => (el.textContent ?? '').trim(), titleEl) : '未知标题';

      const timeEl      = await card.$('.info .time');
      const publishTime = timeEl ? await page.evaluate((el) => (el.textContent ?? '').trim(), timeEl) : '';

      let coverImage = '';
      const imgEl = await card.$('.img img');
      if (imgEl) {
        coverImage = await page.evaluate((el) => el.getAttribute('src') ?? '', imgEl);
      } else {
        const bgEl = await card.$('.img .media-bg');
        if (bgEl) {
          const style    = await page.evaluate((el) => el.getAttribute('style') ?? '', bgEl);
          const urlMatch = style.match(/url\(["']?([^"']+)["']?\)/);
          if (urlMatch) coverImage = urlMatch[1];
        }
      }

      note = {
        noteId,
        title,
        publishTime,
        url: `https://www.xiaohongshu.com/explore/${noteId}`,
        views, likes, comments, favorites, shares,
        coverImage,
      };
    }

    saveToCache(cacheKey, note);
    results.push(note);
  }

  if (results.length === 0) return '未找到笔记数据';
  return results.map(formatNote).join('\n\n');
}

export async function getRecentPosts(limit?: number): Promise<string> {
  return withLoggedInPage((page) => scrapeRecentPosts(page, limit));
}
