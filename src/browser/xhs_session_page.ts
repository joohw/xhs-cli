import type { Page } from 'puppeteer-core';
import {
  hideAgentOperatingIndicator,
  showAgentOperatingIndicator,
  SKIP_AGENT_OPERATING_OVERLAY,
} from './agent_operating_indicator.js';
import {
  ensureBrowserSession,
  getBrowserRef,
  getPageRef,
  setSessionPage,
  type EnsureSessionOptions,
} from './browser_session.js';

const CREATOR_HOME_URL = 'https://creator.xiaohongshu.com/new/home';

function isLoginUrl(url: string): boolean {
  return url.includes('/login') || url.includes('/signin');
}

async function pickExistingXhsPage(browser: NonNullable<ReturnType<typeof getBrowserRef>>): Promise<Page | null> {
  const pages = (await browser.pages()).filter((p) => !p.isClosed());
  if (pages.length === 0) return null;

  const urls = await Promise.all(
    pages.map((p) => {
      try {
        return p.url();
      } catch {
        return '';
      }
    }),
  );

  const creator = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank' && u.includes('creator.xiaohongshu.com');
  });
  if (creator) return creator;

  const xhs = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank' && u.includes('xiaohongshu.com');
  });
  if (xhs) return xhs;

  const nonBlank = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank';
  });
  return nonBlank ?? null;
}

async function ensureCreatorLoggedIn(page: Page): Promise<void> {
  let currentUrl = page.url();
  if (!currentUrl.includes('creator.xiaohongshu.com')) {
    await page.goto(CREATOR_HOME_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    currentUrl = page.url();
  }
  if (isLoginUrl(currentUrl)) {
    throw new Error('未登录，请先运行 xhs login 进行登录');
  }
}

/**
 * 在已连接浏览器、且当前页可访问创作者中心的前提下执行回调。
 * 会话由 CLI 层 {@link detachBrowserSession} 统一 detach，回调内不关浏览器。
 */
export async function withXhsSessionPage<T>(
  callback: (page: Page) => Promise<T>,
  options: EnsureSessionOptions,
): Promise<T> {
  await ensureBrowserSession(options);
  const browser = getBrowserRef();
  if (!browser) {
    throw new Error('无法获取浏览器实例');
  }

  let page = getPageRef();
  if (!page || page.isClosed()) {
    page = (await pickExistingXhsPage(browser)) ?? (await browser.newPage());
  }
  setSessionPage(page);
  await page.bringToFront();
  await ensureCreatorLoggedIn(page);

  const headless = options.headless ?? process.env.XHS_BROWSER_HEADLESS === 'true';
  if (!headless && !SKIP_AGENT_OPERATING_OVERLAY) {
    await showAgentOperatingIndicator(page).catch(() => {
      /* 注入失败不阻断业务 */
    });
  }
  try {
    return await callback(page);
  } finally {
    if (!headless && !SKIP_AGENT_OPERATING_OVERLAY) {
      await hideAgentOperatingIndicator(page);
    }
  }
}

export { CREATOR_HOME_URL, isLoginUrl };
