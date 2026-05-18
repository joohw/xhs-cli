import { ensureAppDataLayout } from '../config.js';
import {
  hasConfiguredAccounts,
  loadAccountsRegistry,
} from './accountRegistry.js';
import type { ResolvedSession } from './sessionTypes.js';

/**
 * 解析本次命令使用的账号 slug。
 *
 * 优先级：`--account` 显式指定 → registry `currentAccount`（须已通过 `xhs account use` 设置）。
 */
export function resolveAccountSlug(explicitAccount?: string): string {
  ensureAppDataLayout();
  const reg = loadAccountsRegistry();

  if (!hasConfiguredAccounts(reg)) {
    throw new Error('尚未配置任何账号。请先执行 xhs account add <name>。');
  }

  const explicit = explicitAccount?.trim();
  if (explicit) {
    if (!reg.accounts[explicit]) {
      throw new Error(`未知账号: ${explicit}。可用 xhs account list 查看已配置账号。`);
    }
    return explicit;
  }

  const current = reg.currentAccount?.trim();
  if (current && reg.accounts[current]) {
    return current;
  }

  throw new Error(
    '未设置当前账号。请先执行 xhs account use <slug>，或使用 --account <slug> 临时指定。',
  );
}

/**
 * 解析本次命令使用的 Puppeteer userDataDir 与缓存前缀。
 */
export function resolveSession(explicitAccount?: string): ResolvedSession {
  const slug = resolveAccountSlug(explicitAccount);
  const acc = loadAccountsRegistry().accounts[slug];
  return {
    account: slug,
    browserUserDataDir: acc.browserDataDir,
    cachePathPrefix: `accounts/${slug}/`,
  };
}
