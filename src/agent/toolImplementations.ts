/**
 * 小红书能力实现：供 pi-agent 工具与 CLI 共用（单一事实来源）
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { login } from '../core/login.js';
import { logout } from '../core/logout.js';
import { checkLoginState } from '../core/check_login_state.js';
import { getOperationData } from '../core/get_operation_data.js';
import { getNoteDetail } from '../core/get_note_detail.js';
import { getMyProfile } from '../core/get_my_profile.js';
import { getRecentNotes } from '../core/get_recent_notes.js';
import { postNote } from '../core/post.js';
import { listQueuePost } from '../core/list_available_post.js';
import { createPost } from '../core/writePost.js';
import { generateCoverForPost } from '../core/generate_cover.js';
import {
  implSandboxReadFile as sandboxRead,
  implSandboxWriteFile as sandboxWrite,
  implSandboxListDir as sandboxList,
} from './sandboxFs.js';
import { serializeOperationData } from '../types/operationData.js';
import { serializeUserProfile } from '../types/userProfile.js';
import { serializeNote, serializeNoteDetail } from '../types/note.js';
import { POST_QUEUE_DIR, ensureAppDataLayout } from '../config.js';
import { getPromptsDir } from './paths.js';

export async function implLogin(): Promise<string> {
  const userProfile = await login();
  if (userProfile) {
    return `✅ 登录成功\n${serializeUserProfile(userProfile)}`;
  }
  return '❌ 登录失败';
}

export async function implLogout(): Promise<string> {
  const result = await logout();
  return result.removed
    ? `✅ 已清除浏览器登录缓存\n目录: ${result.userDataDir}`
    : `ℹ️ 未找到缓存，当前无登录状态\n目录: ${result.userDataDir}`;
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
  const data = await getOperationData();
  return serializeOperationData(data);
}

export async function implGetRecentNotes(limit?: number): Promise<string> {
  const data = await getRecentNotes();
  const slice = typeof limit === 'number' && limit > 0 ? data.slice(0, limit) : data;
  if (slice.length === 0) {
    return '未找到笔记数据';
  }
  return slice.map((note, i) => `--- 笔记 ${i + 1} ---\n${serializeNote(note)}`).join('\n\n');
}

export async function implGetNoteDetail(noteId: string): Promise<string> {
  const detail = await getNoteDetail(noteId);
  if (!detail) {
    return `无法获取笔记 ${noteId} 的详情`;
  }
  return serializeNoteDetail(detail);
}

export async function implGetMyProfile(): Promise<string> {
  const profile = await getMyProfile();
  return serializeUserProfile(profile);
}

export async function implListQueuePosts(): Promise<string> {
  const posts = listQueuePost();
  if (posts.length === 0) {
    return '队列中暂无待发笔记';
  }
  const lines = posts.map((p, i) => {
    const preview =
      p.content.length > 120 ? `${p.content.slice(0, 120)}…` : p.content;
    return `${i + 1}. ${p.filename}\n   标题: ${p.title ?? ''}\n   预览: ${preview}\n   时间: ${p.createdAt.toISOString()}`;
  });
  return `共 ${posts.length} 篇待发:\n\n${lines.join('\n\n')}`;
}

export async function implGetQueuePostDetail(filename: string): Promise<string> {
  ensureAppDataLayout();
  const name = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  const filePath = join(POST_QUEUE_DIR, name);
  if (!existsSync(filePath)) {
    return `队列文件不存在: ${name}`;
  }
  const content = readFileSync(filePath, 'utf-8');
  return `文件: ${name}\n\n${content}`;
}

export async function implWritePost(
  title: string,
  content: string,
  images?: string[]
): Promise<string> {
  const filename = await createPost(title, content, images && images.length > 0 ? images : undefined);
  return `✅ 笔记已写入队列: ${filename}`;
}

export async function implGenerateCover(postName: string): Promise<string> {
  const name = postName.endsWith('.txt') ? postName.slice(0, -4) : postName;
  await generateCoverForPost(name);
  return `✅ 已为「${name}」生成封面（0.png）`;
}

export async function implPost(postName: string): Promise<string> {
  const filename = postName.endsWith('.txt') ? postName : `${postName}.txt`;
  const result = await postNote(filename);
  return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
}

export async function implSandboxReadFile(relativePath: string): Promise<string> {
  try {
    return sandboxRead(relativePath);
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function implSandboxWriteFile(relativePath: string, content: string): Promise<string> {
  try {
    return sandboxWrite(relativePath, content);
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function implSandboxListDir(relativeDir?: string): Promise<string> {
  try {
    return sandboxList(relativeDir ?? '');
  } catch (e) {
    return `❌ ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function implReadPostingGuidelines(): Promise<string> {
  const path = join(getPromptsDir(), 'POSTING_GUIDELINES.md');
  if (!existsSync(path)) {
    return `未找到发帖指南: ${path}`;
  }
  return readFileSync(path, 'utf-8');
}
