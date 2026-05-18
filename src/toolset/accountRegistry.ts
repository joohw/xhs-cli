import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  ACCOUNTS_REGISTRY_PATH,
  ACCOUNTS_ROOT,
  CACHE_DIR,
  ensureAppDataLayout,
} from '../config.js';

export const ACCOUNT_SLUG_RE = /^[a-zA-Z0-9._-]+$/;

export type StoredAccount = {
  name: string;
  createdAt: string;
  updatedAt: string;
  browserDataDir: string;
  policyPath: string;
};

export type AccountsRegistryFile = {
  version: 1;
  /** 当前默认账号；未指定 `--account` 时使用（可用 `xhs account use` 切换） */
  currentAccount: string | null;
  accounts: Record<string, StoredAccount>;
};

export function validateAccountSlug(name: string): void {
  const n = name.trim();
  if (!n) {
    throw new Error('账号名不能为空');
  }
  if (!ACCOUNT_SLUG_RE.test(n)) {
    throw new Error(
      `账号名须匹配 [a-zA-Z0-9._-]+，当前为: ${JSON.stringify(name)}`,
    );
  }
}

function defaultRegistry(): AccountsRegistryFile {
  return {
    version: 1,
    currentAccount: null,
    accounts: {},
  };
}

function normalizeStoredAccount(slug: string, raw: unknown): StoredAccount {
  const r = raw as Record<string, unknown>;
  const now = new Date().toISOString();
  const root = join(CACHE_DIR, 'accounts', slug);
  const browserDefault = join(root, 'browser-data');
  const policyDefault = join(root, 'policy.md');
  return {
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : slug,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
    browserDataDir:
      typeof r.browserDataDir === 'string' && r.browserDataDir.trim()
        ? r.browserDataDir.trim()
        : browserDefault,
    policyPath:
      typeof r.policyPath === 'string' && r.policyPath.trim()
        ? r.policyPath.trim()
        : policyDefault,
  };
}

export function loadAccountsRegistry(): AccountsRegistryFile {
  ensureAppDataLayout();
  if (!existsSync(ACCOUNTS_REGISTRY_PATH)) {
    return defaultRegistry();
  }
  try {
    const raw = readFileSync(ACCOUNTS_REGISTRY_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as AccountsRegistryFile;
    if (
      parsed.version !== 1 ||
      typeof parsed.accounts !== 'object' ||
      parsed.accounts === null
    ) {
      return defaultRegistry();
    }
    const accounts: Record<string, StoredAccount> = {};
    for (const slug of Object.keys(parsed.accounts)) {
      accounts[slug] = normalizeStoredAccount(slug, parsed.accounts[slug]);
    }
    return {
      version: 1,
      currentAccount:
        typeof parsed.currentAccount === 'string' && parsed.currentAccount.trim()
          ? parsed.currentAccount.trim()
          : null,
      accounts,
    };
  } catch {
    return defaultRegistry();
  }
}

function atomicWriteJson(path: string, data: AccountsRegistryFile): void {
  const dir = ACCOUNTS_ROOT;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmp, path);
}

export function saveAccountsRegistry(reg: AccountsRegistryFile): void {
  ensureAppDataLayout();
  atomicWriteJson(ACCOUNTS_REGISTRY_PATH, reg);
}

/** 是否为「已配置至少一个多账号」 */
export function hasConfiguredAccounts(reg: AccountsRegistryFile): boolean {
  return Object.keys(reg.accounts).length > 0;
}

const DEFAULT_POLICY = `<!-- xhs-cli 默认策略模板，可自行修改 -->

# 发帖与运营策略

- **合规**：遵守法律法规与小红书社区规范。
- **风格**：人设与选题与账号定位一致。
- **发布**：仅人工确认后正式发布。

与本账号相关的备注可写在下文：

`;

export function accountRootDir(slug: string): string {
  return join(CACHE_DIR, 'accounts', slug);
}

/** 写入 policy.md（若缺失） */
export function ensureDefaultPolicy(policyPath: string): void {
  if (existsSync(policyPath)) {
    return;
  }
  const dir = join(policyPath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(policyPath, DEFAULT_POLICY.trimStart(), 'utf-8');
}

export function addStoredAccount(opts: { name: string }): StoredAccount {
  validateAccountSlug(opts.name);
  const slug = opts.name.trim();
  const reg = loadAccountsRegistry();
  if (reg.accounts[slug]) {
    throw new Error(`账号 ${slug} 已存在`);
  }
  ensureAppDataLayout();
  const root = accountRootDir(slug);
  const browserDataDir = join(root, 'browser-data');
  const policyPath = join(root, 'policy.md');
  mkdirSync(browserDataDir, { recursive: true });
  ensureDefaultPolicy(policyPath);
  const now = new Date().toISOString();
  const row: StoredAccount = {
    name: slug,
    createdAt: now,
    updatedAt: now,
    browserDataDir,
    policyPath,
  };
  reg.accounts[slug] = row;
  const keys = Object.keys(reg.accounts);
  if (
    keys.length === 1 ||
    !reg.currentAccount ||
    !reg.accounts[reg.currentAccount]
  ) {
    reg.currentAccount = slug;
  }
  saveAccountsRegistry(reg);
  return row;
}

/** 将 registry 中的当前账号设为 `slug` */
export function setCurrentAccount(slug: string): void {
  validateAccountSlug(slug);
  const reg = loadAccountsRegistry();
  if (!reg.accounts[slug]) {
    throw new Error(`未知账号: ${slug}。可用 xhs account list 查看已配置账号。`);
  }
  reg.currentAccount = slug;
  saveAccountsRegistry(reg);
}

/** 返回 registry 中记录的当前账号（不校验是否存在） */
export function getCurrentAccount(): string | null {
  const reg = loadAccountsRegistry();
  const cur = reg.currentAccount?.trim();
  return cur && reg.accounts[cur] ? cur : null;
}

export function getStoredAccountOrThrow(slug: string): StoredAccount {
  const reg = loadAccountsRegistry();
  const a = reg.accounts[slug];
  if (!a) {
    throw new Error(`未知账号: ${slug}`);
  }
  return a;
}

export function formatAccountListLines(): string {
  const reg = loadAccountsRegistry();
  const keys = Object.keys(reg.accounts).sort();
  if (keys.length === 0) {
    return '尚未配置账号。请先执行 xhs account add <name>。';
  }
  const cur = getCurrentAccount();
  const lines: string[] = [];
  for (const k of keys) {
    const a = reg.accounts[k];
    const mark = k === cur ? ' *' : '';
    lines.push(`${a.name}${mark}\t会话:${a.browserDataDir}`);
  }
  lines.push('');
  if (cur) {
    lines.push(`当前账号: ${cur}（列表中带 *）。切换: xhs account use <name>`);
  } else {
    lines.push('未设置当前账号。请执行: xhs account use <name>');
  }
  lines.push('临时指定: --account <slug>。');
  return lines.join('\n');
}

export function formatShowAccount(slug: string): string {
  const a = getStoredAccountOrThrow(slug);
  return [
    `name: ${a.name}`,
    `createdAt: ${a.createdAt}`,
    `updatedAt: ${a.updatedAt}`,
    `browserDataDir: ${a.browserDataDir}`,
    `policyPath: ${a.policyPath}`,
  ].join('\n');
}
