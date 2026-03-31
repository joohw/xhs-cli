// 发布小红书笔记（无队列：每次调用仅使用传入的标题、正文与本地图片路径）

import { launchBrowser } from '../browser';
import { existsSync, readFileSync } from 'fs';
import { ensureAppDataLayout } from '../config.js';

/** 发帖参数 */
export interface PostNoteParams {
  title?: string;
  content: string;
  tags?: string[];
}

/** 发布流程结果（不含平台 noteId） */
export interface PostNoteResult {
  success: boolean;
  message: string;
}

function validatePostParams(params: PostNoteParams): void {
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
    if (params.title.length > 100) {
      throw new Error('标题长度不能超过100个字符');
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

function validateImagePaths(imagePaths: string[]): void {
  if (imagePaths.length === 0) {
    throw new Error('至少需要一张图片');
  }
  if (imagePaths.length > 9) {
    throw new Error(`图片数量不能超过9张，当前 ${imagePaths.length} 张`);
  }
  for (const imagePath of imagePaths) {
    if (!existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }
    try {
      readFileSync(imagePath);
    } catch (error) {
      throw new Error(`无法读取图片文件: ${imagePath} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.error(`✅ 图片验证通过: ${imagePaths.length} 张`);
}

export type PostNoteArgs = {
  /** 标题（必填） */
  title: string;
  /** 正文 */
  content: string;
  /** 本地图片路径，顺序即上传顺序，1～9 张 */
  imagePaths: string[];
};

/**
 * 打开发布页并填入标题、正文与图片；不读写队列目录。
 */
export async function postNote(args: PostNoteArgs): Promise<PostNoteResult> {
  ensureAppDataLayout();
  const title = args.title.trim();
  if (!title) {
    throw new Error('标题不能为空');
  }
  const params: PostNoteParams = { title, content: args.content };
  validatePostParams(params);
  validateImagePaths(args.imagePaths);
  const imagePaths = [...args.imagePaths];

  const browser = await launchBrowser(false);
  try {
    const page = await browser.newPage();
    await page.goto('https://creator.xiaohongshu.com/new/home', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
    if (isLoginPage) {
      throw new Error('未登录状态。请先运行 xhs login 进行登录。');
    }
    console.error('📥 正在打开发布页面...');
    await page.goto('https://creator.xiaohongshu.com/publish/publish?from=homepage&target=image', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.error(`📷 正在上传 ${imagePaths.length} 张图片...`);
    try {
      await page.waitForSelector('input.upload-input[type="file"]', { timeout: 10000 });
      const uploadInput = await page.$('input.upload-input[type="file"]');
      if (!uploadInput) {
        throw new Error('未找到图片上传输入框');
      }
      await uploadInput.uploadFile(...imagePaths);
      console.error(`✅ 已上传 ${imagePaths.length} 张图片`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('❌ 图片上传失败:', error instanceof Error ? error.message : error);
      throw error;
    }

    try {
      await page.waitForSelector('input.d-text', { timeout: 5000 });
      const titleInput = await page.$('input.d-text');
      if (titleInput) {
        await titleInput.click({ clickCount: 3 });
        await titleInput.type(params.title!, { delay: 100 });
        console.error('✅ 标题已填写');
      }
    } catch {
      console.error('⚠️  填写标题失败，继续...');
    }

    try {
      await page.waitForSelector('div.tiptap.ProseMirror[contenteditable="true"]', { timeout: 5000 });
      const contentSet = await page.evaluate((content: string) => {
        const editor = document.querySelector('div.tiptap.ProseMirror[contenteditable="true"]') as HTMLElement;
        if (!editor) return false;
        editor.focus();
        editor.innerHTML = '';
        const textNode = document.createTextNode(content);
        editor.appendChild(textNode);
        const inputEvent = new Event('input', { bubbles: true });
        editor.dispatchEvent(inputEvent);
        const changeEvent = new Event('change', { bubbles: true });
        editor.dispatchEvent(changeEvent);
        return true;
      }, params.content);
      if (contentSet) {
        console.error('✅ 内容已直接设置完成');
      } else {
        throw new Error('无法找到内容编辑器');
      }
    } catch (error) {
      console.error('❌ 设置内容失败:', error instanceof Error ? error.message : error);
      throw error;
    }

    if (params.tags && params.tags.length > 0) {
      console.error('🏷️  标签添加功能待实现');
    }

    console.error('✅ 表单填写完成');
    console.error('💡 提示: 请在浏览器中手动保存草稿或发布');
    return {
      success: true,
      message: '表单填写完成，请在浏览器中手动保存草稿或发布',
    };
  } finally {
    // 不关闭浏览器，让用户继续操作
  }
}
