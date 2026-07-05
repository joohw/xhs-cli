/**
 * 小红书等业务能力（impl*）；供 CLI 子命令直接调用；外部 Agent 可单独引用同一套 impl。
 */
import { runLogin } from './login.js';
import { getOperationData } from './get_metrics.js';
import { getNoteDetail } from './get_note_detail.js';
import { getRecentPosts } from './get_recent_posts.js';
import { postNote, type PostNoteArgs } from './post.js';
import {
  commentBrowserPost,
  getBrowserHomePosts,
  getBrowserUnreadMessages,
  openBrowserPost,
  searchBrowserPosts,
} from './browserPosts.js';
import { resolveAccountSlug, resolveSession } from './sessionResolve.js';
import type { ResolvedSession } from './sessionTypes.js';

function sessionOrDefault(session?: ResolvedSession): ResolvedSession {
  if (session) {
    return session;
  }
  return resolveSession();
}

export async function implLogin(session?: ResolvedSession): Promise<string> {
  const s = sessionOrDefault(session);
  return runLogin(s.browserUserDataDir);
}

export async function implGetOperationData(session?: ResolvedSession): Promise<string> {
  const s = sessionOrDefault(session);
  return getOperationData(s);
}

export async function implPosted(
  limit: number | undefined,
  session?: ResolvedSession,
): Promise<string> {
  const s = sessionOrDefault(session);
  return getRecentPosts(s, limit);
}

export async function implGetNoteDetail(
  noteId: string,
  session?: ResolvedSession,
): Promise<string> {
  const s = sessionOrDefault(session);
  return getNoteDetail(noteId, s);
}

export async function implPost(args: PostNoteArgs): Promise<string> {
  try {
    const result = await postNote(args);
    return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function implBrowserHomePosts(
  limit: number | undefined,
  session?: ResolvedSession,
): Promise<string> {
  try {
    const s = sessionOrDefault(session);
    return await getBrowserHomePosts(s, limit);
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function implBrowserSearchPosts(
  keyword: string,
  limit: number | undefined,
  session?: ResolvedSession,
): Promise<string> {
  try {
    const s = sessionOrDefault(session);
    return await searchBrowserPosts(s, keyword, limit);
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function implBrowserUnreadMessages(
  limit: number | undefined,
  session?: ResolvedSession,
): Promise<string> {
  try {
    const s = sessionOrDefault(session);
    return await getBrowserUnreadMessages(s, limit);
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function implBrowserOpenPost(
  noteRef: string,
  session?: ResolvedSession,
): Promise<string> {
  try {
    const s = sessionOrDefault(session);
    return await openBrowserPost(s, noteRef);
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function implBrowserCommentPost(
  noteRef: string,
  content: string,
  opts: { dryRun?: boolean } | undefined,
  session?: ResolvedSession,
): Promise<string> {
  try {
    const s = sessionOrDefault(session);
    return await commentBrowserPost(s, noteRef, content, opts);
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export { resolveAccountSlug, resolveSession };
export { setCurrentAccount, getCurrentAccount } from './accountRegistry.js';
export type { ResolvedSession };
