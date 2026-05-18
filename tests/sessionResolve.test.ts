import { describe, it, before, after, beforeEach } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { installIsolatedHome, removeIsolatedHome } from './helpers/isolatedHome.js';

const home = installIsolatedHome();

let resolveAccountSlug: typeof import('../dist/toolset/sessionResolve.js').resolveAccountSlug;
let resolveSession: typeof import('../dist/toolset/sessionResolve.js').resolveSession;
let addStoredAccount: typeof import('../dist/toolset/accountRegistry.js').addStoredAccount;
let setCurrentAccount: typeof import('../dist/toolset/accountRegistry.js').setCurrentAccount;
let saveAccountsRegistry: typeof import('../dist/toolset/accountRegistry.js').saveAccountsRegistry;
let loadAccountsRegistry: typeof import('../dist/toolset/accountRegistry.js').loadAccountsRegistry;
let resetAppDataLayoutCacheForTests: typeof import('../dist/config.js').resetAppDataLayoutCacheForTests;
let ACCOUNTS_REGISTRY_PATH: string;
let ACCOUNTS_ROOT: string;

before(async () => {
  const config = await import('../dist/config.js');
  resetAppDataLayoutCacheForTests = config.resetAppDataLayoutCacheForTests;
  ACCOUNTS_REGISTRY_PATH = config.ACCOUNTS_REGISTRY_PATH;
  ACCOUNTS_ROOT = config.ACCOUNTS_ROOT;
  resetAppDataLayoutCacheForTests();
  const session = await import('../dist/toolset/sessionResolve.js');
  resolveAccountSlug = session.resolveAccountSlug;
  resolveSession = session.resolveSession;
  const reg = await import('../dist/toolset/accountRegistry.js');
  addStoredAccount = reg.addStoredAccount;
  setCurrentAccount = reg.setCurrentAccount;
  saveAccountsRegistry = reg.saveAccountsRegistry;
  loadAccountsRegistry = reg.loadAccountsRegistry;
});

after(() => {
  removeIsolatedHome(home);
});

function resetRegistry(): void {
  resetAppDataLayoutCacheForTests();
  mkdirSync(ACCOUNTS_ROOT, { recursive: true });
  writeFileSync(
    ACCOUNTS_REGISTRY_PATH,
    JSON.stringify({ version: 1, currentAccount: null, accounts: {} }, null, 2),
    'utf-8',
  );
}

beforeEach(() => {
  resetRegistry();
});

describe('resolveAccountSlug', () => {
  it('throws when no accounts configured', () => {
    assert.throws(
      () => resolveAccountSlug(),
      /尚未配置任何账号/,
    );
  });

  it('uses --account when explicit', () => {
    addStoredAccount({ name: 'a' });
    addStoredAccount({ name: 'b' });
    setCurrentAccount('a');
    assert.equal(resolveAccountSlug('b'), 'b');
  });

  it('uses currentAccount when no explicit', () => {
    addStoredAccount({ name: 'a' });
    addStoredAccount({ name: 'b' });
    setCurrentAccount('b');
    assert.equal(resolveAccountSlug(), 'b');
  });

  it('does not fall back to single account when current is unset', () => {
    addStoredAccount({ name: 'only' });
    const reg = loadAccountsRegistry();
    reg.currentAccount = null;
    saveAccountsRegistry(reg);
    assert.throws(
      () => resolveAccountSlug(),
      /未设置当前账号/,
    );
  });

  it('first added account becomes current automatically', () => {
    addStoredAccount({ name: 'first' });
    assert.equal(resolveAccountSlug(), 'first');
  });

  it('resolveSession returns account and paths', () => {
    addStoredAccount({ name: 'u1' });
    const s = resolveSession();
    assert.equal(s.account, 'u1');
    assert.match(s.browserUserDataDir, /accounts\/u1\/browser-data$/);
    assert.equal(s.cachePathPrefix, 'accounts/u1/');
  });
});
