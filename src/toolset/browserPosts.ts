import type { Page } from 'puppeteer-core';
import {
  ensureBrowserSession,
  getBrowserRef,
  getPageRef,
  setSessionPage,
  MAIN_SITE_EXPLORE_URL,
  isLoginUrl,
} from '../browser/index.js';
import { findCachedPostByImageUrl, upsertCachedPost } from './postCache.js';
import type { ResolvedSession } from './sessionTypes.js';

const SEARCH_URL = 'https://www.xiaohongshu.com/search_result';
const POST_DIALOG_SELECTORS = [
  '[role="dialog"]',
  '.note-detail-mask',
  '.note-detail-container',
  '.note-detail',
  '[class*="note-detail"]',
  '[class*="dialog"]',
  '[class*="modal"]',
];

export type BrowserPostItem = {
  noteId: string;
  title: string;
  author: string;
  likes: string;
  url: string;
  coverImage: string;
};

type BrowserPostDialogState = {
  dialogFound: boolean;
  title: string;
  author: string;
  content: string;
  comments: Array<{
    author: string;
    content: string;
  }>;
  url: string;
};

type OpenPostOnPageResult = {
  noteId: string;
  state: BrowserPostDialogState;
};

export type BrowserUnreadMessageItem = {
  category: string;
  actor: string;
  action: string;
  time: string;
  content: string;
  quote: string;
  userUrl: string;
  targetImage: string;
  targetPostId: string;
  targetPostTitle: string;
  targetPostUrl: string;
};

async function pickMainSitePage(browser: NonNullable<ReturnType<typeof getBrowserRef>>): Promise<Page | null> {
  const pages = (await browser.pages()).filter((p) => !p.isClosed());
  if (pages.length === 0) return null;

  const urls = await Promise.all(
    pages.map((p) => {
      try {
        return p.url();
      } catch {
        return '';
      }
    }),
  );

  const mainSite = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank' && u.includes('www.xiaohongshu.com');
  });
  if (mainSite) return mainSite;

  const xhs = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank' && u.includes('xiaohongshu.com');
  });
  if (xhs) return xhs;

  const nonBlank = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank';
  });
  return nonBlank ?? null;
}

async function withMainSitePage<T>(
  session: ResolvedSession,
  callback: (page: Page) => Promise<T>,
): Promise<T> {
  await ensureBrowserSession({
    userDataDir: session.browserUserDataDir,
    headless: false,
  });
  const browser = getBrowserRef();
  if (!browser) {
    throw new Error('无法获取浏览器实例');
  }

  let page = getPageRef();
  if (!page || page.isClosed()) {
    page = (await pickMainSitePage(browser)) ?? (await browser.newPage());
  }
  setSessionPage(page);
  await page.bringToFront();
  return callback(page);
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) return 20;
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error('--limit 需为正整数');
  }
  return Math.min(Math.floor(limit), 100);
}

