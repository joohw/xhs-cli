/**
 * 小红书等业务能力（impl*）；供 CLI 子命令直接调用；外部 Agent 可单独引用同一套 impl。
 */
import { login } from './login.js';
import { getOperationData } from './get_metrics.js';
import { getNoteDetail } from './get_note_detail.js';
import { formatUserProfileText } from './get_profile.js';
import { getRecentPosts } from './get_recent_posts.js';
import { postNote, type PostNoteArgs } from './post.js';
import { resolveSession } from './sessionResolve.js';
import type { ResolvedSession } from './sessionTypes.js';

function sessionOrDefault(session?: ResolvedSession): ResolvedSession {
  return session ?? resolveSession(undefined);
}

export async function implLogin(session?: ResolvedSession): Promise<string> {
  const s = sessionOrDefault(session);
  const userProfile = await login(s.browserUserDataDir);
  if (userProfile) {
    return `✅ 登录成功\n${formatUserProfileText(userProfile)}`;
  }
  return '❌ 登录失败';
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

export { resolveSession };
export type { ResolvedSession };
