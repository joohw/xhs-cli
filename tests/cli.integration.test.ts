import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { installIsolatedHome, removeIsolatedHome } from './helpers/isolatedHome.js';

const home = installIsolatedHome();
const cli = join(process.cwd(), 'dist/cli/index.js');

function run(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [cli, ...args], {
    env: { ...process.env, XHS_CLI_HOME: home },
    encoding: 'utf-8',
  });
  return {
    status: r.status,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

after(() => {
  removeIsolatedHome(home);
});

describe('CLI integration', () => {
  it('help exits 0', () => {
    const r = run(['help']);
    assert.equal(r.status, 0);
    assert.match(r.stderr, /xhs account use/);
  });

  it('draft command is removed', () => {
    const r = run(['draft']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /草稿功能已移除/);
  });

  it('account add / use / current flow', () => {
    let r = run(['account', 'add', 'test-acc']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /test-acc/);

    r = run(['account', 'use', 'test-acc']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /当前账号: test-acc/);

    r = run(['account', 'current']);
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), 'test-acc');
  });

  it('metrics without current account fails with hint', () => {
    run(['account', 'add', 'x']);
    run(['account', 'add', 'y']);
    const regPath = join(home, '.cache', 'accounts', 'registry.json');
    const reg = JSON.parse(readFileSync(regPath, 'utf-8')) as {
      currentAccount: string | null;
    };
    reg.currentAccount = null;
    writeFileSync(regPath, JSON.stringify(reg, null, 2), 'utf-8');
    const r = run(['metrics']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /未设置当前账号/);
  });

  it('metrics rejects positional account slug', () => {
    run(['account', 'add', 'x']);
    run(['account', 'use', 'x']);
    const r = run(['metrics', 'x']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /用法: metrics/);
  });

  it('post requires title and image', () => {
    run(['account', 'add', 'p']);
    run(['account', 'use', 'p']);
    const r = run(['post', '--content', '1234567890']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /post 需要 --title/);
  });
});
