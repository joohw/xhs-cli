import { BROWSER_USER_DATA_DIR, ensureAppDataLayout } from '../config.js';
import {
  hasConfiguredAccounts,
  loadAccountsRegistry,
} from './accountRegistry.js';
import type { ResolvedSession } from './sessionTypes.js';

/**
 * 解析本次命令使用的 Puppeteer userDataDir 与缓存前缀。
 *
 * - 未创建任何多账号：始终使用遗留 `browser-data`，缓存无前缀。
 * - 已有多账号且无 `explicitAccount` 且无 current：仍用遗留路径（兼容老用户）。
 * - 指定 `explicitAccount` 或非空 currentAccount：使用对应账号目录与 `accounts/<slug>/` 缓存前缀。
 */
export function resolveSession(explicitAccount?: string): ResolvedSession {
  ensureAppDataLayout();
  const reg = loadAccountsRegistry();
  const opt = explicitAccount?.trim();

  if (!hasConfiguredAccounts(reg)) {
    if (opt) {
      throw new Error(
        '尚未配置任何多账号会话。请先执行 xhs account add <name>，或去掉 --account 使用默认 ~/.xhs-cli/.cache/browser-data 。',
      );
    }
    return {
      browserUserDataDir: BROWSER_USER_DATA_DIR,
      cachePathPrefix: '',
    };
  }

  const slug =
    opt && opt.length > 0 ? opt : reg.currentAccount && reg.currentAccount.length > 0
      ? reg.currentAccount
      : null;

  if (!slug) {
    return {
      browserUserDataDir: BROWSER_USER_DATA_DIR,
      cachePathPrefix: '',
    };
  }

  const acc = reg.accounts[slug];
  if (!acc) {
    throw new Error(`未知账号: ${slug}。可用 xhs account list 查看已配置账号。`);
  }

  return {
    browserUserDataDir: acc.browserDataDir,
    cachePathPrefix: `accounts/${slug}/`,
  };
}
