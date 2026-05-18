import { describe, it, before, after, beforeEach } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { installIsolatedHome, removeIsolatedHome } from './helpers/isolatedHome.js';

const home = installIsolatedHome();

let validateAccountSlug: typeof import('../dist/toolset/accountRegistry.js').validateAccountSlug;
let addStoredAccount: typeof import('../dist/toolset/accountRegistry.js').addStoredAccount;
let setCurrentAccount: typeof import('../dist/toolset/accountRegistry.js').setCurrentAccount;
let getCurrentAccount: typeof import('../dist/toolset/accountRegistry.js').getCurrentAccount;
let formatAccountListLines: typeof import('../dist/toolset/accountRegistry.js').formatAccountListLines;
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
  const reg = await import('../dist/toolset/accountRegistry.js');
  validateAccountSlug = reg.validateAccountSlug;
  addStoredAccount = reg.addStoredAccount;
  setCurrentAccount = reg.setCurrentAccount;
  getCurrentAccount = reg.getCurrentAccount;
  formatAccountListLines = reg.formatAccountListLines;
  loadAccountsRegistry = reg.loadAccountsRegistry;
});

after(() => {
  removeIsolatedHome(home);
});

beforeEach(() => {
  resetAppDataLayoutCacheForTests();
  mkdirSync(ACCOUNTS_ROOT, { recursive: true });
  writeFileSync(
    ACCOUNTS_REGISTRY_PATH,
    JSON.stringify({ version: 1, currentAccount: null, accounts: {} }, null, 2),
    'utf-8',
  );
});

describe('validateAccountSlug', () => {
  it('accepts valid slugs', () => {
    assert.doesNotThrow(() => validateAccountSlug('joo-main'));
    assert.doesNotThrow(() => validateAccountSlug('acc_1'));
  });

  it('rejects invalid slugs', () => {
    assert.throws(() => validateAccountSlug(''), /不能为空/);
    assert.throws(() => validateAccountSlug('有中文'), /须匹配/);
  });
});

describe('current account', () => {
  it('sets current via account use', () => {
    addStoredAccount({ name: 'a' });
    addStoredAccount({ name: 'b' });
    setCurrentAccount('b');
    assert.equal(getCurrentAccount(), 'b');
    const reg = loadAccountsRegistry();
    assert.equal(reg.currentAccount, 'b');
  });

  it('lists current with asterisk marker', () => {
    addStoredAccount({ name: 'a' });
    addStoredAccount({ name: 'b' });
    setCurrentAccount('b');
    const text = formatAccountListLines();
    assert.match(text, /b \*/);
    assert.match(text, /当前账号: b/);
  });
});
