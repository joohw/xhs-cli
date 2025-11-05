// CLI 工具入口
import { login } from './login.js';
import { checkLoginState } from './check_login_state.js';
import { getOperationDataCommand } from './get_operation_data.js';
import { getNoteStatisticsCommand } from './get_note_statistics.js';
import { getNoteDetailByIdCommand} from './get_note_detail_by_id.js';
import { getMyProfileCommand } from './get_my_profile.js';
import { setupCursor } from './setup_cursor.js';

// 获取命令行参数
const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);


// 命令映射
const commands: Record<string, () => Promise<void>> = {
  login: async () => {
    await login();
  },
  'check-login': async () => {
    try {
      const isLoggedIn = await checkLoginState();
      if (isLoggedIn) {
        console.log('✅ 已登录');
        process.exit(0);
      } else {
        console.log('❌ 未登录');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 登录失败或超时:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  },
  'get-operation-data': async () => {
    await getOperationDataCommand();
  },
  'get-note-statistics': async () => {
    await getNoteStatisticsCommand();
  },
  'get-note-detail-by-id': async () => {
    const noteId = commandArgs[0];
    await getNoteDetailByIdCommand(noteId);
  },
  'get-my-profile': async () => {
    await getMyProfileCommand();
  },
  'setup-cursor': async () => {
    await setupCursor();
  },
};


// 显示帮助信息
function showHelp() {
  console.log('可用命令:');
  console.log('  login                    - 登录小红书');
  console.log('  check-login              - 检查登录状态');
  console.log('  setup-cursor             - 一键配置 Cursor MCP 服务器');
  console.log('  get_operation_data       - 获取近期笔记运营数据');
  console.log('  get-note-statistics      - 获取近期笔记（从笔记管理页面）');
  console.log('  update-detailed-statistics - 更新缓存中的详细统计数据（从数据统计分析页面）');
  console.log('  get-note-detail-by-id    - 根据笔记ID获取笔记详情');
  console.log('  get-all-notes-detail     - 批量获取所有笔记的详情');
  console.log('  read-posting-guidelines  - 读取推文指导原则（重要）');
  console.log('');
  console.log('使用方法:');
  console.log('  npm run xhs <command> [args...]');
  console.log('');
  console.log('示例:');
  console.log('  npm run xhs login');
  console.log('  npm run xhs check-login');
  console.log('  npm run xhs setup-cursor     # 一键配置 Cursor MCP');
  console.log('  npm run xhs get-overall-data');
  console.log('  npm run xhs get-note-statistics');
  console.log('  npm run xhs update-detailed-statistics');
  console.log('  npm run xhs get-note-detail-by-id <noteId>');
  console.log('  npm run xhs get-all-notes-detail');
  console.log('  npm run xhs read-posting-guidelines');
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

