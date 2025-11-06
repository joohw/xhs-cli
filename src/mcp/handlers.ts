// MCP 工具处理器
// 协议层和业务逻辑层之间的适配器/中间件


import { login } from '../core/login.js';
import { checkLoginState } from '../core/check_login_state.js';
import { getOperationData } from '../core/get_operation_data.js';
import { getNoteDetail } from '../core/get_note_detail.js';
import { getRecentNotes } from '../core/get_recent_notes.js';
import { getMyProfile } from '../core/get_my_profile.js';
import { listQueuePost } from '../core/list_available_post.js';
import { loadPostFromQueue, createPost, PostNoteParams } from '../core/post.js';
import { generateCoverTitleOnly } from '../Illustrate/generateCover.js';
import { serializeNote, serializeNoteDetail } from '../types/note.js';
import { serializeOperationData } from '../types/operationData.js';
import { serializeUserProfile } from '../types/userProfile.js';
import { formatForMCP, formatErrorForMCP } from './format.js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { POST_QUEUE_DIR, COVER_IMAGES_DIR } from '../config.js';



// 登录状态详情
export async function handleLoginStatus() {
  try {
    const result = await checkLoginState();
    return formatForMCP(result, (data) => {
      const status = data.isLoggedIn ? '已登录' : '未登录';
      const ttlInfo = data.ttl !== null ? ` (TTL: ${data.ttl}秒)` : '';
      return `登录状态: ${status}${ttlInfo}`;
    });
  } catch (error) {
    return formatErrorForMCP(error);
  }
}


// 登录
export async function handleLogin() {
  try {
    const loginResult = await login();
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: loginResult,
            message: loginResult
              ? '登录成功或已处于登录状态'
              : '登录失败，请重试',
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 检查登录状态
export async function handleCheckLogin() {
  const { isLoggedIn } = await checkLoginState();
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          isLoggedIn,
          status: isLoggedIn ? '已登录' : '未登录',
          message: isLoggedIn
            ? '可以正常使用小红书功能'
            : '请先运行登录命令或通过浏览器登录',
        }, null, 2),
      },
    ],
  };
}



