// 检查登录状态

import { Browser } from 'puppeteer';
import { isLoggedIn, getCookieTTL } from '../auth/cookie.js';
import { launchBrowser } from '../browser/browser.js';
import { login } from './login.js';


// 快速检查登录状态（基于 cookie 文件，无需启动浏览器）
function checkLoginStateFast(): { isLoggedIn: boolean; ttl: number | null } {
  const loggedIn = isLoggedIn();
  const ttl = getCookieTTL();
  return { isLoggedIn: loggedIn, ttl };
}


// 完整检查登录状态（启动浏览器验证，较慢但更准确）
async function checkLoginStateFull(): Promise<boolean> {
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser(true);
    const page = await browser.newPage();
    await page.goto('https://creator.xiaohongshu.com/new/home', {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
    const isLoggedIn = !isLoginPage && currentUrl.includes('creator.xiaohongshu.com');
    return isLoggedIn;
  } catch (error) {
    console.error('检查登录状态时出错:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


// 检查登录状态（主函数，优先使用快速检查，失败时调用 login）
async function checkLoginState(forceFullCheck: boolean = false): Promise<boolean> {
  if (forceFullCheck) {
    const isLoggedIn = await checkLoginStateFull();
    if (!isLoggedIn) {
      console.error('检查失败，尝试登录...\n');
      const loginSuccess = await login();
      if (!loginSuccess) {
        throw new Error('登录失败或超时');
      }
      console.error('✅ 登录成功\n');
      return true;
    }
    console.error('✅ 已登录\n');
    return isLoggedIn;
  }
  const { isLoggedIn: loggedIn, ttl } = checkLoginStateFast();
  if (loggedIn && ttl !== null && ttl > 0) {
    const hours = Math.floor(ttl / 3600);
    const minutes = Math.floor((ttl % 3600) / 60);
    if (hours > 0) {
      console.error(`✅ 已登录（剩余有效时间: ${hours}小时${minutes}分钟）\n`);
    } else {
      console.error(`✅ 已登录（剩余有效时间: ${minutes}分钟）\n`);
    }
    return true;
  }
  if (loggedIn && ttl === null) {
    const isLoggedIn = await checkLoginStateFull();
    if (!isLoggedIn) {
      console.error('检查失败，尝试登录...\n');
      const loginSuccess = await login();
      if (!loginSuccess) {
        throw new Error('登录失败或超时');
      }
      console.error('✅ 登录成功\n');
      return true;
    }
    console.error('✅ 已登录\n');
    return isLoggedIn;
  }
  console.error('未登录，尝试登录...\n');
  const loginSuccess = await login();
  if (!loginSuccess) {
    throw new Error('登录失败或超时');
  }
  console.error('✅ 登录成功\n');
  return true;
}


// 主函数
async function main() {
  try {
    const { isLoggedIn: loggedIn, ttl } = checkLoginStateFast();
    if (loggedIn && ttl !== null && ttl > 0) {
      const hours = Math.floor(ttl / 3600);
      const minutes = Math.floor((ttl % 3600) / 60);
      if (hours > 0) {
        console.error(`✅ 已登录（剩余有效时间: ${hours}小时${minutes}分钟）`);
      } else {
        console.error(`✅ 已登录（剩余有效时间: ${minutes}分钟）`);
      }
      process.exit(0);
    }
    if (loggedIn && ttl === null) {
      console.error('⚠️  Cookie 存在但无法确定过期时间，进行完整验证...');
      const isLoggedIn = await checkLoginStateFull();
      if (isLoggedIn) {
        console.error('✅ 已登录');
        process.exit(0);
      } else {
        console.error('检查失败，尝试登录...\n');
        const loginSuccess = await login();
        if (!loginSuccess) {
          console.error('❌ 登录失败或超时');
          process.exit(1);
        }
        console.error('✅ 登录成功');
        process.exit(0);
      }
    } else {
      console.error('未登录，尝试登录...\n');
      const loginSuccess = await login();
      if (!loginSuccess) {
        console.error('❌ 登录失败或超时');
        process.exit(1);
      }
      console.error('✅ 登录成功');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ 检查登录状态时出错:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  }
}



// 运行检查
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}


// 导出函数供其他模块使用
export {
  checkLoginState,
  checkLoginStateFast,
  checkLoginStateFull
};

