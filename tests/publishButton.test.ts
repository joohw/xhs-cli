import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  findPublishButton,
  isPublishButtonReady,
  PUBLISH_FOOTER_SELECTORS,
} from '../dist/toolset/publishButton.js';

function footerHtml(): string {
  return `
    <motion.div class="publish-page-publish-btn">
      <button type="button" class="ce-btn white">暂存离开</button>
      <button type="button" class="ce-btn bg-red">发布</button>
    </motion.div>
  `;
}

describe('publishButton', () => {
  it('finds publish button inside footer only', () => {
    const dom = new JSDOM(`<body>${footerHtml()}</body>`);
    const doc = dom.window.document;
    const btn = findPublishButton(doc);
    assert.ok(btn);
    assert.equal(btn?.textContent?.trim(), '发布');
    assert.ok(btn?.classList.contains('bg-red'));
  });

  it('does not match 暂存离开 as publish', () => {
    const dom = new JSDOM(`<body>${footerHtml()}</body>`);
    const found = findPublishButton(dom.window.document);
    assert.ok(found);
    assert.doesNotMatch(found?.className ?? '', /\bwhite\b/);
    assert.equal(found?.textContent?.replace(/\s+/g, ''), '发布');
  });

  it('ignores red buttons outside footer', () => {
    const dom = new JSDOM(`
      <body>
        <button class="ce-btn bg-red">发布</button>
        ${footerHtml()}
      </body>
    `);
    const buttons = dom.window.document.querySelectorAll(
      PUBLISH_FOOTER_SELECTORS[0],
    );
    assert.equal(buttons.length, 1);
    assert.ok(isPublishButtonReady(dom.window.document));
  });

  it('skips disabled publish button', () => {
    const dom = new JSDOM(`
      <body>
        <div class="publish-page-publish-btn">
          <button type="button" class="ce-btn bg-red" disabled>发布</button>
        </div>
      </body>
    `);
    assert.equal(findPublishButton(dom.window.document), null);
  });
});
