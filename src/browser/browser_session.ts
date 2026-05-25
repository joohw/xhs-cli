import type { ChildProcess } from 'node:child_process';
import type { Browser, Page } from 'puppeteer-core';
import { clearSpawnedChromeProcessRef, connectBrowser } from './cdp_browser.js';

export type EnsureSessionOptions = {
  userDataDir: string;
  headless?: boolean;
};

let browserRef: Browser | null = null;
let pageRef: Page | null = null;
let sessionUserDataDir: string | null = null;
let connectPromise: Promise<void> | null = null;

function attachDisconnectedHandler(b: Browser): void {
  b.once('disconnected', () => {
    if (browserRef === b) {
      browserRef = null;
      pageRef = null;
      sessionUserDataDir = null;
      console.error(
        '[xhs-cli] 与浏览器断开连接（窗口关闭或进程退出）；下次使用工具时会自动重连。',
      );
    }
  });
}

async function pickOrCreatePage(b: Browser): Promise<Page> {
  const pages = (await b.pages()).filter((p) => !p.isClosed());
  if (pages.length === 0) {
    return b.newPage();
  }

  const urls = await Promise.all(
    pages.map((p) => {
      try {
        return p.url();
      } catch {
        return '';
      }
    }),
  );

  const xhs = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank' && u.includes('xiaohongshu.com');
  });
  if (xhs) {
    return xhs;
  }

  const nonBlank = pages.find((p, i) => {
    const u = urls[i] ?? '';
    return u.length > 0 && u !== 'about:blank';
  });
  if (nonBlank) {
    return nonBlank;
  }

  return pages[0]!;
}

async function closeRedundantBlankPages(b: Browser, keep: Page | null): Promise<void> {
  const pages = (await b.pages()).filter((p) => !p.isClosed());
  if (pages.length <= 1) return;

  const urls = await Promise.all(
    pages.map((p) => {
      try {
        return p.url();
      } catch {
        return '';
      }
    }),
  );

  const blankPages = pages.filter((_, i) => {
    const u = urls[i] ?? '';
    return u === '' || u === 'about:blank';
  });
  if (blankPages.length === 0) return;

  const hasNonBlank = pages.some((_, i) => {
    const u = urls[i] ?? '';
    return u !== '' && u !== 'about:blank';
  });

  for (const p of blankPages) {
    if (p === keep) continue;
    if (!hasNonBlank && p === blankPages[0]) continue;
    try {
      await p.close({ runBeforeUnload: false });
    } catch {
      /* ignore */
    }
  }
}

function isSessionHealthy(userDataDir: string): boolean {
  return !!(
    browserRef?.connected &&
    sessionUserDataDir === userDataDir &&
    pageRef &&
    !pageRef.isClosed()
  );
}

async function establishSession(opts: EnsureSessionOptions): Promise<void> {
  if (browserRef?.connected && sessionUserDataDir !== opts.userDataDir) {
    await detachBrowserSession();
  }

  const b = await connectBrowser({
    userDataDir: opts.userDataDir,
    headless: opts.headless ?? process.env.XHS_BROWSER_HEADLESS === 'true',
  });
  browserRef = b;
  sessionUserDataDir = opts.userDataDir;
  attachDisconnectedHandler(b);
  pageRef = await pickOrCreatePage(b);
  await closeRedundantBlankPages(b, pageRef);
}

export async function ensureAndGetBrowser(opts: EnsureSessionOptions): Promise<Browser | null> {
  await ensureBrowserSession(opts);
  return getBrowserRef();
}

export async function ensureBrowserSession(opts: EnsureSessionOptions): Promise<void> {
  if (browserRef?.connected && sessionUserDataDir === opts.userDataDir) {
    if (pageRef && !pageRef.isClosed()) {
      try {
        const u = pageRef.url();
        if (u === 'about:blank' || u === '') {
          const preferred = await pickOrCreatePage(browserRef);
          if (preferred !== pageRef && preferred.url() !== 'about:blank') {
            pageRef = preferred;
          }
        }
        await closeRedundantBlankPages(browserRef, pageRef);
      } catch {
        /* ignore */
      }
      return;
    }
    pageRef = await pickOrCreatePage(browserRef);
    await closeRedundantBlankPages(browserRef, pageRef);
    return;
  }

  if (connectPromise) {
    await connectPromise;
    return;
  }

  connectPromise = (async () => {
    if (isSessionHealthy(opts.userDataDir)) return;
    await establishSession(opts);
  })();

  try {
    await connectPromise;
  } finally {
    connectPromise = null;
  }
}

export function getBrowserRef(): Browser | null {
  return browserRef?.connected ? browserRef : null;
}

export function getPageRef(): Page | null {
  if (!pageRef || pageRef.isClosed()) return null;
  if (!browserRef?.connected) return null;
  return pageRef;
}

export function getSessionUserDataDir(): string | null {
  return sessionUserDataDir;
}

export function setSessionPage(page: Page): void {
  if (!browserRef?.connected) return;
  try {
    if (page.browser() !== browserRef) return;
  } catch {
    return;
  }
  if (page.isClosed()) return;
  pageRef = page;
}

function unrefBrowserChildProcess(proc: ChildProcess | null | undefined): void {
  if (!proc) return;
  try {
    proc.unref();
  } catch {
    /* ignore */
  }
}

/** 主动关闭浏览器（如需从无头切到有头时重启）。 */
export async function disconnectBrowserSession(): Promise<void> {
  const b = browserRef;
  if (!b) return;
  try {
    b.removeAllListeners('disconnected');
    await b.close();
  } catch {
    /* ignore */
  }
  browserRef = null;
  pageRef = null;
  sessionUserDataDir = null;
  clearSpawnedChromeProcessRef();
}

/**
 * 仅断开 CDP，不关闭浏览器；并对 Chrome 子进程 unref，让 Node 立刻退出。
 * 与 boss-cli 一致：**绝不调用 browser.close()**。
 */
export async function detachBrowserSession(): Promise<void> {
  const b = browserRef;
  if (!b) return;
  let proc: ChildProcess | null | undefined;
  try {
    proc = typeof b.process === 'function' ? b.process() : undefined;
  } catch {
    proc = undefined;
  }
  try {
    b.removeAllListeners('disconnected');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyB = b as any;
    if (typeof anyB.disconnect === 'function') {
      await Promise.resolve(anyB.disconnect());
    }
  } catch {
    /* 仍不 close */
  }
  unrefBrowserChildProcess(proc ?? null);
  clearSpawnedChromeProcessRef();
  browserRef = null;
  pageRef = null;
  sessionUserDataDir = null;
}