async function settleMainFeed(page: Page): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await page.evaluate(() => {
    window.scrollTo({ top: Math.max(0, window.innerHeight * 0.75), behavior: 'instant' });
  }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

async function extractPosts(page: Page, limit: number): Promise<BrowserPostItem[]> {
  return page.evaluate((maxItems: number): BrowserPostItem[] => {
    const text = (el: Element | null | undefined): string =>
      (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

    const attr = (el: Element | null | undefined, name: string): string =>
      (el?.getAttribute(name) ?? '').trim();

    const noteIdFromUrl = (url: string): string => {
      const m = url.match(/\/explore\/([^/?#]+)/);
      return m?.[1] ?? '';
    };

    const absoluteUrl = (href: string): string => {
      try {
        return new URL(href, location.origin).toString();
      } catch {
        return href;
      }
    };

    const findCard = (anchor: HTMLAnchorElement): Element => {
      return (
        anchor.closest('.note-item') ??
        anchor.closest('section') ??
        anchor.closest('article') ??
        anchor.closest('[class*="note"]') ??
        anchor.closest('[class*="card"]') ??
        anchor.parentElement ??
        anchor
      );
    };

    const scoreAnchor = (anchor: HTMLAnchorElement): number => {
      const rect = anchor.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      const href = anchor.href || attr(anchor, 'href');
      return (visible ? 10 : 0) + (href.includes('xsec_token=') ? 5 : 0);
    };

    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/explore/"]'),
    ).sort((a, b) => scoreAnchor(b) - scoreAnchor(a));
    const seen = new Set<string>();
    const out: BrowserPostItem[] = [];

    for (const anchor of anchors) {
      const url = absoluteUrl(anchor.href || attr(anchor, 'href'));
      const noteId = noteIdFromUrl(url);
      if (!noteId || seen.has(noteId)) continue;
      seen.add(noteId);

      const card = findCard(anchor);
      const title =
        text(card.querySelector('.title')) ||
        text(card.querySelector('.note-title')) ||
        text(card.querySelector('[class*="title"]')) ||
        text(anchor).slice(0, 80);
      const author =
        text(card.querySelector('.author')) ||
        text(card.querySelector('[class*="author"]')) ||
        text(card.querySelector('.name')) ||
        text(card.querySelector('[class*="nickname"]'));
      const likes =
        text(card.querySelector('.like-wrapper')) ||
        text(card.querySelector('[class*="like"]')) ||
        text(card.querySelector('[class*="count"]'));
      const img = card.querySelector<HTMLImageElement>('img');

      out.push({
        noteId,
        title: title || '无标题',
        author: author || '未知作者',
        likes: likes || '—',
        url,
        coverImage: img?.currentSrc || img?.src || '',
      });

      if (out.length >= maxItems) break;
    }

    return out;
  }, limit);
}

function formatBrowserPosts(title: string, items: BrowserPostItem[]): string {
  if (items.length === 0) {
    return `${title}\n未读取到帖子列表。`;
  }
  return [
    title,
    ...items.map((item, i) =>
      [
        `${i + 1}. ${item.title}`,
        `ID: ${item.noteId}`,
        `作者: ${item.author}`,
        `点赞: ${item.likes}`,
        `链接: ${item.url}`,
        item.coverImage ? `封面: ${item.coverImage}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  ].join('\n\n');
}

function cacheBrowserPostItems(
  session: ResolvedSession,
  items: BrowserPostItem[],
  source: string,
): void {
  for (const item of items) {
    upsertCachedPost(session, {
      noteId: item.noteId,
      title: item.title,
      author: item.author,
      url: item.url,
      coverImage: item.coverImage,
      stats: { likes: item.likes },
      source,
    });
  }
}

function formatUnreadMessages(
  unreadCount: number | undefined,
  items: BrowserUnreadMessageItem[],
): string {
  const header = `评论和@${unreadCount === undefined ? '' : `（侧边栏未读: ${unreadCount}）`}`;
  if (items.length === 0) {
    return `${header}\n未读取到评论和@消息。`;
  }
  return [
    header,
    ...items.map((item, i) =>
      [
        `${i + 1}. ${item.actor || '未知用户'} ${item.action}${item.time ? `（${item.time}）` : ''}`,
        item.targetPostTitle ? `帖子: ${item.targetPostTitle}` : '',
        item.targetPostId ? `帖子ID: ${item.targetPostId}` : '',
        item.targetPostUrl ? `帖子链接: ${item.targetPostUrl}` : '',
        item.content ? `内容: ${item.content}` : '',
        item.quote ? `关联: ${item.quote}` : '',
        item.userUrl ? `用户: ${item.userUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  ].join('\n\n');
}

function normalizeNoteRef(noteRef: string): { noteId: string; url: string } {
  const raw = noteRef.trim();
  if (!raw) {
    throw new Error('帖子 ID 或链接不能为空');
  }

  const fromUrl = raw.match(/\/explore\/([^/?#]+)/)?.[1];
  const noteId = (fromUrl ?? raw).trim();
  if (!/^[a-zA-Z0-9]+$/.test(noteId)) {
    throw new Error(`无法识别帖子 ID: ${raw}`);
  }

  return {
    noteId,
    url: `https://www.xiaohongshu.com/explore/${noteId}`,
  };
}

async function waitForPostDialog(page: Page, timeoutMs: number): Promise<boolean> {
  try {
    await page.waitForFunction(
      (selectors: string[]) => {
        return selectors.some((sel) => document.querySelector(sel));
      },
      { timeout: timeoutMs },
      POST_DIALOG_SELECTORS,
    );
    return true;
  } catch {
    return false;
  }
}

async function hasOpenPostDialog(page: Page): Promise<boolean> {
  return page.evaluate((selectors: string[]) => {
    return selectors.some((sel) => document.querySelector(sel));
  }, POST_DIALOG_SELECTORS).catch(() => false);
}

async function closeOpenPostDialog(page: Page): Promise<boolean> {
  if (!(await hasOpenPostDialog(page))) return false;

  const clicked = await page.evaluate((selectors: string[]) => {
    const root =
      selectors
        .map((sel) => document.querySelector(sel))
        .find((el): el is Element => !!el) ?? document.body;
    const rootRect = root.getBoundingClientRect();
    const isVisible = (el: Element): boolean => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        Number(style.opacity || '1') > 0
      );
    };
    const score = (el: HTMLElement): number => {
      const rect = el.getBoundingClientRect();
      const label = [
        el.textContent,
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.className,
      ].join(' ').toLowerCase();
      let s = 0;
      if (/close|关闭|取消|×|x/.test(label)) s += 10;
      if (rect.left > rootRect.left + rootRect.width * 0.65) s += 4;
      if (rect.top < rootRect.top + rootRect.height * 0.25) s += 4;
      if (rect.width <= 80 && rect.height <= 80) s += 2;
      return s;
    };
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          'button',
          '[role="button"]',
          '.close',
          '.close-btn',
          '.close-button',
          '.note-detail-close',
          '[class*="close"]',
        ].join(','),
      ),
    )
      .filter(isVisible)
      .sort((a, b) => score(b) - score(a));
    const btn = candidates.find((el) => score(el) >= 8);
    if (!btn) return false;
    btn.click();
    return true;
  }, POST_DIALOG_SELECTORS).catch(() => false);

  if (!clicked) {
    await page.keyboard.press('Escape').catch(() => {});
  }

  try {
    await page.waitForFunction(
      (selectors: string[]) => selectors.every((sel) => !document.querySelector(sel)),
      { timeout: 3000 },
      POST_DIALOG_SELECTORS,
    );
  } catch {
    await page.keyboard.press('Escape').catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return !(await hasOpenPostDialog(page));
}

async function getSidebarNotificationUnreadCount(page: Page): Promise<number | undefined> {
  return page.evaluate(() => {
    const text = (el: Element | null | undefined): string =>
      (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const entry = Array.from(document.querySelectorAll('a,button,[role="button"],li,div')).find((el) => {
      const t = text(el);
      const href = (el as HTMLAnchorElement).href || el.getAttribute('href') || '';
      return /通知|消息/.test(t) || href.includes('/notification');
    });
    const raw = text(entry);
    const m = raw.match(/(\d+)\s*(?:通知|消息)/);
    if (!m?.[1]) return undefined;
    const n = Number.parseInt(m[1], 10);
    return Number.isFinite(n) ? n : undefined;
  }).catch(() => undefined);
}

async function openNotificationPage(page: Page): Promise<number | undefined> {
  await closeOpenPostDialog(page);
  if (isLoginUrl(page.url())) {
    throw new Error('主站未登录，请先执行 xhs browser login。');
  }

  if (!page.url().includes('xiaohongshu.com')) {
    await page.goto(MAIN_SITE_EXPLORE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 800));

  const unreadCount = await getSidebarNotificationUnreadCount(page);
  if (!page.url().includes('/notification')) {
    const clicked = await page.evaluate(() => {
      const text = (el: Element | null | undefined): string =>
        (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const target = Array.from(
        document.querySelectorAll<HTMLElement>('a,button,[role="button"]'),
      ).find((el) => {
        const href = (el as HTMLAnchorElement).href || el.getAttribute('href') || '';
        return /通知|消息/.test(text(el)) || href.includes('/notification');
      });
      if (!target) return false;
      target.click();
      return true;
    }).catch(() => false);

    if (clicked) {
      try {
        await page.waitForFunction(
          () => location.href.includes('/notification') || !!document.querySelector('.notification-page'),
          { timeout: 8000 },
        );
      } catch {
        /* URL fallback below */
      }
    }

    if (!page.url().includes('/notification')) {
      await page.goto('https://www.xiaohongshu.com/notification', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (isLoginUrl(page.url())) {
    throw new Error('主站未登录，请先执行 xhs browser login。');
  }
  return unreadCount;
}

async function selectNotificationTab(page: Page, label: string): Promise<void> {
  const clicked = await page.evaluate((tabLabel: string) => {
    const text = (el: Element | null | undefined): string =>
      (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const target = Array.from(
      document.querySelectorAll<HTMLElement>('.reds-tab-item, [role="tab"], button, [role="button"], div'),
    ).find((el) => text(el) === tabLabel);
    if (!target) return false;
    target.click();
    return true;
  }, label).catch(() => false);
  if (!clicked) {
    throw new Error(`未找到通知分类: ${label}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

async function clickPostIfPresent(page: Page, noteId: string): Promise<boolean> {
  return page.evaluate((id: string) => {
    const scoreAnchor = (anchor: HTMLAnchorElement): number => {
      const rect = anchor.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      const href = anchor.href || anchor.getAttribute('href') || '';
      return (visible ? 10 : 0) + (href.includes('xsec_token=') ? 5 : 0);
    };
    const anchor = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(`a[href*="/explore/${id}"]`),
    ).sort((a, b) => scoreAnchor(b) - scoreAnchor(a))[0];
    if (!anchor) return false;
    anchor.scrollIntoView({ block: 'center', inline: 'center' });
    anchor.click();
    return true;
  }, noteId);
}

async function isCurrentPostDialogOpen(page: Page, noteId: string): Promise<boolean> {
  return page.evaluate((id: string, selectors: string[]) => {
    const hasDialog = selectors.some((sel) => document.querySelector(sel));
    if (!hasDialog) return false;
    if (location.href.includes(`/explore/${id}`)) return true;
    return !!document.querySelector(`a[href*="/explore/${id}"]`);
  }, noteId, POST_DIALOG_SELECTORS).catch(() => false);
}

async function extractDialogState(page: Page): Promise<BrowserPostDialogState> {
  return page.evaluate((selectors: string[]): BrowserPostDialogState => {
    const text = (el: Element | null | undefined): string =>
      (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const root =
      selectors
        .map((sel) => document.querySelector(sel))
        .find((el): el is Element => !!el) ?? null;

    const scope = root ?? document.body;
    const title =
      text(scope.querySelector('#detail-title')) ||
      text(scope.querySelector('.title')) ||
      text(scope.querySelector('[class*="title"]'));
    const author =
      text(scope.querySelector('.author')) ||
      text(scope.querySelector('[class*="author"]')) ||
      text(scope.querySelector('[class*="nickname"]')) ||
      text(scope.querySelector('.name'));
    const content =
      text(scope.querySelector('#detail-desc')) ||
      text(scope.querySelector('.desc')) ||
      text(scope.querySelector('[class*="desc"]')) ||
      text(scope.querySelector('[class*="content"]'));
    const commentNodes = Array.from(
      scope.querySelectorAll(
        '.comment-item, .parent-comment, [class*="comment-item"], [class*="commentItem"]',
      ),
    );
    const seenComments = new Set<string>();
    const comments = commentNodes.flatMap((node) => {
      const author =
        text(node.querySelector('.author .name')) ||
        text(node.querySelector('.user-name')) ||
        text(node.querySelector('[class*="user-name"]')) ||
        text(node.querySelector('[class*="nickname"]')) ||
        text(node.querySelector('.name'));
      const body =
        text(node.querySelector('.content')) ||
        text(node.querySelector('.comment-content')) ||
        text(node.querySelector('[class*="comment-content"]')) ||
        text(node.querySelector('.note-text')) ||
        text(node.querySelector('[class*="text"]'));
      const key = `${author}\n${body}`;
      if (!body || seenComments.has(key)) return [];
      seenComments.add(key);
      return [{ author, content: body }];
    }).slice(0, 10);

    return {
      dialogFound: !!root,
      title,
      author,
      content,
      comments,
      url: location.href,
    };
  }, POST_DIALOG_SELECTORS);
}

function formatOpenPostResult(noteId: string, state: BrowserPostDialogState): string {
  return [
    state.dialogFound ? '✅ 已打开帖子详情' : '⚠️ 已打开帖子链接，但未检测到详情 dialog',
    `ID: ${noteId}`,
    `当前页面: ${state.url}`,
    state.title ? `标题: ${state.title}` : '',
    state.author ? `作者: ${state.author}` : '',
    state.content ? `正文: ${state.content.slice(0, 300)}` : '',
    state.comments.length > 0
      ? ['评论:', ...state.comments.map((c, i) => `${i + 1}. ${c.author ? `${c.author}: ` : ''}${c.content}`)].join('\n')
      : '评论: 未读取到评论',
  ]
    .filter(Boolean)
    .join('\n');
}

async function openPostOnPage(page: Page, noteRef: string): Promise<OpenPostOnPageResult> {
  const { noteId, url } = normalizeNoteRef(noteRef);
  if (isLoginUrl(page.url())) {
    throw new Error('主站未登录，请先执行 xhs browser login。');
  }

  if (await isCurrentPostDialogOpen(page, noteId)) {
    return {
      noteId,
      state: await extractDialogState(page),
    };
  }

  const clicked = await clickPostIfPresent(page, noteId).catch(() => false);
  if (!clicked) {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  }

  await waitForPostDialog(page, clicked ? 8000 : 5000);
  return {
    noteId,
    state: await extractDialogState(page),
  };
}

async function fillCommentInput(page: Page, content: string): Promise<void> {
  const input = await page.$('#content-textarea[contenteditable="true"]');
  if (!input) {
    throw new Error('未找到评论输入框');
  }
  await input.click();
  await page.keyboard.down('Control').catch(() => {});
  await page.keyboard.press('A').catch(() => {});
  await page.keyboard.up('Control').catch(() => {});
  await page.keyboard.press('Backspace').catch(() => {});
  await page.keyboard.type(content, { delay: 20 });
  await page.waitForFunction(
    () => {
      const btn = document.querySelector<HTMLButtonElement>('.btn.submit');
      return !!btn && !btn.disabled;
    },
    { timeout: 5000 },
  );
}

async function clearCommentInput(page: Page): Promise<void> {
  const input = await page.$('#content-textarea[contenteditable="true"]');
  if (!input) return;
  await input.click();
  await page.keyboard.down('Control').catch(() => {});
  await page.keyboard.press('A').catch(() => {});
  await page.keyboard.up('Control').catch(() => {});
  await page.keyboard.press('Backspace').catch(() => {});
}

async function clickCommentSubmit(page: Page): Promise<void> {
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.btn.submit, button'));
    const btn = buttons.find((b) => {
      const t = (b.textContent ?? '').replace(/\s+/g, '');
      return !b.disabled && (t === '发送' || t === '评论' || t === '发布');
    });
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) {
    throw new Error('未找到可点击的评论发送按钮');
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

async function extractCommentUnreadMessages(
  page: Page,
  limit: number,
): Promise<BrowserUnreadMessageItem[]> {
  return page.evaluate((maxItems: number): BrowserUnreadMessageItem[] => {
    const text = (el: Element | null | undefined): string =>
      (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const containers = Array.from(
      document.querySelectorAll<HTMLElement>('.tabs-content-container .container'),
    );
    const seen = new Set<string>();
    const out: BrowserUnreadMessageItem[] = [];

    for (const container of containers) {
      const actorLink =
        Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href]')).find((a) => text(a)) ??
        null;
      const actor =
        text(container.querySelector('.user-info')) ||
        text(actorLink) ||
        '未知用户';
      const hintEl = container.querySelector('.interaction-hint');
      const hint = text(hintEl);
      const time = text(hintEl?.querySelector('.interaction-time'));
      const action = time ? hint.replace(time, '').trim() : hint;
      const content = text(container.querySelector('.interaction-content'));
      const quote = text(container.querySelector('.quote-info'));
      const targetImage =
        (container.querySelector('.extra-image') as HTMLImageElement | null)?.currentSrc ||
        (container.querySelector('.extra-image') as HTMLImageElement | null)?.src ||
        '';
      const fallback = text(container)
        .replace(actor, '')
        .replace(hint, '')
        .replace(/回复\s*取消评论将会清空已经输入的内容确认返回\s*$/, '')
        .trim();
      const key = [actor, action, time, content || fallback, quote].join('\n');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        category: '评论和@',
        actor,
        action: action || '互动了你的内容',
        time,
        content: content || fallback,
        quote,
        userUrl: actorLink?.href || '',
        targetImage,
        targetPostId: '',
        targetPostTitle: '',
        targetPostUrl: '',
      });
      if (out.length >= maxItems) break;
    }

    return out;
  }, limit);
}

function enrichUnreadMessagesFromCache(
  session: ResolvedSession,
  items: BrowserUnreadMessageItem[],
): BrowserUnreadMessageItem[] {
  return items.map((item) => {
    const post = findCachedPostByImageUrl(session, item.targetImage);
    if (!post) return item;
    return {
      ...item,
      targetPostId: post.noteId,
      targetPostTitle: post.title,
      targetPostUrl: post.url,
    };
  });
}

export async function getBrowserHomePosts(
  session: ResolvedSession,
  limit?: number,
): Promise<string> {
  const maxItems = normalizeLimit(limit);
  return withMainSitePage(session, async (page) => {
    await closeOpenPostDialog(page);
    await page.goto(MAIN_SITE_EXPLORE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    if (isLoginUrl(page.url())) {
      return '❌ 主站未登录，请先执行 xhs browser login。';
    }
    await settleMainFeed(page);
    const items = await extractPosts(page, maxItems);
    cacheBrowserPostItems(session, items, 'browser-home');
    return formatBrowserPosts(`首页帖子（${items.length}/${maxItems}）`, items);
  });
}

export async function searchBrowserPosts(
  session: ResolvedSession,
  keyword: string,
  limit?: number,
): Promise<string> {
  const q = keyword.trim();
  if (!q) {
    throw new Error('搜索关键词不能为空');
  }
  const maxItems = normalizeLimit(limit);
  return withMainSitePage(session, async (page) => {
    await closeOpenPostDialog(page);
    const url = new URL(SEARCH_URL);
    url.searchParams.set('keyword', q);
    url.searchParams.set('source', 'web_search_result_notes');
    await page.goto(url.toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    if (isLoginUrl(page.url())) {
      return '❌ 主站未登录，请先执行 xhs browser login。';
    }
    await settleMainFeed(page);
    const items = await extractPosts(page, maxItems);
    cacheBrowserPostItems(session, items, 'browser-search');
    return formatBrowserPosts(`搜索帖子：${q}（${items.length}/${maxItems}）`, items);
  });
}

export async function getBrowserUnreadMessages(
  session: ResolvedSession,
  limit?: number,
): Promise<string> {
  const maxItems = normalizeLimit(limit);
  return withMainSitePage(session, async (page) => {
    const unreadCount = await openNotificationPage(page);
    await selectNotificationTab(page, '评论和@');
    const items = enrichUnreadMessagesFromCache(
      session,
      await extractCommentUnreadMessages(page, maxItems),
    );
    return formatUnreadMessages(unreadCount, items);
  });
}

export async function openBrowserPost(
  session: ResolvedSession,
  noteRef: string,
): Promise<string> {
  return withMainSitePage(session, async (page) => {
    const { noteId, state } = await openPostOnPage(page, noteRef);
    upsertCachedPost(session, {
      noteId,
      title: state.title,
      author: state.author,
      content: state.content,
      url: state.url || `https://www.xiaohongshu.com/explore/${noteId}`,
      source: 'browser-open',
    });
    return formatOpenPostResult(noteId, state);
  });
}

export async function commentBrowserPost(
  session: ResolvedSession,
  noteRef: string,
  content: string,
  opts?: { dryRun?: boolean },
): Promise<string> {
  const text = content.trim();
  if (!text) {
    throw new Error('评论内容不能为空');
  }
  if (text.length > 500) {
    throw new Error('评论内容不能超过 500 个字符');
  }

  return withMainSitePage(session, async (page) => {
    const { noteId, state } = await openPostOnPage(page, noteRef);
    if (!state.dialogFound) {
      throw new Error('未检测到帖子详情 dialog，无法评论');
    }

    await fillCommentInput(page, text);
    if (opts?.dryRun) {
      await clearCommentInput(page).catch(() => {});
      await closeOpenPostDialog(page).catch(() => {});
      return [
        '✅ 已验证评论输入（dry-run，未发送，已清空输入框）',
        `ID: ${noteId}`,
        `评论: ${text}`,
      ].join('\n');
    }

    await clickCommentSubmit(page);
    await closeOpenPostDialog(page).catch(() => {});
    return [
      '✅ 已发送评论',
      `ID: ${noteId}`,
      `评论: ${text}`,
    ].join('\n');
  });
}
