import { Type } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import {
  implLogin,
  implLogout,
  implCheckLogin,
  implGetOperationData,
  implGetRecentNotes,
  implGetNoteDetail,
  implGetMyProfile,
  implListQueuePosts,
  implGetQueuePostDetail,
  implWritePost,
  implGenerateCover,
  implPost,
  implSandboxReadFile,
  implSandboxWriteFile,
  implSandboxListDir,
  implReadPostingGuidelines,
} from './toolImplementations.js';
import { ensureAppDataLayout } from '../config.js';

function textResult(text: string): { content: [{ type: 'text'; text: string }]; details: Record<string, never> } {
  return { content: [{ type: 'text', text }], details: {} };
}

export function buildXhsAgentTools(): AgentTool[] {
  return [
    {
      name: 'xhs_login',
      label: '登录小红书',
      description: '打开浏览器完成小红书登录；成功后返回资料摘要',
      parameters: Type.Object({}),
      execute: async (_id, _params, _signal) => textResult(await implLogin()),
    },
    {
      name: 'xhs_logout',
      label: '退出登录',
      description: '清除浏览器用户数据目录，下次需重新登录',
      parameters: Type.Object({}),
      execute: async (_id, _params, _signal) => textResult(await implLogout()),
    },
    {
      name: 'xhs_check_login',
      label: '检查登录',
      description: '检查当前 Cookie / 登录是否有效',
      parameters: Type.Object({}),
      execute: async (_id, _params, _signal) => textResult(await implCheckLogin()),
    },
    {
      name: 'xhs_get_my_profile',
      label: '我的资料',
      description: '获取当前登录账号资料',
      parameters: Type.Object({}),
      execute: async (_id, _params, _signal) => textResult(await implGetMyProfile()),
    },
    {
      name: 'xhs_get_operation_data',
      label: '运营数据',
      description: '获取近期笔记运营数据',
      parameters: Type.Object({}),
      execute: async (_id, _params, _signal) => textResult(await implGetOperationData()),
    },
    {
      name: 'xhs_get_recent_notes',
      label: '近期笔记',
      description: '获取近期已发布笔记列表',
      parameters: Type.Object({
        limit: Type.Optional(Type.Number({ description: '最多返回条数，默认全部' })),
      }),
      execute: async (_id, params, _signal) => {
        const p = params as { limit?: number };
        return textResult(await implGetRecentNotes(p.limit));
      },
    },
    {
      name: 'xhs_get_note_detail',
      label: '笔记详情',
      description: '按笔记 ID 获取详情',
      parameters: Type.Object({
        noteId: Type.String({ description: '小红书笔记 ID' }),
      }),
      execute: async (_id, params, _signal) => {
        const p = params as { noteId: string };
        return textResult(await implGetNoteDetail(p.noteId));
      },
    },
    {
      name: 'xhs_list_queue_posts',
      label: '待发队列',
      description: '列出待发笔记队列中的文件及摘要',
      parameters: Type.Object({}),
      execute: async (_id, _params, _signal) => {
        ensureAppDataLayout();
        return textResult(await implListQueuePosts());
      },
    },
    {
      name: 'xhs_get_queue_post_detail',
      label: '队列笔记正文',
      description: '按队列文件名读取一篇待发笔记全文',
      parameters: Type.Object({
        filename: Type.String({ description: '队列 .txt 文件名，可带或不带后缀' }),
      }),
      execute: async (_id, params, _signal) => {
        ensureAppDataLayout();
        const p = params as { filename: string };
        return textResult(await implGetQueuePostDetail(p.filename));
      },
    },
    {
      name: 'xhs_write_post',
      label: '写入待发笔记',
      description: '在队列中创建或覆盖一篇笔记（标题作文件名键）',
      parameters: Type.Object({
        title: Type.String({ description: '标题' }),
        content: Type.String({ description: '正文（纯文本）' }),
        images: Type.Optional(Type.Array(Type.String({ description: '本地图片路径' }))),
      }),
      execute: async (_id, params, _signal) => {
        const p = params as { title: string; content: string; images?: string[] };
        return textResult(await implWritePost(p.title, p.content, p.images));
      },
    },
    {
      name: 'xhs_generate_cover',
      label: '生成封面',
      description: '为队列中某篇生成封面图（postName 无 .txt 后缀）',
      parameters: Type.Object({
        postName: Type.String({ description: '队列笔记名（与 .txt  basename 一致）' }),
      }),
      execute: async (_id, params, _signal) => {
        const p = params as { postName: string };
        return textResult(await implGenerateCover(p.postName));
      },
    },
    {
      name: 'xhs_post',
      label: '发布笔记',
      description: '打开创作者中心并填充指定队列笔记（需已登录与配图）',
      parameters: Type.Object({
        postName: Type.String({ description: '队列文件名，可带或不带 .txt' }),
      }),
      execute: async (_id, params, _signal) => {
        const p = params as { postName: string };
        return textResult(await implPost(p.postName));
      },
    },
    {
      name: 'xhs_sandbox_list_dir',
      label: '沙盒列目录',
      description:
        '列出 ~/.xhs-cli/.cache/sandbox 下相对路径中的条目；path 为空字符串表示沙盒根。仅允许相对路径，禁止 ..',
      parameters: Type.Object({
        path: Type.Optional(Type.String({ description: '相对沙盒根的路径，如 examples 或留空' })),
      }),
      execute: async (_id, params, _signal) => {
        ensureAppDataLayout();
        const p = params as { path?: string };
        return textResult(await implSandboxListDir(p.path));
      },
    },
    {
      name: 'xhs_sandbox_read_file',
      label: '沙盒读文件',
      description:
        '读取沙盒内 UTF-8 文本文件（相对路径，如 examples/foo.txt）。上限约 2MB。禁止绝对路径与 ..',
      parameters: Type.Object({
        path: Type.String({ description: '相对沙盒根的文件路径' }),
      }),
      execute: async (_id, params, _signal) => {
        ensureAppDataLayout();
        const p = params as { path: string };
        return textResult(await implSandboxReadFile(p.path));
      },
    },
    {
      name: 'xhs_sandbox_write_file',
      label: '沙盒写文件',
      description:
        '写入或覆盖沙盒内 UTF-8 文件，自动创建父目录。建议范文放在 examples/*.txt。上限约 2MB',
      parameters: Type.Object({
        path: Type.String({ description: '相对沙盒根的文件路径' }),
        content: Type.String({ description: '文件完整内容' }),
      }),
      execute: async (_id, params, _signal) => {
        ensureAppDataLayout();
        const p = params as { path: string; content: string };
        return textResult(await implSandboxWriteFile(p.path, p.content));
      },
    },
    {
      name: 'xhs_read_posting_guidelines',
      label: '发帖指南',
      description: '读取内置发帖指南 Markdown',
      parameters: Type.Object({}),
      execute: async (_id, _params, _signal) => textResult(await implReadPostingGuidelines()),
    },
  ];
}
