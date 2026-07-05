import type { HTTPResponse, Page } from 'puppeteer-core';
import { withLoggedInPage } from '../browser/index.js';
import { saveToCache, loadFromCache } from '../utils/cache.js';
import { prefixedCacheFilename } from './cachePaths.js';
import { upsertCachedPost } from './postCache.js';
import type { ResolvedSession } from './sessionTypes.js';

const NOTE_MANAGER_URL = 'https://creator.xiaohongshu.com/new/note-manager';
const POSTED_API_PATH = '/api/galaxy/v2/creator/note/user/posted';

interface NoteRaw {
  noteId: string;
  title: string;
  publishTime: string;
  url: string;
  views: string;
  likes: string;
  comments: string;
  favorites: string;
  shares: string;
  coverImage: string;
}

export interface PostedNoteApi {
  id?: string;
  display_title?: string;
  time?: string;
  view_count?: number;
  likes?: number;
  comments_count?: number;
  collected_count?: number;
  shared_count?: number;
  xsec_token?: string;
  xsec_source?: string;
  images_list?: Array<{ url?: string }>;
}

function formatNote(note: NoteRaw): string {
  return [
    `ID: ${note.noteId}`,
    `标题: ${note.title}`,
    `发布时间: ${note.publishTime}`,
    `链接: ${note.url}`,
    `浏览: ${note.views}  点赞: ${note.likes}  评论: ${note.comments}  收藏: ${note.favorites}  分享: ${note.shares}`,
  ].join('\n');
}

function fromApiNote(note: PostedNoteApi): NoteRaw | null {
  const noteId = (note.id ?? '').trim();
  if (!noteId) return null;
  return {
    noteId,
    title: (note.display_title ?? '').trim() || '未知标题',
    publishTime: (note.time ?? '').trim(),
    url: `https://www.xiaohongshu.com/explore/${noteId}`,
    views: String(note.view_count ?? 0),
    likes: String(note.likes ?? 0),
    comments: String(note.comments_count ?? 0),
    favorites: String(note.collected_count ?? 0),
    shares: String(note.shared_count ?? 0),
    coverImage: note.images_list?.[0]?.url ?? '',
  };
}

function parseNoteIdFromImpression(raw: string | null): string {
  if (!raw) return '';
  try {
    const data = JSON.parse(raw) as {
      noteTarget?: { value?: { noteId?: string } };
    };
    return (data.noteTarget?.value?.noteId ?? '').trim();
  } catch {
    return '';
  }
}

async function scrollNoteList(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.querySelector('.content');
    if (el instanceof HTMLElement) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
}

async function waitForPostedNotes(
  page: Page,
  timeoutMs: number,
): Promise<PostedNoteApi[]> {
  try {
    const res = await page.waitForResponse(
      (r) => r.url().includes(POSTED_API_PATH) && r.status() === 200,
      { timeout: timeoutMs },
    );
    const json = (await res.json()) as { data?: { notes?: PostedNoteApi[] } };
    return json.data?.notes ?? [];
  } catch {
    return [];
  }
}

function collectFromResponse(
  res: HTTPResponse,
  sink: Map<string, PostedNoteApi>,
): void {
  if (!res.url().includes(POSTED_API_PATH) || res.status() !== 200) return;
  void res
    .json()
    .then((json: { data?: { notes?: PostedNoteApi[] } }) => {
      for (const note of json.data?.notes ?? []) {
        const id = (note.id ?? '').trim();
        if (id) sink.set(id, note);
      }
    })
    .catch(() => {
      /* ignore */
    });
}

async function scrapePostedNotesFromDom(page: Page): Promise<NoteRaw[]> {
  return page.evaluate(() => {
    const statsFor = (card: Element): string[] =>
      Array.from(card.querySelectorAll('.note-card__stat')).map((el) =>
        (el.textContent ?? '').trim(),
      );

    return Array.from(document.querySelectorAll('.note-card'))
      .map((card) => {
        const noteId = (() => {
          const raw = card.getAttribute('data-impression');
          if (!raw) return '';
          try {
            const data = JSON.parse(raw) as {
              noteTarget?: { value?: { noteId?: string } };
            };
            return (data.noteTarget?.value?.noteId ?? '').trim();
          } catch {
            return '';
          }
        })();
        if (!noteId) return null;

        const stats = statsFor(card);
        return {
          noteId,
          title:
            (card.querySelector('.note-card__title')?.textContent ?? '').trim() ||
            '未知标题',
          publishTime: (card.querySelector('.note-card__time')?.textContent ?? '').trim(),
          url: `https://www.xiaohongshu.com/explore/${noteId}`,
          views: stats[0] ?? '0',
          likes: stats[2] ?? '0',
          comments: stats[1] ?? '0',
          favorites: stats[3] ?? '0',
          shares: stats[4] ?? '0',
          coverImage:
            (card.querySelector('.note-card__cover img') as HTMLImageElement | null)?.src ??
            '',
        };
      })
      .filter((n): n is NoteRaw => n !== null);
  });
}

