#!/usr/bin/env node
// XHS-CLI 工具入口


import { login } from './core/login.js';
import { checkLoginState } from './core/check_login_state.js';
import { getOperationData } from './core/get_operation_data.js';
import { getNoteDetail } from './core/get_note_detail.js';
import { getMyProfile } from './core/get_my_profile.js';
import { getRecentNotes } from './core/get_recent_notes.js';
import { postNote, selectPostInteractively } from './core/post.js';
import { listQueuePostCommand } from './core/list_available_post.js';
import { createPost } from './core/writePost.js';
import { serializeOperationData } from './types/operationData.js';
import { serializeUserProfile } from './types/userProfile.js';
import { serializeNote, serializeNoteDetail } from './types/note.js';
import { setupMCP } from './scripts/setup_mcp.js';



// 获取命令行参数
const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);



// 命令映射
const commands: Record<string, () => Promise<void>> = {
  'login': async () => {
    const userProfile = await login();
    if (userProfile) {
      console.error('✅ 登录成功\n');
      console.error(serializeUserProfile(userProfile));
    } else {
      console.error('❌ 登录失败\n');
      process.exit(1);
    }
  },
  'check-login': async () => {
    const { isLoggedIn, ttl } = await checkLoginState();
    console.error(`登录状态: ${isLoggedIn ? '已登录' : '未登录'}`);
    if (ttl) {
      console.error(`Cookie 有效期: ${ttl} 秒`);
    } else {
      console.error('Cookie 已过期');
    }
  },
  'get-operation-data': async () => {
    try {
      const data = await getOperationData();
      console.error(serializeOperationData(data));
    } catch (error) {
      console.error('❌ 获取数据失败:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  },
  'get-recent-notes': async () => {
    try {
      console.error('📥 获取近期笔记列表...\n');
      const data = await getRecentNotes();
      if (data.length === 0) {
        console.error('❌ 未找到笔记数据');
        return;
      }
      console.error(`\n📝 近期笔记列表 (共 ${data.length} 篇)\n`);
      console.error('='.repeat(60));
      data.forEach((note, index) => {
        console.error(`\n📄 笔记 ${index + 1}/${data.length}`);
        console.error('-'.repeat(40));
        console.error(serializeNote(note));
      });
      console.error('\n💾 笔记数据已保存到缓存（notes/ 文件夹）\n');
    } catch (error) {
      console.error('❌ 获取笔记列表失败:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  },
  'get-note-detail': async () => {
    const noteId = commandArgs[0];
    if (!noteId) {
      console.error('❌ 请提供笔记ID');
      console.error('使用方法: npm run xhs get-note-detail <noteId>');
      process.exit(1);
    }
    try {
      const detail = await getNoteDetail(noteId);
      if (!detail) {
        console.error(`❌ 无法获取笔记 ${noteId} 的详情`);
        process.exit(1);
      }
      console.error(serializeNoteDetail(detail));
    } catch (error) {
      console.error('❌ 获取笔记详情失败:', error);
      if (error instanceof Error) {
        console.error('错误信息:', error.message);
      }
      process.exit(1);
    }
  },
  'get-my-profile': async () => {
    try {
      const profile = await getMyProfile();
      console.error(serializeUserProfile(profile));
    } catch (error) {
      console.error('❌ 获取用户资料失败:', error);
      if (error instanceof Error) {
        console.error('错误信息:', error.message);
      }
      process.exit(1);
    }
  },
  'post': async () => {
    let queueFilename: string;
    if (commandArgs.length === 0 || !commandArgs[0]) {
      try {
        queueFilename = await selectPostInteractively();
      } catch (error) {
        process.exit(1);
      }
    } else {
      const filename = commandArgs[0];
      queueFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    }
    try {
      const result = await postNote(queueFilename);
      if (result.success) {
        console.error(`\n✅ ${result.message}`);
        if (result.noteUrl) {
          console.error(`🔗 链接: ${result.noteUrl}`);
        }
      } else {
        console.error(`\n❌ ${result.message}`);
      }
    } catch (error) {
      console.error('❌ 发布失败:', error);
      if (error instanceof Error) {
        console.error('错误信息:', error.message);
      }
      process.exit(1);
    }
  },
  'list-post': async () => {
    listQueuePostCommand();
  },
  'setup-mcp': async () => {
    const targets: ('claude' | 'cursor')[] = [];
    if (commandArgs.includes('--claude') || commandArgs.includes('--all')) {
      targets.push('claude');
    }
    if (commandArgs.includes('--cursor') || commandArgs.includes('--all')) {
      targets.push('cursor');
    }
    await setupMCP(targets.length > 0 ? targets : undefined);
  },
'write-post': async () => {
    // 解析命令行参数
    let title = '';
    let content = '';
    const images: string[] = [];
    let textToCover = false;
    let scheduledPublishTime: string | undefined;
    
    // 解析参数
    for (let i = 0; i < commandArgs.length; i++) {
      const arg = commandArgs[i];
      if (arg === '--title' && i + 1 < commandArgs.length) {
        title = commandArgs[++i];
      } else if (arg === '--content' && i + 1 < commandArgs.length) {
        content = commandArgs[++i];
      } else if (arg === '--image' && i + 1 < commandArgs.length) {
        images.push(commandArgs[++i]);
      } else if (arg === '--text-to-cover') {
        textToCover = true;
      } else if (arg === '--scheduled-time' && i + 1 < commandArgs.length) {
        scheduledPublishTime = commandArgs[++i];
      } else if (arg === '--help' || arg === '-h') {
        console.error('使用方法: xhs write-post --title "标题" --content "内容" [--text-to-cover] [--image 图片路径1] [--image 图片路径2] [--scheduled-time "YYYY-MM-DD HH:MM"]');
        console.error('示例:');
        console.error('  xhs write-post --title "我的笔记" --content "这是笔记内容" --image ./1.jpg --image ./2.png');
        console.error('  xhs write-post --title "我的笔记" --content "这是笔记内容" --text-to-cover');
        console.error('  xhs write-post --title "我的笔记" --content "这是笔记内容" --text-to-cover --image ./1.jpg --scheduled-time "2024-01-01 10:00"');
        return;
      }
    }
    try {
      const filename =await createPost(
        title,
        content,
        images.length > 0 ? images : undefined,
        textToCover,
        scheduledPublishTime
      );
      console.error(`✅ 笔记已成功创建: ${filename}`);
    } catch (error) {
      console.error('❌ 创建笔记失败:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  },
};




// 显示帮助信息
function showHelp() {
  const commandList = [
    { cmd: 'login', desc: '登录小红书' },
    { cmd: 'check-login', desc: '检查登录状态' },
    { cmd: 'get-my-profile', desc: '获取用户资料' },
    { cmd: 'get-operation-data', desc: '获取近期笔记运营数据' },
    { cmd: 'get-recent-notes', desc: '获取近期笔记列表' },
    { cmd: 'get-note-detail', desc: '根据笔记ID获取笔记详情' },
    { cmd: 'write-post', desc: '创建新的待发布笔记' },
    { cmd: 'post', desc: '发布笔记' },
    { cmd: 'list-post', desc: '列出所有待发布的笔记' },
    { cmd: 'setup-mcp', desc: '配置 MCP 服务器（Claude Desktop / Cursor）' },
  ];
  const maxCmdLength = Math.max(...commandList.map(item => item.cmd.length));
  console.error('可用命令:');
  for (const { cmd, desc } of commandList) {
    const padding = ' '.repeat(maxCmdLength - cmd.length);
    console.error(`  ${cmd}${padding}  - ${desc}`);
  }
}


// 主函数
async function main() {
  if (!command || !commands[command]) {
    if (command) {
      console.error(`❌ 未知命令: ${command}\n`);
    }
    showHelp();
    process.exit(command ? 1 : 0);
    return;
  }
  try {
    await commands[command]();
  } catch (error) {
    console.error('❌ 执行命令时出错:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  }
}


// 运行
main().catch(console.error);

