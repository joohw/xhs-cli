// 核心功能：获取用户资料（页面抓取为结构化字段；对外汇总接口返回纯文本）

import type { Page } from 'puppeteer-core';
export interface UserProfile {
  accountName: string;
  followingCount: string;
  fansCount: string;
  likesAndCollects: string;
  xhsAccountId: string;
  description: string;
  accountStatus: string;
}

export function validateUserProfile(profile: UserProfile | null): profile is UserProfile {
  if (!profile || typeof profile !== 'object') {
    return false;
  }
  if (!profile.accountName && !profile.fansCount && !profile.followingCount) {
    return false;
  }
  return true;
}

/** 供登录成功提示、toolImplementations 等复用 */
export function formatUserProfileText(profile: UserProfile): string {
  return [
    `昵称: ${profile.accountName || '—'}`,
    `状态: ${profile.accountStatus || '—'}`,
    `关注: ${profile.followingCount}  粉丝: ${profile.fansCount}  获赞与收藏: ${profile.likesAndCollects}`,
    `小红书账号: ${profile.xhsAccountId || '—'}`,
    profile.description ? `简介: ${profile.description}` : '简介: —',
  ].join('\n');
}

/** 创作者中心首页抓取资料（关注/粉丝等） */
export async function getCreatorUserProfile(page: Page): Promise<UserProfile> {
  await page.goto('https://creator.xiaohongshu.com/new/home', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return readUserProfile(page);
}

/** 只读取当前 DOM，不导航、不等待，避免打断登录页自身的跳转。 */
export async function readUserProfile(page: Page): Promise<UserProfile> {
  const profile = await page.evaluate((): UserProfile => {
    const p: UserProfile = {
      accountName: '',
      followingCount: '',
      fansCount: '',
      likesAndCollects: '',
      xhsAccountId: '',
      description: '',
      accountStatus: '',
    };
    const accountNameEl = document.querySelector('.account-name');
    if (accountNameEl) {
      p.accountName = (accountNameEl.textContent || '').trim();
    }
    const statusImg = document.querySelector('img[alt="account-status"]');
    if (statusImg) {
      p.accountStatus = statusImg.getAttribute('alt') || '';
    }
    const numericalEls = document.querySelectorAll('.numerical');
    if (numericalEls.length >= 3) {
      p.followingCount = (numericalEls[0].textContent || '').trim();
      p.fansCount = (numericalEls[1].textContent || '').trim();
      p.likesAndCollects = (numericalEls[2].textContent || '').trim();
    }
    const othersContainer = document.querySelector('.others.description-text');
    if (othersContainer) {
      const children = othersContainer.children;
      if (children.length > 0) {
        const accountText = (children[0].textContent || '').trim();
        if (accountText.includes('小红书账号:')) {
          p.xhsAccountId = accountText.replace('小红书账号:', '').trim();
        }
      }
      if (children.length > 2) {
        p.description = (children[2].textContent || '').trim();
      }
      if (!p.xhsAccountId) {
        const allText = othersContainer.textContent || '';
        const accountMatch = allText.match(/小红书账号:\s*(\d+)/);
        if (accountMatch) {
          p.xhsAccountId = accountMatch[1];
        }
      }
    }
    return p;
  });
  if (!validateUserProfile(profile)) {
    throw new Error('获取用户资料失败：页面元素未正确加载，请稍后重试');
  }
  return profile;
}

interface MainSiteMeResponse {
  success?: boolean;
  data?: {
    guest?: boolean;
    nickname?: string;
    desc?: string;
    red_id?: string;
  };
}

/** 主站发现页：通过 /user/me 判断登录并读取基础资料 */
export async function getMainSiteUserProfile(page: Page): Promise<UserProfile | null> {
  const me = await page.evaluate(async (): Promise<MainSiteMeResponse | null> => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch('https://edith.xiaohongshu.com/api/sns/web/v2/user/me', {
        credentials: 'include',
        signal: ctrl.signal,
      });
      return (await res.json()) as MainSiteMeResponse;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  });

  const data = me?.data;
  if (!data || data.guest !== false) {
    return null;
  }

  const profile: UserProfile = {
    accountName: (data.nickname ?? '').trim(),
    followingCount: '—',
    fansCount: '—',
    likesAndCollects: '—',
    xhsAccountId: (data.red_id ?? '').trim(),
    description: (data.desc ?? '').trim(),
    accountStatus: '主站已登录',
  };

  return validateUserProfile(profile) ? profile : null;
}

/** @deprecated 请使用 getCreatorUserProfile / getMainSiteUserProfile */
export const getUserProfile = getCreatorUserProfile;
