// 发布小红书笔记（无队列：每次调用仅使用传入的标题、正文与本地图片路径）

import type { Page } from 'puppeteer-core';
import { launchBrowser } from '../browser/index.js';
import { ensureAppDataLayout } from '../config.js';
import {
  PUBLISH_BUTTON_LABELS,
  PUBLISH_FOOTER_SELECTORS,
} from './publishButton.js';
import {
  validateImagePaths,
  validatePostParams,
  type PostNoteParams,
} from './postValidate.js';

export type { PostNoteParams } from './postValidate.js';

/** 发布流程结果（不含平台 noteId） */
export interface PostNoteResult {
  success: boolean;
  message: string;
}

export type PostNoteArgs = {
  /** 标题（必填） */
  title: string;
  /** 正文 */
  content: string;
  /** 本地图片路径，顺序即上传顺序，1～18 张 */
  imagePaths: string[];
  /**
   * 为 true 时在填表后自动点击页面「发布」按钮；默认 false，仅填表并提示在浏览器中手动发布或修改。
   */
  publish?: boolean;
  /** 为 true 时使用无头 Chrome；也可用环境变量 XHS_HEADLESS=1 */
  headless?: boolean;
  /** 可选：多账号会话 Chrome userDataDir */
  browserUserDataDir?: string;
};

/** 等待并点击 .publish-page-publish-btn 内的红色「发布」按钮（不扫描全页，避免误点） */
async function waitAndClickPublish(page: Page): Promise<void> {
  const selectors = [...PUBLISH_FOOTER_SELECTORS];
  const labels = [...PUBLISH_BUTTON_LABELS];

  const isReady = (sels: string[], allowed: string[]) => {
    const norm = (s: string) => s.replace(/\s+/g, '');
    for (const sel of sels) {
      for (const b of Array.from(document.querySelectorAll(sel))) {
        const el = b as HTMLButtonElement;
        if (el.disabled) continue;
        if (allowed.includes(norm(el.textContent ?? ''))) return true;
      }
    }
    return false;
  };

  await page.waitForFunction(isReady, { timeout: 45000 }, selectors, labels);

  const clicked = await page.evaluate(
    (sels: string[], allowed: string[]) => {
      const norm = (s: string) => s.replace(/\s+/g, '');
      for (const sel of sels) {
        for (const b of Array.from(document.querySelectorAll(sel))) {
          const el = b as HTMLButtonElement;
          if (el.disabled) continue;
          if (!allowed.includes(norm(el.textContent ?? ''))) continue;
          el.click();
          return true;
        }
      }
      return false;
    },
    selectors,
    labels,
  );

  if (!clicked) {
    throw new Error('未在 .publish-page-publish-btn 内找到可点击的「发布」按钮');
  }
  await new Promise((r) => setTimeout(r, 2500));
}

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
  const autoPublish = args.publish === true;
  const headless =
    args.headless === true ||
    process.env.XHS_HEADLESS === '1' ||
    process.env.XHS_HEADLESS?.toLowerCase() === 'true';

  const browser = await launchBrowser(headless, [], args.browserUserDataDir);
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
    await page.goto('https://creator.xiaohongshu.com/publish/publish?from=homepage&target=image', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      await page.waitForSelector('input.upload-input[type="file"]', { timeout: 10000 });
      const uploadInput = await page.$('input.upload-input[type="file"]');
      if (!uploadInput) {
        throw new Error('未找到图片上传输入框');
      }
      await uploadInput.uploadFile(...imagePaths);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    try {
      await page.waitForSelector('input.d-text', { timeout: 5000 });
      const titleInput = await page.$('input.d-text');
      if (titleInput) {
        await titleInput.click({ clickCount: 3 });
        await titleInput.type(params.title!, { delay: 100 });
      }
    } catch {
      // 标题可选失败，继续填正文
    }

    try {
      await page.waitForSelector('div.tiptap.ProseMirror[contenteditable="true"]', { timeout: 5000 });
      const contentSet = await page.evaluate((content: string) => {
        const editor = document.querySelector(
          'div.tiptap.ProseMirror[contenteditable="true"]',
        ) as HTMLElement;
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
      if (!contentSet) {
        throw new Error('无法找到内容编辑器');
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    if (autoPublish) {
      await waitAndClickPublish(page);
      return {
        success: true,
        message: '已自动点击「发布」，请留意页面是否发布成功',
      };
    }

    return {
      success: true,
      message:
        '已填入标题与正文；浏览器窗口保持打开，请在页面中确认后发布。',
    };
  } finally {
    try {
      if (browser.isConnected()) {
        await browser.disconnect();
      }
    } catch {
      // 忽略断开时的异常
    }
  }
}
