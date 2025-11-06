// Cookie 管理工具
import type { Page } from 'puppeteer';


// 检查 cookie 是否过期（从 puppeteer page 读取）
export async function isCookieExpired(page: Page): Promise<boolean> {
    const cookies = await page.cookies('https://creator.xiaohongshu.com');
    if (!cookies || cookies.length === 0) {
        return true;
    }
    const now = Math.floor(Date.now() / 1000);
    let hasExpiredCookie = false;
    let hasValidExpiresCookie = false;
    for (const cookie of cookies) {
        if (cookie.expires && cookie.expires > 0) {
            hasValidExpiresCookie = true;
            if (cookie.expires < now) {
                hasExpiredCookie = true;
            }
        }
    }
    if (hasExpiredCookie) {
        return true;
    }
    if (hasValidExpiresCookie) {
        return false;
    }
    return false;
}


// 获取 cookie 剩余有效时间（秒），返回 null 表示无法确定或已过期
export async function getCookieTTL(page: Page): Promise<number | null> {
    const cookies = await page.cookies('https://creator.xiaohongshu.com');
    if (!cookies || cookies.length === 0) {
        return null;
    }
    const now = Math.floor(Date.now() / 1000);
    let minTTL: number | null = null;
    for (const cookie of cookies) {
        if (cookie.expires && cookie.expires > 0) {
            const ttl = cookie.expires - now;
            if (ttl < 0) {
                return null;
            }
            if (minTTL === null || ttl < minTTL) {
                minTTL = ttl;
            }
        }
    }
    return minTTL;
}
