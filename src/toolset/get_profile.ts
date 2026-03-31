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

/** 在当前页抓取用户资料（供 login 等复用） */
export async function getUserProfile(page: Page): Promise<UserProfile> {
  await page.goto('https://creator.xiaohongshu.com/new/home', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const profile = await page.evaluate((): UserProfile => {
    const p: UserProfile = {
      accountName: '',
      followingCount: '0',
      fansCount: '0',
      likesAndCollects: '0',
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
