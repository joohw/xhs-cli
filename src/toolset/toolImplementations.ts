/**
 * 小红书等业务能力（impl*）；供 CLI 子命令直接调用；外部 Agent 可单独引用同一套 impl。
 */
import { login } from './login.js';
import { checkLoginState } from './check_login_state.js';
import { getOperationData } from './get_metrics.js';
import { getNoteDetail } from './get_note_detail.js';
import { formatUserProfileText } from './get_profile.js';
import { getRecentPosts } from './get_recent_posts.js';
import { postNote, type PostNoteArgs } from './post.js';

export async function implLogin(): Promise<string> {
  const userProfile = await login();
  if (userProfile) {
    return `✅ 登录成功\n${formatUserProfileText(userProfile)}`;
  }
  return '❌ 登录失败';
}

export async function implCheckLogin(): Promise<string> {
  const { isLoggedIn, ttl } = await checkLoginState();
  let s = `登录状态: ${isLoggedIn ? '已登录' : '未登录'}`;
  if (ttl) {
    s += `\nCookie 有效期: ${ttl} 秒`;
  } else if (isLoggedIn) {
    s += '\nCookie 已过期';
  }
  return s;
}

export async function implGetOperationData(): Promise<string> {
  return getOperationData();
}

export async function implPosted(limit?: number): Promise<string> {
  return getRecentPosts(limit);
}

export async function implGetNoteDetail(noteId: string): Promise<string> {
  return getNoteDetail(noteId);
}

export async function implPost(args: PostNoteArgs): Promise<string> {
  try {
    const result = await postNote(args);
    return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}
