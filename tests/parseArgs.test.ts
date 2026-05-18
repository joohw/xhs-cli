import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOpts,
  resolvePostPublish,
  accountFromOpts,
  collectImagePaths,
} from '../dist/cli/parseArgs.js';

describe('parseOpts', () => {
  it('parses flags and key=value', () => {
    const { opts, flags, rest } = parseOpts([
      '--title',
      'hi',
      '--publish=true',
      '--account',
      'a',
      'extra',
    ]);
    assert.equal(opts.title, 'hi');
    assert.equal(opts.publish, 'true');
    assert.equal(opts.account, 'a');
    assert.deepEqual(rest, ['extra']);
    assert.equal(flags.size, 0);
  });

  it('parses boolean flag without value', () => {
    const { flags } = parseOpts(['--publish']);
    assert.ok(flags.has('publish'));
  });
});

describe('resolvePostPublish', () => {
  it('respects --publish=true|false', () => {
    assert.equal(resolvePostPublish({ publish: 'true' }, new Set()), true);
    assert.equal(resolvePostPublish({ publish: 'false' }, new Set(['publish'])), false);
  });

  it('uses --publish flag when no value', () => {
    assert.equal(resolvePostPublish({}, new Set(['publish'])), true);
  });
});

describe('accountFromOpts', () => {
  it('returns trimmed account or undefined', () => {
    assert.equal(accountFromOpts({ account: '  x  ' }), 'x');
    assert.equal(accountFromOpts({}), undefined);
  });
});

describe('collectImagePaths', () => {
  it('collects all --image paths', () => {
    assert.deepEqual(
      collectImagePaths(['--image', '/a.png', '--title', 't', '--image', '/b.png']),
      ['/a.png', '/b.png'],
    );
  });
});
