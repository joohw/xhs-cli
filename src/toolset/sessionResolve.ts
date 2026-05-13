import { ensureAppDataLayout } from '../config.js';
import {
  hasConfiguredAccounts,
  loadAccountsRegistry,
} from './accountRegistry.js';
import type { ResolvedSession } from './sessionTypes.js';

/**
 * 解析本次命令使用的 Puppeteer userDataDir 与缓存前缀。
 *
 * 须已在 registry 中配置账号，且 **`explicitAccount` 必须为非空 slug**（由 CLI 的 `--account` 或位置参数传入）。
 * 不使用注册表中的默认字段推断账号。无法确定 slug 时抛错（不使用遗留全局 browser-data）。
 */
export function resolveSession(explicitAccount?: string): ResolvedSession {
  ensureAppDataLayout();
  const reg = loadAccountsRegistry();

  if (!hasConfiguredAccounts(reg)) {
    throw new Error('尚未配置任何账号。请先执行 xhs account add <name>。');
  }

  const slug = explicitAccount?.trim() || null;
  if (!slug) {
    throw new Error(
      '无法确定本次使用的账号。每次调用须提供 --account <slug> 或该命令支持的位置参数 <slug>。',
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
