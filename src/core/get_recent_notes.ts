// 读取最近发布的笔记列表


import type { Page } from 'puppeteer-core';
import { withLoggedInPage } from '../browser/browser.js';
import { Note } from '../types/note.js';
import { saveToCache, loadFromCache } from '../utils/cache.js';
import { checkLoginState } from './check_login_state.js';



// 获取近期笔记列表（从笔记管理页面）
export async function getRecentNotesRemote(page: Page): Promise<Note[]> {
  await page.goto('https://creator.xiaohongshu.com/new/note-manager', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
  const noteCards = await page.$$('div.note');
  const data: Note[] = [];
  for (const card of noteCards) {
    // 提取笔记ID
    const impressionData = await page.evaluate(el => {
      const dataImpression = el.getAttribute('data-impression');
      if (!dataImpression) return null;
      try {
        return JSON.parse(dataImpression);
      } catch {
        return null;
      }
    }, card);
    let noteId = '';
    if (impressionData?.noteTarget?.value?.noteId) {
      noteId = impressionData.noteTarget.value.noteId;
    }
    // 如果没有笔记ID，跳过
    if (!noteId) {
      continue;
    }
    // 检查是否已有缓存
    const cacheFilename = `notes/${noteId}.json`;
    const cachedNote = loadFromCache<Note>(cacheFilename);
    if (cachedNote) {
      // 使用缓存数据，只更新列表页面能获取到的字段
      const updatedNote: Note = {
        ...cachedNote,
        // 更新列表页面能获取到的字段
        views: await getInteractionCount(page, card, 'views') || cachedNote.views,
        likes: await getInteractionCount(page, card, 'likes') || cachedNote.likes,
        comments: await getInteractionCount(page, card, 'comments') || cachedNote.comments,
        favorites: await getInteractionCount(page, card, 'favorites') || cachedNote.favorites,
        shares: await getInteractionCount(page, card, 'shares') || cachedNote.shares,
      };
      data.push(updatedNote);
      // 更新缓存
      saveToCache(cacheFilename, updatedNote);
    } else {
      // 提取标题
      const titleEl = await card.$('.info .title');
      const title = titleEl ? await page.evaluate(el => (el.textContent || '').trim(), titleEl) : '';
      // 提取发布时间
      const timeEl = await card.$('.info .time');
      const publishTime = timeEl ? await page.evaluate(el => (el.textContent || '').trim(), timeEl) : '';
      // 提取封面图片
      const coverEl = await card.$('.img img');
      let coverImage = '';
      if (coverEl) {
        coverImage = await page.evaluate(el => el.getAttribute('src') || '', coverEl);
      } else {
        const bgEl = await card.$('.img .media-bg');
        if (bgEl) {
          const bgStyle = await page.evaluate(el => el.getAttribute('style') || '', bgEl);
          const urlMatch = bgStyle.match(/url\(["']?([^"']+)["']?\)/);
          if (urlMatch) {
            coverImage = urlMatch[1];
          }
        }
      }
      // 构建公开链接
      const publicUrl = `https://www.xiaohongshu.com/explore/${noteId}`;
      // 创建新的 NoteDetail 对象
      const noteDetail: Note = {
        noteId: noteId,
        title: title || '未知标题',
        url: publicUrl,
        publishTime: publishTime || '',
        views: await getInteractionCount(page, card, 'views') || '0',
        likes: await getInteractionCount(page, card, 'likes') || '0',
        comments: await getInteractionCount(page, card, 'comments') || '0',
        favorites: await getInteractionCount(page, card, 'favorites') || '0',
        shares: await getInteractionCount(page, card, 'shares') || '0',
        coverImage: coverImage || '',
        detailUrl: publicUrl,
      };
      data.push(noteDetail);
      saveToCache(cacheFilename, noteDetail);
    }
  }
  return data;
}



// 辅助函数：获取互动数据
async function getInteractionCount(page: Page, card: any, type: string): Promise<string> {
  const iconList = await card.$('.icon_list');
  if (!iconList) return '0';
  const icons = await iconList.$$('.icon');
  for (const icon of icons) {
    const iconText = await page.evaluate((el, targetType) => {
      const svg = el.querySelector('svg');
      const path = svg?.querySelector('path');
      const d = path?.getAttribute('d') || '';
      const span = el.querySelector('span');
      const count = span ? (span.textContent || '').trim() : '';
      if (targetType === 'views' && (d.includes('M21.83 11.442') || d.includes('M15 12'))) {
        return count;
      }
      if (targetType === 'likes' && (d.includes('M12 22c5.5 0') || d.includes('M8.4 11'))) {
        return count;
      }
      if (targetType === 'favorites' && (d.includes('M12 4.32A6.19') || d.includes('l7.244 7.17'))) {
        return count;
      }
      if (targetType === 'comments' && (d.includes('M5.873 21.142') || d.includes('l.469-4.549'))) {
        return count;
      }
      if (targetType === 'shares' && (d.includes('M20.673 12.764') || d.includes('l-8.612-6.236'))) {
        return count;
      }
      return null;
    }, icon, type);
    if (iconText) {
      return iconText || '0';
    }
  }
  return '0';
}



// 获取近期笔记列表 - 返回 Note[]
export async function getRecentNotes(): Promise<Note[]> {
  const { isLoggedIn } = await checkLoginState();
  if (!isLoggedIn) {
    throw new Error('未登录状态。请先确保已登录小红书。');
  }
  return await withLoggedInPage(async (page) => {
    return await getRecentNotesRemote(page);
  });
}
