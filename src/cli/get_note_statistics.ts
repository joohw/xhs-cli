// src/cli/get_note_statistics.ts

import type { Page } from 'puppeteer';
import { withLoggedInPage } from '../browser/browser.js';
import { checkLoginState } from './check_login_state.js';
import { NoteDetail } from '../types/note.js';
import { saveToCache, loadFromCache } from '../utils/cache.js';
import { serializeNoteDetail } from '../types/note.js';



// 获取近期笔记列表（从笔记管理页面）
export async function getRecentNotes(page: Page): Promise<NoteDetail[]> {
  await page.goto('https://creator.xiaohongshu.com/new/note-manager', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const noteCards = await page.$$('div.note');
  const data: NoteDetail[] = [];
  
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
    const cachedNote = loadFromCache<NoteDetail>(cacheFilename);
    
    if (cachedNote) {
      // 使用缓存数据，只更新列表页面能获取到的字段
      const updatedNote: NoteDetail = {
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
      const noteDetail: NoteDetail = {
        noteId: noteId,
        title: title || '未知标题',
        url: publicUrl,
        publishTime: publishTime || '',
        views: await getInteractionCount(page, card, 'views') || '0',
        likes: await getInteractionCount(page, card, 'likes') || '0',
        comments: await getInteractionCount(page, card, 'comments') || '0',
        favorites: await getInteractionCount(page, card, 'favorites') || '0',
        shares: await getInteractionCount(page, card, 'shares') || '0',
        content: '', // 在列表页面无法获取完整内容
        author: '', // 在列表页面无法获取作者
        coverImage: coverImage || '',
        images: [], // 在列表页面无法获取所有图片
        location: '', // 在列表页面无法获取位置
        tags: [], // 在列表页面无法获取标签
        exposure: '', // 需要详细统计页面
        coverClickRate: '', // 需要详细统计页面
        fansIncrease: '', // 需要详细统计页面
        avgViewTime: '', // 需要详细统计页面
        danmaku: '', // 需要详细统计页面
        detailUrl: publicUrl,
      };

      data.push(noteDetail);
      // 保存到缓存（无限期）
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

// 主函数 - 获取近期笔记列表
// 核心函数：获取笔记统计（返回原始数据）
async function getNoteStatisticsRaw(): Promise<NoteDetail[]> {
  return await withLoggedInPage(async (page) => {
    return await getRecentNotes(page);
  });
}

// MCP兼容函数：获取笔记统计（返回MCP格式）
export async function getNoteStatistics(limit?: number): Promise<import('../mcp/format.js').MCPResponse> {
  const { formatForMCP, formatErrorForMCP } = await import('../mcp/format.js');
  try {
    const data = await getNoteStatisticsRaw();
    const limitedData = limit ? data.slice(0, limit) : data;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total: data.length,
            limit: limit || data.length,
            notes: limitedData,
          }, null, 2),
        },
        {
          type: 'text',
          text: limitedData.map(note => serializeNoteDetail(note)).join('\n\n'),
        },
      ],
    };
  } catch (error) {
    return formatErrorForMCP(error);
  }
}

// CLI 命令函数
export async function getNoteStatisticsCommand(): Promise<void> {
  try {
    console.log('🔍 检查登录状态...\n');
    const isLoggedIn = await checkLoginState();
    if (!isLoggedIn) {
      console.error('❌ 未登录，请先运行: npm run xhs login');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 登录失败或超时:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  try {
    console.log('📥 获取近期笔记列表...\n');
    const { extractTextFromMCP } = await import('../mcp/format.js');
    const mcpResponse = await getNoteStatistics();
    
    if (mcpResponse.isError) {
      console.error(extractTextFromMCP(mcpResponse));
      process.exit(1);
    }
    
    const responseData = JSON.parse(mcpResponse.content[0].text);
    const data = responseData.notes as NoteDetail[];

    if (data.length === 0) {
      console.log('❌ 未找到笔记数据');
      return;
    }

    console.log(`\n📝 近期笔记列表 (共 ${data.length} 篇)\n`);
    console.log('='.repeat(60));
    
    data.forEach((note: NoteDetail, index: number) => {
      console.log(`\n📄 笔记 ${index + 1}/${data.length}`);
      console.log('-'.repeat(40));
      console.log(serializeNoteDetail(note));
    });

    console.log('\n💾 笔记数据已保存到缓存（notes/ 文件夹）\n');
  } catch (error) {
    console.error('❌ 获取笔记列表失败:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  }
}


// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  getNoteStatisticsCommand().catch(console.error);
}