async function ensureNoteManagerReady(page: Page): Promise<void> {
  const currentUrl = page.url();
  if (!currentUrl.includes('/new/note-manager')) {
    await page.goto(NOTE_MANAGER_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
  } else {
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  }
}

async function collectPostedNotes(
  page: Page,
  opts?: { untilId?: string; minCount?: number; maxIdleRounds?: number },
): Promise<Map<string, PostedNoteApi>> {
  const apiNotes = new Map<string, PostedNoteApi>();
  const onResponse = (res: HTTPResponse) => collectFromResponse(res, apiNotes);
  page.on('response', onResponse);

  try {
    await ensureNoteManagerReady(page);

    if (apiNotes.size === 0) {
      const firstBatch = await waitForPostedNotes(page, 8000);
      for (const note of firstBatch) {
        const id = (note.id ?? '').trim();
        if (id) apiNotes.set(id, note);
      }
    }

    const targetId = opts?.untilId?.trim();
    if (targetId && apiNotes.has(targetId)) {
      return apiNotes;
    }

    const minCount = opts?.minCount ?? Number.POSITIVE_INFINITY;
    const maxIdleRounds = opts?.maxIdleRounds ?? 4;
    let idleRounds = 0;

    while (apiNotes.size < minCount && idleRounds < maxIdleRounds) {
      const before = apiNotes.size;
      await scrollNoteList(page);
      await new Promise((r) => setTimeout(r, 1000));
      if (targetId && apiNotes.has(targetId)) {
        break;
      }
      if (apiNotes.size === before) {
        idleRounds += 1;
      } else {
        idleRounds = 0;
      }
    }

    return apiNotes;
  } finally {
    page.off('response', onResponse);
  }
}

/** 在笔记管理页滚动加载，按 noteId 查找已发笔记元数据（含 xsec_token）。 */
export async function findPostedNoteById(
  page: Page,
  noteId: string,
): Promise<PostedNoteApi | null> {
  const id = noteId.trim();
  if (!id) return null;
  const notes = await collectPostedNotes(page, {
    untilId: id,
    maxIdleRounds: 12,
  });
  return notes.get(id) ?? null;
}

async function loadPostedNotes(
  page: Page,
  limit?: number,
): Promise<NoteRaw[]> {
  const target = typeof limit === 'number' ? limit : Number.POSITIVE_INFINITY;
  const apiNotes = await collectPostedNotes(page, {
    minCount: target,
    maxIdleRounds: 4,
  });

  let results = [...apiNotes.values()]
    .map(fromApiNote)
    .filter((n): n is NoteRaw => n !== null);

  if (results.length === 0) {
    results = await scrapePostedNotesFromDom(page);
  }

  if (typeof limit === 'number') {
    return results.slice(0, limit);
  }
  return results;
}

async function scrapeRecentPosts(
  page: Page,
  session: ResolvedSession,
  limit?: number,
): Promise<string> {
  const notes = await loadPostedNotes(page, limit);
  if (notes.length === 0) return '未找到笔记数据';

  for (const note of notes) {
    const cacheKey = prefixedCacheFilename(session.cachePathPrefix, `notes/${note.noteId}.json`);
    const cached = loadFromCache<NoteRaw>(cacheKey);
    saveToCache(cacheKey, cached ? { ...cached, ...note } : note);
    upsertCachedPost(session, {
      noteId: note.noteId,
      title: note.title,
      publishTime: note.publishTime,
      url: note.url,
      coverImage: note.coverImage,
      stats: {
        views: note.views,
        likes: note.likes,
        comments: note.comments,
        favorites: note.favorites,
        shares: note.shares,
      },
      source: 'creator-posted',
    });
  }

  return notes.map(formatNote).join('\n\n');
}

export async function getRecentPosts(
  session: ResolvedSession,
  limit?: number,
): Promise<string> {
  return withLoggedInPage((page) => scrapeRecentPosts(page, session, limit), session.browserUserDataDir);
}

export { parseNoteIdFromImpression, fromApiNote, type NoteRaw };
