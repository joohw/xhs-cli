// 使用 Puppeteer 实现小红书登录


import { Browser, Page } from 'puppeteer';
import { launchBrowser } from '../browser/browser.js';
import { getUserProfile } from './get_my_profile.js';
import { validateUserProfile, UserProfile } from '../types/userProfile.js';


// 等待登录完成
async function waitForLogin(page: Page, timeout: number = 180000): Promise<boolean> {
  const startTime = Date.now();
  let lastCheckUrl = page.url();
  const navigationPromises: Promise<any>[] = [];
  const navigationHandler = () => {
    const promise = page.waitForNavigation({
      waitUntil: 'domcontentloaded',
      timeout: 5000,
    }).catch(() => null);
    navigationPromises.push(promise);
  };
  page.on('framenavigated', navigationHandler);
  try {
    while (Date.now() - startTime < timeout) {
      try {
        // 检查浏览器和页面是否已断开连接
        if (page.isClosed() || !page.browser().isConnected()) {
          return false;
        }
        await Promise.race([
          ...navigationPromises,
          new Promise(resolve => setTimeout(resolve, 2000)),
        ]);
        // 清空已完成的导航 Promise
        navigationPromises.length = 0;
        // 等待页面稳定（网络请求完成）
        await new Promise(resolve => setTimeout(resolve, 2000));
        // 再次检查连接状态
        if (page.isClosed() || !page.browser().isConnected()) {
          return false;
        }
        // 检查当前页面URL
        const currentUrl = page.url();
        // 如果URL发生变化，说明可能发生了跳转（比如登录成功后的重定向）
        if (currentUrl !== lastCheckUrl) {
          lastCheckUrl = currentUrl;
          // 等待页面完全加载（等待网络请求完成）
          await new Promise(resolve => setTimeout(resolve, 3000));
          // 再次检查连接状态
          if (page.isClosed() || !page.browser().isConnected()) {
            return false;
          }
          // 如果当前不在登录页面，且在小红书域名下，尝试使用轻量方式检测
          const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
          if (!isLoginPage && currentUrl.includes('xiaohongshu.com')) {
            // 等待页面元素加载完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 使用 fetch 方式检测，不重新加载页面，避免刷新
            const canAccessCreator = await page.evaluate(async () => {
              try {
                const response = await fetch('https://creator.xiaohongshu.com/new/home', {
                  method: 'HEAD',
                  redirect: 'manual',
                });
                // 如果返回 200，说明可以访问（已登录）
                // 如果返回 302/301 等重定向，需要检查 Location header
                if (response.status === 200) {
                  return true;
                }
                if (response.status >= 300 && response.status < 400) {
                  const location = response.headers.get('location') || '';
                  // 如果重定向到登录页面，说明未登录
                  return !location.includes('/login') && !location.includes('/signin');
                }
                return false;
              } catch (e) {
                return false;
              }
            });
            // 如果能访问创作者中心，说明已登录
            if (canAccessCreator) {
              return true;
            }
          }
        }
        // URL 没有变化，继续等待
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        // 检查是否是浏览器关闭导致的错误
        if (e instanceof Error && (e.message.includes('Target closed') || e.message.includes('Session closed') || e.message.includes('Protocol error'))) {
          return false;
        }
        // 如果访问出错，可能是网络问题，继续等待
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return false;
  } finally {
    page.off('framenavigated', navigationHandler);
  }
}




// 主登录函数
async function login(): Promise<UserProfile | null> {
  let browser: Browser | null = null;
  try {
    // 登录时使用非无头模式，让用户可以看到并操作
    // 添加登录时需要的额外参数
    const loginExtraArgs = [
      '--disable-accelerated-2d-canvas',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-sync',
      '--disable-default-apps',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
    ];
    browser = await launchBrowser(false, loginExtraArgs);
    const page = await browser.newPage();
    await page.goto('https://creator.xiaohongshu.com/new/home', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    // 检查页面是否已关闭
    if (page.isClosed() || !page.browser().isConnected()) {
      console.error('❌ 浏览器已关闭，登录中断\n');
      return null;
    }
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
    if (!isLoginPage && currentUrl.includes('creator.xiaohongshu.com')) {
      // 再次检查页面连接状态
      if (page.isClosed() || !page.browser().isConnected()) {
        console.error('❌ 浏览器已关闭，登录中断\n');
        return null;
      }
      const userProfile = await getUserProfile(page);
      if (!validateUserProfile(userProfile)) {
        throw new Error('获取用户资料失败：返回的数据无效');
      }
      return userProfile;
    } else {
      console.error('⏰ 您有 120 秒时间完成登录\n');
      const loginSuccess = await waitForLogin(page, 120000);
      if (loginSuccess) {
        // 检查页面连接状态
        if (page.isClosed() || !page.browser().isConnected()) {
          console.error('❌ 浏览器已关闭，登录中断\n');
          return null;
        }
        const userProfile = await getUserProfile(page);
        return userProfile;
      } else {
        console.log('❌ 登录超时或失败\n');
        return null;
      }
    }
  } catch (error) {
    // 检查是否是浏览器关闭导致的错误
    if (error instanceof Error && (error.message.includes('Target closed') || error.message.includes('Session closed') || error.message.includes('Protocol error'))) {
      console.error('❌ 浏览器已关闭，登录中断\n');
    } else {
      console.error('❌ 登录过程出错:', error);
      if (error instanceof Error) {
        console.error('错误信息:', error.message);
      }
    }
    return null;
  } finally {
    if (browser) {
      try {
        // 检查浏览器是否已连接，避免重复关闭导致的错误
        if (browser.isConnected()) {
          await browser.close();
        }
      } catch (e) {
        // 忽略关闭浏览器时的错误（可能已经被用户关闭）
      }
    }
  }
}


// 导出登录函数
export { login };