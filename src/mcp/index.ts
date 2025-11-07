#!/usr/bin/env node
// MCP 服务器入口


import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getTools } from './tools.js';
import {
  handleCheckLogin,
  handleGetOperationData,
  handleGetRecentNotes,
  handleGetNoteDetailById,
  handleReadPostingGuidelines,
  handleGetMyProfile,
  handleListQueuePosts,
  handleGetQueuePostDetail,
  handleCreateOrUpdatePost,
  handleGenerateCover,
  handleLogin,
  handleSaveExample,
} from './handlers.js';
import { loadFromCache } from '../utils/cache.js';
import { Note } from '../types/note.js';
import { listExamples, getExample } from '../core/examples.js';



// 1.创建 MCP 服务器实例
const server = new Server(
  {
    name: 'xhs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// 2.注册工具列表 
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getTools(),
  };
});



// 3.处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'xhs_login':
        return await handleLogin();

      case 'xhs_check_login':
        return await handleCheckLogin();

      case 'xhs_get_recent_notes':
        return await handleGetRecentNotes((args as any)?.limit);

      case 'xhs_get_operation_data':
        return await handleGetOperationData();

      case 'xhs_get_note_detail':
        return await handleGetNoteDetailById((args as any)?.noteId);

      case 'xhs_read_posting_guidelines':
        return await handleReadPostingGuidelines((args as any)?.generatePlan !== false);

      case 'xhs_get_my_profile':
        return await handleGetMyProfile();

      case 'xhs_list_queue_posts':
        return await handleListQueuePosts();

      case 'xhs_get_queue_post_detail':
        return await handleGetQueuePostDetail((args as any)?.filename);

      case 'xhs_create_or_update_post':
        return await handleCreateOrUpdatePost(
          (args as any)?.title,
          (args as any)?.content,
          (args as any)?.images,
          (args as any)?.textToCover,
          (args as any)?.scheduledPublishTime
        );
      case 'xhs_generate_cover':
        return await handleGenerateCover(
          (args as any)?.title,
          (args as any)?.templateId || '1'
        );
      case 'xhs_save_example':
        return await handleSaveExample(
          (args as any)?.filename,
          (args as any)?.content
        );
      default:
        throw new Error(`未知的工具: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `错误: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});


// 注册资源列表
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources: Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> = [
    {
      uri: 'xhs://notes',
      name: '小红书笔记',
      description: '小红书笔记资源',
      mimeType: 'application/json',
    },
  ];

  // 动态添加所有范文资源
  try {
    const examples = listExamples();
    for (const example of examples) {
      resources.push({
        uri: `xhs://examples/${encodeURIComponent(example.filename)}`,
        name: example.title,
        description: `范文: ${example.title}`,
        mimeType: 'text/plain',
      });
    }
  } catch (error) {
    // 如果获取范文列表失败，忽略错误，不影响其他资源
    console.error('获取范文列表失败:', error);
  }

  return { resources };
});


// 处理资源读取
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  // 处理笔记资源
  if (uri.startsWith('xhs://notes/')) {
    const noteId = uri.replace('xhs://notes/', '');
    const cachedDetail = loadFromCache<Note>(`notes/${noteId}.json`);
    if (cachedDetail) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(cachedDetail, null, 2),
          },
        ],
      };
    }
    throw new Error(`笔记 ${noteId} 未找到，请先使用 xhs_get_note_detail 获取笔记详情。`);
  }
  
  // 处理范文资源
  if (uri.startsWith('xhs://examples/')) {
    const filename = decodeURIComponent(uri.replace('xhs://examples/', ''));
    try {
      const example = getExample(filename);
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: example.content,
          },
        ],
      };
    } catch (error) {
      throw new Error(`范文 ${filename} 未找到: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  throw new Error(`未知的资源 URI: ${uri}`);
});




// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('小红书 MCP 服务器已启动');
}



main().catch((error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});
