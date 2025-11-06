// src/cli/get_note_detail.ts


import { withLoggedInPage } from '../browser/browser.js';
import { checkLoginState } from './check_login_state.js';
import type { Page } from 'puppeteer';
import { Note } from '../types/note.js';
import { saveToCache, loadFromCache } from '../utils/cache.js';
import { serializeNoteDetail } from '../types/note.js';



// 检查缓存笔记是否内容完整
function isNoteContentComplete(note: Note): boolean {
  // 如果内容为空且图片数组为空，说明内容不完整
  if ((!note.detail?.content || note.detail?.content.trim() === '') &&
    (!note.detail?.images || note.detail?.images.length === 0)) {
    return false;
  }
  return true;
}



// 合并笔记数据（缓存数据 + 新获取的数据）
function mergeNoteData(cachedNote: Note, newPartialData: Partial<Note>): Note {
  return {
    ...cachedNote,
    // 用新数据覆盖缓存中的对应字段
    title: newPartialData.title || cachedNote.title,
    detail: newPartialData.detail || cachedNote.detail,
    author: newPartialData.author || cachedNote.author,
    publishTime: newPartialData.publishTime || cachedNote.publishTime,
    coverImage: newPartialData.coverImage || cachedNote.coverImage,
    location: newPartialData.location || cachedNote.location,
    tags: newPartialData.tags || cachedNote.tags,
    // 保持原有的互动数据（views, likes等）不变
    views: cachedNote.views,
    likes: cachedNote.likes,
    comments: cachedNote.comments,
    favorites: cachedNote.favorites,
    shares: cachedNote.shares,
    // 保持原有的统计数据不变
    exposure: cachedNote.exposure,
    coverClickRate: cachedNote.coverClickRate,
    fansIncrease: cachedNote.fansIncrease,
    avgViewTime: cachedNote.avgViewTime,
    danmaku: cachedNote.danmaku,
  };
}



