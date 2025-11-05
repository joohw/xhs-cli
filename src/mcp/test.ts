#!/usr/bin/env node
// MCP 服务器测试脚本
// 用于测试 MCP 工具是否正常工作

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getTools } from './tools.js';
import {
  handleCheckLogin,
  handleGetOverallData,
  handleGetNoteStatistics,
  handleGetNoteDetailById,
  handleLogin,
} from './handlers.js';

// 测试函数
async function testMCP() {
  console.log('🧪 开始测试 MCP 服务器...\n');

  // 测试1: 列出所有工具
  console.log('📋 测试1: 列出所有工具');
  const tools = getTools();
  console.log(`✅ 找到 ${tools.length} 个工具:`);
  tools.forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
  });
  console.log('');

  // 测试2: 检查登录状态
  console.log('📋 测试2: 检查登录状态');
  try {
    const loginStatus = await handleCheckLogin();
    const status = JSON.parse(loginStatus.content[0].text);
    console.log(`✅ 登录状态: ${status.status}`);
    console.log(`   消息: ${status.message}`);
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
  console.log('');

  // 测试3: 测试工具调用格式
  console.log('📋 测试3: 测试工具调用格式');
  try {
    // 模拟一个工具调用请求
    const mockRequest = {
      params: {
        name: 'xhs_check_login',
        arguments: {},
      },
    };

    const response = await handleCheckLogin();
    if (response.content && response.content.length > 0) {
      console.log('✅ 工具调用格式正确');
      console.log(`   返回内容数量: ${response.content.length}`);
      console.log(`   内容类型: ${response.content[0].type}`);
    } else {
      console.error('❌ 工具调用格式错误: 无内容');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
  console.log('');

  // 测试4: 测试错误处理
  console.log('📋 测试4: 测试错误处理');
  try {
    // 测试无效的 noteId
    const errorResponse = await handleGetNoteDetailById('');
    if (errorResponse.isError) {
      console.log('✅ 错误处理正常');
      console.log(`   错误消息: ${errorResponse.content[0].text}`);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
  console.log('');

  console.log('✅ MCP 服务器测试完成！');
  console.log('\n💡 提示:');
  console.log('   - 要测试完整功能，请先运行: npm run xhs login');
  console.log('   - 要测试 MCP 服务器，请运行: npm run dev');
  console.log('   - 要在 Claude Desktop 中使用，请配置 GUIDEFORMCP.md 中的说明');
}

// 运行测试
testMCP().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

