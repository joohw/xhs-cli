// src/cli/get_my_profile.ts
import { withLoggedInPage } from '../browser/browser.js';
import { checkLoginState } from './check_login_state.js';
import type { Page } from 'puppeteer';
import { UserProfile } from '../types/userProfile.js';
import { saveToCache, loadFromCache } from '../utils/cache.js';


// 用户资料获取函数
export async function getUserProfile(page: Page): Promise<UserProfile> {
    await page.goto('https://creator.xiaohongshu.com/new/home', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    return await page.evaluate(() => {
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
}


// 序列化用户资料为文本格式
function serializeUserProfile(profile: UserProfile): string {
    const lines: string[] = [];
    lines.push(`👤 用户资料信息`);
    lines.push('='.repeat(40));
    lines.push(`   账户名称: ${profile.accountName}`);
    lines.push(`   账户状态: ${profile.accountStatus}`);
    lines.push(`   关注数量: ${profile.followingCount}`);
    lines.push(`   粉丝数量: ${profile.fansCount}`);
    lines.push(`   获赞与收藏: ${profile.likesAndCollects}`);
    lines.push(`   小红书ID: ${profile.xhsAccountId || '未获取到'}`);
    lines.push(`   个人描述: ${profile.description || '未获取到'}`);
    lines.push('='.repeat(40));
    return lines.join('\n');
}


// 主函数
export async function getMyProfileCommand(): Promise<void> {
    try {
        console.error('🔍 检查登录状态...\n');
        const isLoggedIn = await checkLoginState();
        if (!isLoggedIn) {
            console.error('❌ 未登录，请先运行: npm run xhs login');
            process.exit(1);
            return;
        }
    } catch (error) {
        console.error('❌ 登录失败或超时:', error instanceof Error ? error.message : error);
        process.exit(1);
        return;
    }
    try {
        // 先检查缓存（缓存有效期为1小时）
        const cachedProfile = loadFromCache<UserProfile>('user_profile.json', 3600);
        if (cachedProfile) {
            console.error('📝 使用缓存的用户资料...\n');
            console.error(serializeUserProfile(cachedProfile));
            return;
        }
        console.error('📝 获取最新用户资料...\n');
        const userProfile = await withLoggedInPage(async (page) => {
            return await getUserProfile(page);
        });
        // 保存到缓存
        saveToCache('user_profile.json', userProfile);
        console.error('💾 用户资料已缓存\n');
        console.error(serializeUserProfile(userProfile));
    } catch (error) {
        console.error('❌ 获取用户资料失败:', error);
        if (error instanceof Error) {
            console.error('错误信息:', error.message);
        }
        process.exit(1);
    }
}



// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    getMyProfileCommand().catch(console.error);
}