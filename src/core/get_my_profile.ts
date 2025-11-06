// src/core/get_my_profile.ts
// 核心功能：获取用户资料


import { withLoggedInPage } from '../browser/browser.js';
import type { Page } from 'puppeteer';
import { UserProfile } from '../types/userProfile.js';
import { saveToCache, loadFromCache } from '../utils/cache.js';


// 验证用户资料是否有效
function validateProfile(profile: UserProfile | null): profile is UserProfile {
    if (!profile) {
        return false;
    }
    if (typeof profile !== 'object') {
        return false;
    }
    if (!profile.accountName && !profile.fansCount && !profile.followingCount) {
        return false;
    }
    return true;
}


// 用户资料获取函数
export async function getUserProfile(page: Page): Promise<UserProfile> {
    await page.goto('https://creator.xiaohongshu.com/new/home', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    const profile = await page.evaluate(() => {
        const profile: UserProfile = {
            accountName: '',
            followingCount: '0',
            fansCount: '0',
            likesAndCollects: '0',
            xhsAccountId: '',
            description: '',
            accountStatus: ''
        };
        // 获取账户名
        const accountNameEl = document.querySelector('.account-name');
        if (accountNameEl) {
            profile.accountName = (accountNameEl.textContent || '').trim();
        }
        // 获取账户状态
        const statusImg = document.querySelector('img[alt="account-status"]');
        if (statusImg) {
            profile.accountStatus = statusImg.getAttribute('alt') || '';
        }
        // 获取关注数、粉丝数、获赞与收藏
        const numericalEls = document.querySelectorAll('.numerical');
        if (numericalEls.length >= 3) {
            profile.followingCount = (numericalEls[0].textContent || '').trim();
            profile.fansCount = (numericalEls[1].textContent || '').trim();
            profile.likesAndCollects = (numericalEls[2].textContent || '').trim();
        }
        // 获取小红书账号和描述
        const othersContainer = document.querySelector('.others.description-text');
        if (othersContainer) {
            const children = othersContainer.children;
            // 第一个子元素是小红书账号
            if (children.length > 0) {
                const accountText = (children[0].textContent || '').trim();
                if (accountText.includes('小红书账号:')) {
                    profile.xhsAccountId = accountText.replace('小红书账号:', '').trim();
                }
            }
            // 第三个子元素是描述
            if (children.length > 2) {
                profile.description = (children[2].textContent || '').trim();
            }
            // 备选方案：通过文本内容查找
            if (!profile.xhsAccountId) {
                const allText = othersContainer.textContent || '';
                const accountMatch = allText.match(/小红书账号:\s*(\d+)/);
                if (accountMatch) {
                    profile.xhsAccountId = accountMatch[1];
                }
            }
        }
        return profile;
    });
    if (!validateProfile(profile)) {
        throw new Error('获取用户资料失败：页面元素未正确加载，请稍后重试');
    }
    return profile;
}



// 核心函数：获取用户资料（返回原始数据）
export async function getMyProfile(): Promise<UserProfile> {
    const cachedProfile = loadFromCache<UserProfile>('user_profile.json', 3600);
    if (cachedProfile && validateProfile(cachedProfile)) {
        return cachedProfile;
    }
    try {
        const userProfile = await withLoggedInPage(async (page) => {
            return await getUserProfile(page);
        });
        if (!validateProfile(userProfile)) {
            throw new Error('获取用户资料失败：返回的数据无效');
        }
        saveToCache('user_profile.json', userProfile);
        return userProfile;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`获取用户资料失败：${error.message}`);
        }
        throw new Error('获取用户资料失败：未知错误');
    }
}