// 获取笔记详情（只获取部分数据）
export async function getNoteDetailById(page: Page, noteId: string): Promise<Partial<Note> | null> {
  const editUrl = `https://creator.xiaohongshu.com/publish/update?id=${noteId}`;
  // 访问编辑页面
  await page.goto(editUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  // 等待页面加载
  await new Promise(resolve => setTimeout(resolve, 3000));
  // 检查是否成功加载
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
    throw new Error('需要登录才能查看笔记详情');
  }
  // 等待关键元素加载
  try {
    await page.waitForSelector('input.d-text, .tiptap.ProseMirror', { timeout: 10000 });
  } catch (error) {
    console.warn('⚠️ 等待元素超时，继续尝试提取...');
  }
  // 提取笔记详情
  const partialDetail = await page.evaluate((): Partial<Note> => {
    const result: Partial<Note> = {
      url: window.location.href,
    };
    // 提取标题 - 从 input.d-text 的 value 属性
    const titleInput = document.querySelector('input.d-text') as HTMLInputElement;
    if (titleInput && titleInput.value) {
      result.title = titleInput.value.trim();
    }
    // 提取内容 - 从 .tiptap.ProseMirror
    const contentEl = document.querySelector('.tiptap.ProseMirror');
    if (contentEl) {
      // 获取纯文本内容
      result.detail = {
        content: (contentEl.textContent || '').trim(),
      };
      // 提取内容中的图片
      const imageEls = contentEl.querySelectorAll('img');
      if (imageEls.length > 0) {
        const images: string[] = [];
        imageEls.forEach(img => {
          const src = (img as HTMLImageElement).src;
          // 排除分隔符图片
          if (src && !img.classList.contains('ProseMirror-separator')) {
            images.push(src);
          }
        });
        if (images.length > 0) {
          result.detail.images = images;
        }
      }
    }
    // 提取话题标签 - 从 .tiptap-topic
    const topicEls = document.querySelectorAll('a.tiptap-topic');
    if (topicEls.length > 0) {
      const tags: string[] = [];
      const tagSet = new Set<string>();
      topicEls.forEach(topicEl => {
        let tagName = '';
        // 优先从 data-topic 属性中解析JSON获取标签信息
        const dataTopic = topicEl.getAttribute('data-topic');
        if (dataTopic) {
          try {
            const topicData = JSON.parse(dataTopic);
            if (topicData.name) {
              tagName = topicData.name.trim();
            }
          } catch {
            // 如果解析失败，使用文本内容
            const text = (topicEl.textContent || '').trim();
            tagName = text.replace(/#/g, '').replace(/\[话题\]/g, '').trim();
          }
        } else {
          // 如果没有data-topic，使用文本内容
          const text = (topicEl.textContent || '').trim();
          tagName = text.replace(/#/g, '').replace(/\[话题\]/g, '').trim();
        }
        // 去重并添加到数组
        if (tagName && !tagSet.has(tagName)) {
          tagSet.add(tagName);
          tags.push(tagName);
        }
      });
      if (tags.length > 0) {
        result.tags = tags;
      }
    }
    // 尝试提取封面图片
    const coverEl = document.querySelector('.cover img, .note-cover img, [class*="cover"] img, .preview img');
    if (coverEl) {
      result.coverImage = (coverEl as HTMLImageElement).src;
    }
    // 尝试提取发布时间
    const timeEl = document.querySelector('.publish-time, .time, [class*="time"], [class*="date"]');
    if (timeEl) {
      result.publishTime = (timeEl.textContent || '').trim();
    }
    return result;
  });
  // 如果无法提取基本信息，返回null
  if (!partialDetail.title && !partialDetail.detail?.content) {
    return null;
  }
  return partialDetail;
}



// 核心函数：获取笔记详情（返回原始数据）
async function getNoteDetailRaw(noteId: string): Promise<Note | null> {
  const cacheFilename = `notes/${noteId}.json`;
  const cachedDetail = loadFromCache<Note>(cacheFilename);
  if (cachedDetail && isNoteContentComplete(cachedDetail)) {
    return cachedDetail;
  }
  const partialDetail = await withLoggedInPage(async (page) => {
    return await getNoteDetailById(page, noteId);
  });

  if (!partialDetail) {
    return null;
  }
  const publicUrl = `https://www.xiaohongshu.com/explore/${noteId}`;
  let finalDetail: Note;
  if (cachedDetail) {
    finalDetail = mergeNoteData(cachedDetail, partialDetail);
  } else {
    finalDetail = {
      noteId,
      title: partialDetail.title || '未知标题',
      url: publicUrl,
      publishTime: partialDetail.publishTime || '',
      views: '0',
      likes: '0',
      comments: '0',
      favorites: '0',
      shares: '0',
      detail: partialDetail.detail,
      author: partialDetail.author,
      coverImage: partialDetail.coverImage,
      location: partialDetail.location,
      tags: partialDetail.tags,
    };
  }
  saveToCache(cacheFilename, finalDetail);
  return finalDetail;
}



// MCP兼容函数：获取笔记详情（返回MCP格式）
export async function getNoteDetail(noteId: string): Promise<import('../mcp/format.js').MCPResponse> {
  const { formatForMCP, formatErrorForMCP } = await import('../mcp/format.js');
  if (!noteId) {
    return {
      content: [{ type: 'text', text: '错误: 必须提供 noteId 参数。' }],
      isError: true,
    };
  }
  try {
    const detail = await getNoteDetailRaw(noteId);
    if (!detail) {
      return {
        content: [{ type: 'text', text: `错误: 无法获取笔记 ${noteId} 的详情。` }],
        isError: true,
      };
    }
    return formatForMCP(detail, serializeNoteDetail);
  } catch (error) {
    return formatErrorForMCP(error);
  }
}


// CLI 命令函数
export async function getNoteDetailByIdCommand(noteId?: string): Promise<void> {
  if (!noteId) {
    console.error('❌ 请提供笔记ID');
    console.error('使用方法: npm run xhs get-note-detail-by-id <noteId>');
    process.exit(1);
  }
  try {
    console.error('🔍 检查登录状态...\n');
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
    const cacheFilename = `notes/${noteId}.json`;
    const cachedDetail = loadFromCache<Note>(cacheFilename);
    if (cachedDetail && isNoteContentComplete(cachedDetail)) {
      console.error('📝 使用缓存的笔记详情...\n');
      console.error(serializeNoteDetail(cachedDetail));
      return;
    }
    if (cachedDetail && !isNoteContentComplete(cachedDetail)) {
      console.error('📥 缓存内容不完整，从网络更新...\n');
    } else {
      console.error('📥 缓存未命中，从网络获取...\n');
    }
    const { extractTextFromMCP } = await import('../mcp/format.js');
    const mcpResponse = await getNoteDetail(noteId);

    if (mcpResponse.isError) {
      console.error(extractTextFromMCP(mcpResponse));
      process.exit(1);
    }

    console.error('💾 笔记详情已缓存\n');
    console.error(extractTextFromMCP(mcpResponse));
  } catch (error) {
    console.error('❌ 获取笔记详情失败:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  }
}



// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  const noteId = process.argv[2];
  getNoteDetailByIdCommand(noteId).catch(console.error);
}