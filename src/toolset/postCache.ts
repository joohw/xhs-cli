import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CACHE_DIR, ensureAppDataLayout } from '../config.js';
import type { ResolvedSession } from './sessionTypes.js';

export type CachedPost = {
  noteId: string;
  title: string;
  content?: string;
  publishTime?: string;
  url: string;
  coverImage?: string;
  author?: string;
  stats?: {
    views?: string;
    likes?: string;
    comments?: string;
    favorites?: string;
    shares?: string;
  };
  source: string;
  cachedAt: string;
};

export type CacheablePostInput = Omit<CachedPost, 'cachedAt' | 'source'> & {
  source?: string;
};

function postsDir(session: ResolvedSession): string {
  return join(CACHE_DIR, session.cachePathPrefix, 'posts');
}

function postPath(session: ResolvedSession, noteId: string): string {
  return join(postsDir(session), `${noteId}.json`);
}

function normalizeImageKey(url: string | undefined): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.pathname.replace(/^\/+/, '').split(/[!?]/)[0] ?? '';
  } catch {
    return raw.replace(/^https?:\/\/[^/]+\//, '').split(/[!?]/)[0] ?? raw;
  }
}

function loadCachedPostFile(path: string): CachedPost | null {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as CachedPost;
    return parsed?.noteId ? parsed : null;
  } catch {
    return null;
  }
}

export function loadCachedPost(session: ResolvedSession, noteId: string): CachedPost | null {
  const id = noteId.trim();
  if (!id) return null;
  const p = postPath(session, id);
  if (!existsSync(p)) return null;
  return loadCachedPostFile(p);
}

export function upsertCachedPost(
  session: ResolvedSession,
  input: CacheablePostInput,
): CachedPost {
  ensureAppDataLayout();
  const id = input.noteId.trim();
  if (!id) {
    throw new Error('noteId 不能为空');
  }
  const dir = postsDir(session);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const previous = loadCachedPost(session, id);
  const rec: CachedPost = {
    ...previous,
    ...input,
    noteId: id,
    title: input.title?.trim() || previous?.title || '未知标题',
    url: input.url?.trim() || previous?.url || `https://www.xiaohongshu.com/explore/${id}`,
    coverImage: input.coverImage?.trim() || previous?.coverImage,
    content: input.content?.trim() || previous?.content,
    publishTime: input.publishTime?.trim() || previous?.publishTime,
    author: input.author?.trim() || previous?.author,
    stats: {
      ...previous?.stats,
      ...input.stats,
    },
    source: input.source?.trim() || previous?.source || 'unknown',
    cachedAt: new Date().toISOString(),
  };
  const target = postPath(session, id);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(rec, null, 2), 'utf-8');
  renameSync(tmp, target);
  return rec;
}

export function listCachedPosts(session: ResolvedSession): CachedPost[] {
  const dir = postsDir(session);
  if (!existsSync(dir)) return [];
  const out: CachedPost[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const rec = loadCachedPostFile(join(dir, name));
    if (rec) out.push(rec);
  }
  out.sort((a, b) => b.cachedAt.localeCompare(a.cachedAt));
  return out;
}

export function findCachedPostByImageUrl(
  session: ResolvedSession,
  imageUrl: string | undefined,
): CachedPost | null {
  const key = normalizeImageKey(imageUrl);
  if (!key) return null;
  return (
    listCachedPosts(session).find((post) => {
      const coverKey = normalizeImageKey(post.coverImage);
      return !!coverKey && (coverKey === key || coverKey.includes(key) || key.includes(coverKey));
    }) ?? null
  );
}

