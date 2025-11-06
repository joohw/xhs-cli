#!/usr/bin/env node
// XHS-CLI 工具入口


import { login } from './core/login.js';
import { checkLoginState } from './core/check_login_state.js';
import { getOperationData } from './core/get_operation_data.js';
import { getNoteDetail} from './core/get_note_detail.js';
import { getMyProfile } from './core/get_my_profile.js';
import { getRecentNotes } from './core/get_recent_notes.js';
import { postNote, loadPostFromQueue, selectPostInteractively } from './core/post.js';
import { writePost } from './core/writePost.js';
import { listQueuePostCommand } from './core/list_available_post.js';
import { serializeOperationData } from './types/operationData.js';
import { serializeUserProfile } from './types/userProfile.js';
import { serializeNoteDetail } from './types/note.js';
import { POST_QUEUE_DIR } from './config.js';
import { join } from 'path';


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
    if (!noteId) {
      console.error('❌ 请提供笔记ID');
      console.error('使用方法: npm run xhs get-note-detail-by-id <noteId>');
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
    // 1. 检查是否提供了文件名参数，如果没有则交互式选择
    let queueFilename: string;
    if (commandArgs.length === 0 || !commandArgs[0]) {
      try {
        queueFilename = await selectPostInteractively();
      } catch (error) {
        process.exit(1);
      }
    } else {
      const filename = commandArgs[0];
      // 确保文件名以 .json 结尾
      queueFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    }
    // 2. 从缓存目录读取发帖队列文件
    let params;
    try {
      params = loadPostFromQueue(queueFilename);
    } catch (error) {
      console.error('❌ 读取发帖队列文件失败:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
    // 3. 发布笔记（传入队列文件名，成功后自动移动文件）
    try {
      const result = await postNote(params, queueFilename);
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
  'add-post': async () => {
    if (commandArgs.length === 0) {
      console.error('❌ 错误: 必须提供 post 内容');
      console.error('💡 使用方法: npm run xhs add-post <content> [--title <title>] [--images <images>] [--scheduled-time <time>]');
      console.error('💡 计划发布时间格式: ISO 8601 (如 "2024-01-01T10:00:00Z" 或 "2024-01-01 10:00:00")');
      process.exit(1);
    }
    let title: string | undefined;
    let images: string[] | undefined;
    let scheduledPublishTime: string | undefined;
    const content = commandArgs[0];
    // 解析参数
    for (let i = 1; i < commandArgs.length; i++) {
      const arg = commandArgs[i];
      if (arg === '--title' && i + 1 < commandArgs.length) {
        title = commandArgs[++i];
      } else if (arg === '--images' && i + 1 < commandArgs.length) {
        images = commandArgs[++i].split(',').map(img => img.trim());
      } else if (arg === '--scheduled-time' && i + 1 < commandArgs.length) {
        scheduledPublishTime = commandArgs[++i];
      }
    }
    try {
      const queueFilename = writePost(title, content, images, scheduledPublishTime);
      console.error(`✅ Post 已添加到队列: ${queueFilename}`);
      console.error(`📁 文件路径: ${join(POST_QUEUE_DIR, queueFilename)}`);
    } catch (error) {
      console.error('❌ 添加失败:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
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