// 获取近期的运营数据
export async function handleGetOperationData() {
  try {
    const data = await getOperationData();
    return formatForMCP(data, serializeOperationData);
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 获取近期发布的笔记列表
export async function handleGetRecentNotes(limit?: number) {
  try {
    const data = await getRecentNotes();
    const limitedData = limit ? data.slice(0, limit) : data;
    return formatForMCP(
      {
        total: data.length,
        limit: limit || data.length,
        notes: limitedData,
      },
      () => limitedData.map(note => serializeNote(note)).join('\n\n')
    );
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 获取指定笔记的详情
export async function handleGetNoteDetailById(noteId: string) {
  try {
    if (!noteId) {
      return formatErrorForMCP(new Error('必须提供 noteId 参数。'));
    }
    const { isLoggedIn } = await checkLoginState();
    if (!isLoggedIn) {
      return formatErrorForMCP(new Error('未登录状态。请先确保已登录小红书。'));
    }
    const detail = await getNoteDetail(noteId);
    if (!detail) {
      return formatErrorForMCP(new Error(`无法获取笔记 ${noteId} 的详情。`));
    }
    return formatForMCP(detail, serializeNoteDetail);
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 读取发帖指导原则
export async function handleReadPostingGuidelines(generatePlan: boolean = true) {
  try {
    // 获取项目根目录路径
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // handlers.ts 在 src/mcp/ 目录下，需要向上两级到项目根目录
    const projectRoot = resolve(__dirname, '..', '..');
    const guidelinesPath = join(projectRoot, 'prompts', 'POSTING_GUIDELINES.md');
    if (!existsSync(guidelinesPath)) {
      return formatErrorForMCP(new Error(`发帖指导原则文件不存在: ${guidelinesPath}`));
    }
    const content = readFileSync(guidelinesPath, 'utf-8');
    return formatForMCP(
      {
        content,
        generatePlan,
      },
      () => content
    );
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 获取我的资料
export async function handleGetMyProfile() {
  try {
    const { isLoggedIn } = await checkLoginState();
    if (!isLoggedIn) {
      return formatErrorForMCP(new Error('未登录状态。请先确保已登录小红书。'));
    }
    const profile = await getMyProfile();
    return formatForMCP(profile, serializeUserProfile);
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 序列化待发布笔记列表项
function serializeQueuePostItem(post: { filename: string; title?: string; content: string; createdAt: Date; size: number }): string {
  const lines: string[] = [];
  lines.push(`📝 ${post.filename}`);
  if (post.title) {
    lines.push(`   标题: ${post.title}`);
  }
  const contentPreview = post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content;
  lines.push(`   内容预览: ${contentPreview}`);
  lines.push(`   创建时间: ${post.createdAt.toLocaleString('zh-CN')}`);
  lines.push(`   文件大小: ${(post.size / 1024).toFixed(2)} KB`);
  return lines.join('\n');
}


// 序列化待发布笔记详情
function serializeQueuePostDetail(params: PostNoteParams, filename: string): string {
  const lines: string[] = [];
  lines.push(`📝 待发布笔记详情: ${filename}`);
  lines.push('='.repeat(40));
  if (params.title) {
    lines.push(`标题: ${params.title}`);
  }
  lines.push(`内容:`);
  const contentLines = params.content.split('\n');
  contentLines.forEach(line => {
    lines.push(`  ${line}`);
  });
  if (params.images && params.images.length > 0) {
    lines.push(`图片 (${params.images.length}张):`);
    params.images.forEach((img, index) => {
      lines.push(`  ${index + 1}. ${img}`);
    });
  }
  if (params.tags && params.tags.length > 0) {
    lines.push(`标签: ${params.tags.join(', ')}`);
  }
  if (params.location) {
    lines.push(`位置: ${params.location}`);
  }
  if (params.draft !== undefined) {
    lines.push(`保存为草稿: ${params.draft ? '是' : '否'}`);
  }
  if (params.scheduledPublishTime) {
    lines.push(`计划发布时间: ${params.scheduledPublishTime}`);
  }
  lines.push('='.repeat(40));
  return lines.join('\n');
}


// 获取待发布的笔记列表
export async function handleListQueuePosts() {
  try {
    const posts = listQueuePost();
    return formatForMCP(
      {
        total: posts.length,
        posts: posts.map(post => ({
          filename: post.filename,
          title: post.title,
          contentPreview: post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content,
          createdAt: post.createdAt.toISOString(),
          size: post.size,
        })),
      },
      () => posts.length === 0 
        ? '📭 队列中没有待发布的笔记'
        : `📋 待发布队列 (共 ${posts.length} 个):\n\n${posts.map(post => serializeQueuePostItem(post)).join('\n\n')}`
    );
  } catch (error) {
    return formatErrorForMCP(error);
  }
}


// 获取待发布笔记的详情
export async function handleGetQueuePostDetail(filename: string) {
  try {
    if (!filename) {
      return formatErrorForMCP(new Error('必须提供 filename 参数。'));
    }
    const params = loadPostFromQueue(filename);
    return formatForMCP(
      {
        filename,
        ...params,
      },
      () => serializeQueuePostDetail(params, filename)
    );
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 创建或更新待发布的笔记
export async function handleCreateOrUpdatePost(title: string, params: PostNoteParams) {
  try {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return formatErrorForMCP(new Error('标题是必需的且不能为空'));
    }
    if (!params.content || typeof params.content !== 'string') {
      return formatErrorForMCP(new Error('content 字段是必需的且必须是字符串'));
    }
    // 生成文件名（复制 titleToFilename 的逻辑）
    let filename = title
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (filename.length > 200) {
      filename = filename.substring(0, 200);
    }
    if (!filename) {
      filename = 'untitled';
    }
    const queueFilename = `${filename}.json`;
    const queueFilePath = join(POST_QUEUE_DIR, queueFilename);
    const isUpdate = existsSync(queueFilePath);
    // 创建或更新
    const resultFilename = createPost(title, params);
    return formatForMCP(
      {
        filename: resultFilename,
        title,
        isUpdate,
        message: `笔记已${isUpdate ? '更新' : '创建'}: ${resultFilename}`,
      },
      () => `✅ 笔记已${isUpdate ? '更新' : '创建'}: ${resultFilename}\n标题: ${title}`
    );
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 生成封面图片
export async function handleGenerateCover(title: string, templateId: string = '1') {
  try {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return formatErrorForMCP(new Error('标题是必需的且不能为空'));
    }
    // 使用缓存目录作为输出目录
    const imagePath = await generateCoverTitleOnly(title, templateId, COVER_IMAGES_DIR);
    // 获取文件名
    const filename = imagePath.split(/[/\\]/).pop() || '';
    // 返回相对路径（相对于封面图片目录）
    const relativePath = `covers/${filename}`;
    return formatForMCP(
      {
        imagePath: relativePath,
        fullPath: imagePath,
        templateId,
        message: `封面已生成: ${relativePath}`,
      },
      () => `✅ 封面已生成: ${relativePath}\n完整路径: ${imagePath}`
    );
  } catch (error) {
    return formatErrorForMCP(error);
  }
}


