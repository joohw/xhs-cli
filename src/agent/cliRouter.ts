/**
 * CLI 入口：保留与历史一致的子命令，实现全部委托 toolImplementations。
 */
import { postNote, selectPostInteractively } from '../core/post.js';
import { listQueuePostCommand } from '../core/list_available_post.js';
import {
  implLogin,
  implLogout,
  implCheckLogin,
  implGetOperationData,
  implGetRecentNotes,
  implGetNoteDetail,
  implGetMyProfile,
  implWritePost,
} from './toolImplementations.js';
import { runAgentSession } from './runAgentSession.js';

/** 给人看的简要说明；`boot.md` 仅由 `xhs agent` 读入并作为 LLM system prompt，不在此输出 */
function printHelp(): void {
  console.error(`xhs-cli — 小红书 CLI

用法:
  xhs <子命令> [参数]
  xhs agent "<自然语言任务>"   （需配置 LLM API Key，会加载 src/agent/boot.md 作为系统提示补充）

账号与数据:
  login | logout | check-login
  get-my-profile | get-operation-data | get-recent-notes | get-note-detail <noteId>

队列与发布:
  write-post --title "…" --content "…" [--image 路径 …]
  list-post | post [队列文件名]

其它:
  help   显示本帮助

Agent 侧业务约定见源码包内 src/agent/boot.md（不通过本命令打印）。
`);
}

async function handleWritePostCli(args: string[]): Promise<void> {
  let title = '';
  let content = '';
  const images: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--title' && i + 1 < args.length) {
      title = args[++i];
    } else if (arg === '--content' && i + 1 < args.length) {
      content = args[++i];
    } else if (arg === '--image' && i + 1 < args.length) {
      images.push(args[++i]);
    } else if (arg === '--text-to-cover') {
      console.error('⚠️  --text-to-cover 请在 agent 模式下使用 xhs_generate_cover 工具');
    } else if (arg === '--help' || arg === '-h') {
      console.error('用法: xhs write-post --title "标题" --content "内容" [--image 路径 ...]');
      return;
    }
  }
  const msg = await implWritePost(title, content, images.length > 0 ? images : undefined);
  console.error(msg);
  if (msg.includes('❌') || msg.includes('失败')) {
    process.exit(1);
  }
}

export async function runCli(argv: string[]): Promise<void> {
  const command = argv[0];
  const commandArgs = argv.slice(1);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'agent') {
    await runAgentSession(commandArgs);
    return;
  }

  const fail = (msg: string) => {
    console.error(msg);
    process.exit(1);
  };

  switch (command) {
    case 'login': {
      const t = await implLogin();
      console.error(t);
      if (t.includes('❌')) process.exit(1);
      break;
    }
    case 'logout': {
      console.error(await implLogout());
      break;
    }
    case 'check-login': {
      console.error(await implCheckLogin());
      break;
    }
    case 'get-operation-data': {
      try {
        console.error(await implGetOperationData());
      } catch (e) {
        fail(`❌ 获取数据失败: ${e instanceof Error ? e.message : e}`);
      }
      break;
    }
    case 'get-recent-notes': {
      try {
        console.error('📥 获取近期笔记列表...\n');
        const t = await implGetRecentNotes();
        console.error(t);
        console.error('\n💾 笔记数据已保存到缓存（notes/）\n');
      } catch (e) {
        fail(`❌ 获取笔记列表失败: ${e instanceof Error ? e.message : e}`);
      }
      break;
    }
    case 'get-note-detail': {
      const noteId = commandArgs[0];
      if (!noteId) {
        fail('❌ 请提供笔记ID\n用法: xhs get-note-detail <noteId>');
      }
      try {
        console.error(await implGetNoteDetail(noteId));
      } catch (e) {
        fail(`❌ 获取笔记详情失败: ${e instanceof Error ? e.message : e}`);
      }
      break;
    }
    case 'get-my-profile': {
      try {
        console.error(await implGetMyProfile());
      } catch (e) {
        fail(`❌ 获取用户资料失败: ${e instanceof Error ? e.message : e}`);
      }
      break;
    }
    case 'post': {
      let queueFilename: string;
      if (commandArgs.length === 0 || !commandArgs[0]) {
        try {
          queueFilename = await selectPostInteractively();
        } catch {
          process.exit(1);
        }
      } else {
        const filename = commandArgs[0];
        queueFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
      }
      try {
        const result = await postNote(queueFilename);
        console.error(result.success ? `\n✅ ${result.message}` : `\n❌ ${result.message}`);
        if (result.noteUrl) {
          console.error(`🔗 链接: ${result.noteUrl}`);
        }
      } catch (e) {
        fail(`❌ 发布失败: ${e instanceof Error ? e.message : e}`);
      }
      break;
    }
    case 'list-post': {
      listQueuePostCommand();
      break;
    }
    case 'write-post': {
      try {
        await handleWritePostCli(commandArgs);
      } catch (e) {
        fail(`❌ 创建笔记失败: ${e instanceof Error ? e.message : e}`);
      }
      break;
    }
    default:
      console.error(`❌ 未知命令: ${command}\n`);
      printHelp();
      process.exit(1);
  }
}
