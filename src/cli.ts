#!/usr/bin/env node
// XHS-CLI 工具入口


import { login } from './core/login.js';
import { checkLoginState } from './core/check_login_state.js';
import { getOperationData } from './core/get_operation_data.js';
import { getNoteDetailByIdCommand } from './core/get_note_detail.js';
import { getMyProfileCommand } from './core/get_my_profile.js';
import { getRecentNotes } from './core/get_recent_notes.js';
import { postNoteCommand, addPostCommand } from './core/post.js';
import { listQueuePostCommand } from './core/list_available_post.js';
import { serializeOperationData } from './types/operationData.js';
import { serializeUserProfile } from './types/userProfile.js';


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
    await checkLoginState();
  },
  'get-operation-data': async () => {
    try {
      const data = await getOperationData();
      console.error('💾 运营数据已缓存\n');
      console.error(serializeOperationData(data));
    } catch (error) {
      console.error('❌ 获取数据失败:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  },
  'get-recent-notes': async () => {
    await getRecentNotes(); // CLI 调用时忽略返回值
  },
  'get-note-detail-by-id': async () => {
    const noteId = commandArgs[0];
    await getNoteDetailByIdCommand(noteId);
  },
  'get-my-profile': async () => {
    await getMyProfileCommand();
  },
  'post': async () => {
    await postNoteCommand(commandArgs);
  },
  'add-post': async () => {
    addPostCommand(commandArgs);
  },
  'list-available-post': async () => {
    listQueuePostCommand();
  },
};




// 显示帮助信息，Todo: 所有命令都完成之后再写这个
function showHelp() {
  console.error('可用命令:');
  console.error('  login                    - 登录小红书');
  console.error('  check-login              - 检查登录状态');
  console.error('  get-operation-data       - 获取近期笔记运营数据');
  console.error('  get-note-statistics      - 获取近期笔记（从笔记管理页面）');
  console.error('  update-detailed-statistics - 更新缓存中的详细统计数据（从数据统计分析页面）');
  console.error('  get-note-detail-by-id    - 根据笔记ID获取笔记详情');
  console.error('  get-all-notes-detail     - 批量获取所有笔记的详情');
  console.error('  read-posting-guidelines  - 读取推文指导原则（重要）');
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

