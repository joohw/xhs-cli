import type { Page } from 'puppeteer-core';
import {
  detachBrowserSession,
  disconnectBrowserSession,
  ensureBrowserSession,
  getBrowserRef,
  getPageRef,
  getUserDataDir,
  setSessionPage,
  wasLastChromeLaunchHeadless,
} from '../browser/index.js';
import { isLoginUrl, MAIN_SITE_EXPLORE_URL } from '../browser/xhs_session_page.js';
import {
  formatUserProfileText,
  getMainSiteUserProfile,
  type UserProfile,
} from './get_profile.js';

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

async function pickExistingPage(browser: NonNullable<ReturnType<typeof getBrowserRef>>): Promise<Page | null> {
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

  const mainSite = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank' && u.includes('www.xiaohongshu.com');
  });
  if (mainSite) return mainSite;

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

/**
 * 登录（手动）：打开小红书主站发现页，让用户在浏览器中完成主站登录。
 * 主站与创作者中心会话分离但共享浏览器 Cookie；创作者能力需主站先登录。
 * 已登录时快速返回资料；否则立即 detach，CLI 不等待轮询。
 */
export async function runLogin(userDataDir?: string): Promise<string> {
  process.env.XHS_BROWSER_HEADLESS = 'false';
  const dir = getUserDataDir(userDataDir);

  const existing = getBrowserRef();
  try {
    const args = existing?.process?.()?.spawnargs ?? [];
    const isHeadless =
      wasLastChromeLaunchHeadless() ||
      args.some((a) => typeof a === 'string' && a.startsWith('--headless'));
    if (existing?.connected && isHeadless) {
      await disconnectBrowserSession().catch(() => {});
    }
  } catch {
    /* ignore */
  }

  await ensureBrowserSession({ userDataDir: dir, headless: false });
  const browser = getBrowserRef();
  if (!browser) {
    throw new Error('无法获取浏览器实例，登录失败。');
  }

  let page = getPageRef();
  if (!page || page.isClosed()) {
    page = (await pickExistingPage(browser)) ?? (await browser.newPage());
  }
  setSessionPage(page);
  await page.bringToFront();
  await page.goto(MAIN_SITE_EXPLORE_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const currentUrl = page.url();
  if (!isLoginUrl(currentUrl)) {
    const userProfile = await withTimeout<UserProfile | null>(
      getMainSiteUserProfile(page),
      8000,
      null,
    );
    if (userProfile) {
      await detachBrowserSession();
      return `✅ 主站已登录\n${formatUserProfileText(userProfile)}`;
    }
  }

  await detachBrowserSession();
  return [
    `已在浏览器中打开小红书发现页：${MAIN_SITE_EXPLORE_URL}`,
    '请在浏览器中完成主站登录（与 creator.xiaohongshu.com 创作者中心为同一账号体系）。',
    '本命令已同步结束并立即返回，CLI 不会等待 / 轮询 / 校验登录结果。',
    '登录后 xhs metrics / post 等命令将复用同一会话访问创作者中心。',
  ].join('\n');
}

/** 兼容旧调用方 */
export const login = runLogin;
