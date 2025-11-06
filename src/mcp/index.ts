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
  handleGetOverallData,
  handleGetRecentNotes,
  handleGetNoteDetailById,
  handleUpdateDetailedStatistics,
  handleReadPostingGuidelines,
  handleLoginStatus,
  handleLogin,
} from './handlers.js';
import { loadFromCache } from '../utils/cache.js';
import { Note } from '../types/note.js';



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
      case 'xhs_check_login':
        return await handleCheckLogin();

      case 'xhs_get_overall_data':
        return await handleGetOverallData();

      case 'xhs_get_recent_notes':
        return await handleGetRecentNotes((args as any)?.limit);

      case 'xhs_get_note_detail_by_id':
        return await handleGetNoteDetailById((args as any)?.noteId);

      case 'xhs_update_detailed_statistics':
        return await handleUpdateDetailedStatistics();

      case 'xhs_read_posting_guidelines':
        return await handleReadPostingGuidelines((args as any)?.generatePlan !== false);

      case 'xhs_login_status':
        return await handleLoginStatus();

      case 'xhs_login':
        return await handleLogin();

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
  return {
    resources: [
      {
        uri: 'xhs://notes',
        name: '小红书笔记',
        description: '小红书笔记资源',
        mimeType: 'application/json',
      },
    ],
  };
});


// 处理资源读取
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
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
    throw new Error(`笔记 ${noteId} 未找到，请先使用 xhs_get_note_detail_by_id 获取笔记详情。`);
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
