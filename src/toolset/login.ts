import type { Page } from 'puppeteer-core';
import {
  detachBrowserSession,
  disconnectBrowserSession,
  ensureBrowserSession,
  getBrowserRef,
  getPageRef,
  getUserDataDir,
  setSessionPage,
  showAgentOperatingIndicator,
  SKIP_AGENT_OPERATING_OVERLAY,
  wasLastChromeLaunchHeadless,
} from '../browser/index.js';
import { CREATOR_HOME_URL, isLoginUrl } from '../browser/xhs_session_page.js';
import { readUserProfile, formatUserProfileText } from './get_profile.js';

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

  const creator = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank' && u.includes('creator.xiaohongshu.com');
  });
  if (creator) return creator;

  const nonBlank = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank';
  });
  return nonBlank ?? null;
}

/**
 * 登录（手动）：打开创作者中心，让用户在浏览器中自行完成登录。
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
  await page.goto(CREATOR_HOME_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  if (!SKIP_AGENT_OPERATING_OVERLAY) {
    await showAgentOperatingIndicator(page).catch(() => {
      /* 注入失败不阻断登录 */
    });
  }

  const currentUrl = page.url();
  if (!isLoginUrl(currentUrl) && currentUrl.includes('creator.xiaohongshu.com')) {
    // 首页可能仍在渲染或跳转到登录页，资料探测失败应回到手动登录提示。
    // 不再次 goto：首页导航已在上方完成，重复导航可能触发 ERR_ABORTED。
    const userProfile = await readUserProfile(page).catch(() => null);
    if (userProfile) {
      await detachBrowserSession();
      return `✅ 已登录\n${formatUserProfileText(userProfile)}`;
    }
  }

  await detachBrowserSession();
  return [
    `已在浏览器中打开小红书创作者中心：${CREATOR_HOME_URL}`,
    '本命令已同步结束并立即返回，CLI 不会等待 / 轮询 / 校验登录结果。',
    '请在浏览器中完成登录；后续 xhs metrics / post 等命令将复用同一会话。',
  ].join('\n');
}

/** 兼容旧调用方 */
export const login = runLogin;
