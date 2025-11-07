// 浏览器工具模块 - 支持无头模式访问
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';


// 查找系统 Chrome 路径（跨平台支持）
function findChromePath(): string | null {
  // 优先使用环境变量指定的路径
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const os = platform();
  let possiblePaths: string[] = [];
  if (os === 'win32') {
    // Windows 路径
    possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    ];
  } else if (os === 'darwin') {
    // macOS 路径
    possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      join(homedir(), 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
    ];
  } else {
    // Linux 路径
    possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    ];
  }
  for (const path of possiblePaths) {
    if (path && existsSync(path)) {
      return path;
    }
  }
  return null;
}


// 获取统一的用户数据目录（确保所有浏览器实例共享cookie）
export function getUserDataDir(): string {
  return join(homedir(), '.xhs-mcp', 'browser-data');
}

// 启动浏览器（支持无头模式）
export async function launchBrowser(headless: boolean = true, extraArgs: string[] = []): Promise<Browser> {
  const chromePath = findChromePath();
  const userDataDir = getUserDataDir();
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true });
  }
  // 基础参数
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
    '--disable-restore-session-state',
    '--disable-session-crashed-bubble',
    '--disable-infobars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--enable-features=NetworkService,NetworkServiceInProcess',
  ];
  // 如果找到了 Chrome 路径，使用它；否则让 Puppeteer 自动查找
  const launchOptions: any = {
    headless: headless,
    userDataDir: userDataDir,
    args: [...baseArgs, ...extraArgs],
    defaultViewport: headless ? { width: 1280, height: 720 } : null,
    // 确保浏览器进程正确关闭，以便保存cookie
    handleSIGINT: true,
    handleSIGTERM: true,
    handleSIGHUP: true,
  };
  if (chromePath) {
    launchOptions.executablePath = chromePath;
  } else {
    // 如果找不到系统浏览器，尝试使用 puppeteer 的内置方法查找
    // 注意：如果设置了 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD，这里可能会失败
    try {
      const executablePath = puppeteer.executablePath();
      if (executablePath && existsSync(executablePath)) {
        launchOptions.executablePath = executablePath;
      }
    } catch (e) {
      // 忽略错误，继续尝试启动
    }
  }
  try {
    return await puppeteer.launch(launchOptions);
  } catch (error) {
    // 如果启动失败，给出清晰的错误提示
    if (error instanceof Error) {
      if (error.message.includes('Executable doesn\'t exist') || error.message.includes('Could not find browser')) {
        throw new Error(
          '未找到浏览器。请确保已安装 Chrome/Chromium 浏览器，或通过环境变量 CHROME_PATH 指定浏览器路径。\n' +
          '例如：export CHROME_PATH="/path/to/chrome" (Linux/Mac) 或 set CHROME_PATH="C:\\path\\to\\chrome.exe" (Windows)'
        );
      }
    }
    throw error;
  }
}


// 创建已登录的页面（无头模式）
export async function createLoggedInPage(): Promise<Page> {
  const browser = await launchBrowser(true);
  const page = await browser.newPage();
  // 访问创作者中心首页验证登录状态
  await page.goto('https://creator.xiaohongshu.com/new/home', {
    waitUntil: 'domcontentloaded',
    timeout: 10000,
  });
  const currentUrl = page.url();
  const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
  if (isLoginPage) {
    await browser.close();
    throw new Error('未登录，请先运行 npm run cli login 进行登录');
  }
  return page;
}



// 执行页面操作（自动管理浏览器生命周期）
export async function withBrowser<T>(
  headless: boolean,
  callback: (page: Page) => Promise<T>
): Promise<T> {
  const browser = await launchBrowser(headless);
  try {
    const page = await browser.newPage();
    return await callback(page);
  } finally {
    await browser.close();
  }
}



// 执行已登录的页面操作（无头模式，自动验证登录状态）
export async function withLoggedInPage<T>(
  callback: (page: Page) => Promise<T>
): Promise<T> {
  const browser = await launchBrowser(true);
  try {
    const page = await browser.newPage();
    await page.goto('https://creator.xiaohongshu.com/new/home', {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
    if (isLoginPage) {
      throw new Error('未登录，请先运行 npm run cli login 进行登录');
    }
    return await callback(page);
  } finally {
    await browser.close();
  }
}
