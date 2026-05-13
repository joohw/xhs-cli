import { ensureAppDataLayout } from '../config.js';
import {
  hasConfiguredAccounts,
  loadAccountsRegistry,
  pickAccountSlug,
} from './accountRegistry.js';
import type { ResolvedSession } from './sessionTypes.js';

/**
 * 解析本次命令使用的 Puppeteer userDataDir 与缓存前缀。
 *
 * 须已在 registry 中配置账号；`explicitAccount` 有值时优先使用，否则由 `pickAccountSlug` 使用
 * `currentAccount` 或唯一已配置账号。无法确定 slug 时抛错（不使用遗留全局 browser-data）。
 */
export function resolveSession(explicitAccount?: string): ResolvedSession {
  ensureAppDataLayout();
  const reg = loadAccountsRegistry();

  if (!hasConfiguredAccounts(reg)) {
    throw new Error('尚未配置任何账号。请先执行 xhs account add <name>。');
  }

  const slug = pickAccountSlug(reg, explicitAccount) ?? null;
  if (!slug) {
    throw new Error(
      '无法确定本次使用的账号。请使用：--account <slug>、或命令支持的位置参数 <slug>、或先执行 xhs account use <slug>（仅注册了一个账号时可省略）。',
    );
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
