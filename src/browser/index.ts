// 浏览器：CDP 连接与会话（统一出口）
import { BROWSER_USER_DATA_DIR, ensureAppDataLayout } from '../config.js';

export {
  hideAgentOperatingIndicator,
  showAgentOperatingIndicator,
  SKIP_AGENT_OPERATING_OVERLAY,
} from './agent_operating_indicator.js';
export {
  connectBrowser,
  remoteDebuggingPortForUserDataDir,
  wasLastChromeLaunchHeadless,
} from './cdp_browser.js';
export type { ConnectBrowserOptions } from './cdp_browser.js';
export {
  detachBrowserSession,
  disconnectBrowserSession,
  ensureAndGetBrowser,
  ensureBrowserSession,
  getBrowserRef,
  getPageRef,
  getSessionUserDataDir,
  setSessionPage,
} from './browser_session.js';
export type { EnsureSessionOptions } from './browser_session.js';
export { withXhsSessionPage, CREATOR_HOME_URL, isLoginUrl } from './xhs_session_page.js';

export function getUserDataDir(override?: string): string {
  ensureAppDataLayout();
  return override ?? BROWSER_USER_DATA_DIR;
}

/** @deprecated 请使用 ensureBrowserSession / withXhsSessionPage */
export async function launchBrowser(
  headless: boolean = true,
  extraArgs: string[] = [],
  userDataDirOverride?: string,
) {
  const { connectBrowser } = await import('./cdp_browser.js');
  return connectBrowser({
    headless,
    extraArgs,
    userDataDir: getUserDataDir(userDataDirOverride),
  });
}

/** @deprecated 请使用 withXhsSessionPage */
export async function withLoggedInPage<T>(
  callback: (page: import('puppeteer-core').Page) => Promise<T>,
  browserUserDataDir?: string,
): Promise<T> {
  const { withXhsSessionPage } = await import('./xhs_session_page.js');
  return withXhsSessionPage(callback, {
    userDataDir: getUserDataDir(browserUserDataDir),
    headless: process.env.XHS_BROWSER_HEADLESS === 'true',
  });
}
