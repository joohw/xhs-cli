import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installIsolatedHome, removeIsolatedHome } from './helpers/isolatedHome.js';

const home = installIsolatedHome();

let appendPublishedRecord: typeof import('../dist/toolset/publishedRecords.js').appendPublishedRecord;
let listPublished: typeof import('../dist/toolset/publishedRecords.js').listPublished;
let formatPublishedList: typeof import('../dist/toolset/publishedRecords.js').formatPublishedList;

before(async () => {
  const config = await import('../dist/config.js');
  config.resetAppDataLayoutCacheForTests();
  const pub = await import('../dist/toolset/publishedRecords.js');
  appendPublishedRecord = pub.appendPublishedRecord;
  listPublished = pub.listPublished;
  formatPublishedList = pub.formatPublishedList;
});

beforeEach(async () => {
  const config = await import('../dist/config.js');
  config.resetAppDataLayoutCacheForTests();
});

after(() => {
  removeIsolatedHome(home);
});

describe('publishedRecords', () => {
  it('appends and lists by account', () => {
    appendPublishedRecord({
      account: 'a',
      title: 't1',
      content: 'c',
      images: [],
      publishedAt: '2026-01-01T00:00:00.000Z',
    });
    appendPublishedRecord({
      account: 'b',
      title: 't2',
      content: 'c',
      images: [],
      publishedAt: '2026-01-02T00:00:00.000Z',
    });
    assert.equal(listPublished('a').length, 1);
    assert.equal(listPublished('a')[0].title, 't1');
    assert.equal(listPublished().length, 2);
  });

  it('formats empty list', () => {
    assert.match(formatPublishedList([]), /暂无/);
  });
});
