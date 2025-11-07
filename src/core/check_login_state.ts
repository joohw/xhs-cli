// 检查登录状态
import { Browser } from 'puppeteer-core';
import { launchBrowser } from '../browser/browser.js';
import { isCookieExpired, getCookieTTL } from '../browser/cookie.js';


// 检查登录状态（轻量级，从浏览器实例读取 cookie）
export async function checkLoginState(): Promise<{ isLoggedIn: boolean; ttl: number | null }> {
    let browser: Browser | null = null;
    try {
        browser = await launchBrowser(true);
        const page = await browser.newPage();
        await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 5000 });
        const expired = await isCookieExpired(page);
        const ttl = expired ? null : await getCookieTTL(page);
        return { isLoggedIn: !expired, ttl };
    } catch (error) {
        return { isLoggedIn: false, ttl: null };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
