import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  validatePostParams,
  validateImagePaths,
} from '../dist/toolset/postValidate.js';

describe('validatePostParams', () => {
  it('requires content at least 10 chars', () => {
    assert.throws(
      () => validatePostParams({ content: 'short' }),
      /不能少于10个字/,
    );
    assert.doesNotThrow(() =>
      validatePostParams({ content: '1234567890' }),
    );
  });

  it('limits title length', () => {
    assert.throws(
      () => validatePostParams({ content: '1234567890', title: 'x'.repeat(21) }),
      /标题长度不能超过20/,
    );
  });
});

describe('validateImagePaths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'xhs-img-'));
  const img = join(dir, 't.png');

  it('requires existing readable files', () => {
    writeFileSync(img, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    assert.doesNotThrow(() => validateImagePaths([img]));
    assert.throws(() => validateImagePaths([]), /至少需要一张图片/);
    assert.throws(
      () => validateImagePaths(['/nonexistent/xhs-cli-test.png']),
      /图片文件不存在/,
    );
    rmSync(dir, { recursive: true, force: true });
  });
});
