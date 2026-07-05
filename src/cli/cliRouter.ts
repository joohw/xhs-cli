/**
 * CLI：子命令直接调用 toolset 中的 impl*；自然语言 Agent 由外部宿主集成。
 */
import { readFileSync, existsSync } from 'fs';
import { detachBrowserSession } from '../browser/index.js';
import {
  implLogin,
  implGetOperationData,
  implPosted,
  implGetNoteDetail,
  implPost,
  implBrowserCommentPost,
  implBrowserHomePosts,
  implBrowserOpenPost,
  implBrowserSearchPosts,
  implBrowserUnreadMessages,
  resolveSession,
} from '../toolset/index.js';
import {
  formatAccountListLines,
  addStoredAccount,
  formatShowAccount,
  setCurrentAccount,
  getCurrentAccount,
} from '../toolset/accountRegistry.js';
import { resolveAccountSlug } from '../toolset/sessionResolve.js';
import { DEFAULT_ARTICLE_TEMPLATE_NAME, formatArticleTemplateNames } from '../toolset/articleTemplates.js';
import { formatPublishedList, listPublished } from '../toolset/publishedRecords.js';
import {
  parseOpts,
  resolvePostPublish,
  accountFromOpts as readAccountFromOpts,
  collectImagePaths,
} from './parseArgs.js';

class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

function die(msg: string): never {
  throw new CliError(msg);
}

function printHelp(): void {
  console.error(`xhs-cli — 小红书命令行工具（多账号 / 本地归档）

用法与说明:
  xhs help
      显示本帮助（无子命令时也会打印本说明）

  # 业务命令默认使用当前账号（xhs account use）；临时切换用 --account <name>
  xhs login [--account <name>]
  xhs metrics [--account <name>]
  xhs recent [--limit <n>] [--account <name>]
  xhs posted [--account <name>]
  xhs detail <noteId> [--account <name>]
  xhs post (--title <标题> (--content <正文> | --content-file <路径>))
              [--image <路径>]... [--publish | --publish=true|false]
      --image 可重复，至少 1 张、最多 18 张

  # 账号（配置存 ~/.xhs-cli/.cache/accounts/registry.json ，每账号独立 browser-data）
  xhs account list
  xhs account add <name>
  xhs account show <name>
  xhs account use <name>
  xhs account current

数据目录见 ~/.xhs-cli/.cache/（详见 README 与 src/config.ts）。
备注：不会在无人确认时擅自发帖；xhs post 的 --publish 由人工按需触发。
`);
}

function resolveSessionCli(explicitAccount?: string) {
  try {
    const slug = explicitAccount?.trim();
    return resolveSession(slug || undefined);
  } catch (e) {
    die(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** 仅读取 `--account`；未指定时由 resolveSession 使用 registry 当前账号。 */
function accountFromOpts(opts: Record<string, string>): string | undefined {
  if (opts.account !== undefined && !opts.account.trim()) {
    die('❌ --account 需要非空账号名');
  }
  return readAccountFromOpts(opts);
}

function runAccountCommand(tail: string[]): void {
  const sub = tail[0]?.toLowerCase()?.trim();
  const rest = tail.slice(1);
  if (!sub || sub === 'help' || sub === '--help') {
    die(`❌ 用法: account list | add <name> | show <name> | use <name> | current`);
    return;
  }
  try {
    if (sub === 'use') {
      const name = rest[0]?.trim();
      if (!name) {
        die('❌ 用法: account use <name>');
      }
      setCurrentAccount(name);
      console.log(`✅ 当前账号: ${name}`);
      return;
    }
    if (sub === 'current') {
      try {
        const slug = resolveAccountSlug();
        console.log(slug);
      } catch (e) {
        die(`❌ ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }
    if (sub === 'list') {
      console.log(formatAccountListLines());
      return;
    }
    if (sub === 'show') {
      const name = rest[0]?.trim();
      if (!name) {
        die('❌ 用法: account show <name>');
      }
      console.log(formatShowAccount(name));
      return;
    }
    if (sub === 'add') {
      const name = rest[0]?.trim();
      if (!name) {
        die('❌ 用法: account add <name>');
      }
      addStoredAccount({ name });
      const cur = getCurrentAccount();
      console.log(
        cur === name
          ? `✅ 已添加账号: ${name}（已设为当前账号）`
          : `✅ 已添加账号: ${name}`,
      );
      return;
    }
  } catch (e) {
    die(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
  die(`❌ 未知 account 子命令: ${sub}`);
}

function parsePositiveIntOption(opts: Record<string, string>, name: string): number | undefined {
  if (opts[name] === undefined) return undefined;
  const value = Number(opts[name]);
  if (!Number.isInteger(value) || value < 1) die(`❌ --${name} 需为正整数`);
  return value;
}

async function runBrowserCommand(tail: string[]): Promise<void> {
  const sub = tail[0]?.toLowerCase()?.trim();
  const rest = tail.slice(1);
  if (!sub || sub === 'help' || sub === '--help') {
    die('❌ 用法: browser login | home [--limit <n>] | search <关键词> [--limit <n>] | unread [--limit <n>] | open <noteId|url> | comment <noteId|url> --content <评论>');
    return;
  }

  if (sub === 'login') {
    const { opts, flags } = parseOpts(rest);
    console.log(await implLogin(resolveSessionCli(accountFromOpts(opts))));
    return;
  }

  if (sub === 'home') {
    const { opts, flags } = parseOpts(rest);
    console.log(
      await implBrowserHomePosts(
        parsePositiveIntOption(opts, 'limit'),
        resolveSessionCli(accountFromOpts(opts)),
      ),
    );
    return;
  }

  if (sub === 'search') {
    const { opts, flags, rest: args } = parseOpts(rest);
    const keyword = args.join(' ').trim();
    if (!keyword) {
      die('❌ 用法: browser search <关键词> [--limit <n>]');
    }
    console.log(
      await implBrowserSearchPosts(
        keyword,
        parsePositiveIntOption(opts, 'limit'),
        resolveSessionCli(accountFromOpts(opts)),
      ),
    );
    return;
  }

  if (sub === 'unread') {
    const { opts, flags } = parseOpts(rest);
    console.log(
      await implBrowserUnreadMessages(
        parsePositiveIntOption(opts, 'limit'),
        resolveSessionCli(accountFromOpts(opts)),
      ),
    );
    return;
  }

  if (sub === 'open') {
    const { opts, flags, rest: args } = parseOpts(rest);
    const noteRef = args[0]?.trim();
    if (!noteRef) {
      die('❌ 用法: browser open <noteId|url>');
    }
    console.log(await implBrowserOpenPost(noteRef, resolveSessionCli(accountFromOpts(opts))));
    return;
  }

  if (sub === 'comment') {
    const { opts, flags, rest: args } = parseOpts(rest);
    const noteRef = args[0]?.trim();
    if (!noteRef) {
      die('❌ 用法: browser comment <noteId|url> (--content <评论> | --content-file <路径>) [--dry-run]');
    }
    let content = opts.content ?? '';
    if (opts['content-file']) {
      const p = opts['content-file'];
      if (!existsSync(p)) {
        die(`❌ 找不到文件: ${p}`);
      }
      content = readFileSync(p, 'utf-8');
    }
    if (!content.trim()) {
      die('❌ 请提供 --content 或 --content-file');
    }
    console.log(
      await implBrowserCommentPost(
        noteRef,
        content,
        { dryRun: flags.has('dry-run') },
        resolveSessionCli(accountFromOpts(opts)),
      ),
    );
    return;
  }

  die(`❌ 未知 browser 子命令: ${sub}`);
}

/**
 * 执行一条子命令（与传入 `process.argv` 切片语义一致，不含 `xhs` 本身）。
 */
export async function runOneCommand(argv: string[]): Promise<void> {
  if (argv.length === 0) {
    return;
  }

  const cmd = argv[0];
  if (cmd === 'login' || cmd === 'post') {
    process.env.XHS_BROWSER_HEADLESS = 'false';
  }
  const tail = argv.slice(1);

  if (cmd === 'account') {
    runAccountCommand(tail);
    return;
  }
  if (cmd === 'drafts' || cmd === 'draft') {
    die('❌ 本地草稿功能已移除，请使用：xhs post --title <标题> (--content | --content-file) --image <路径> …');
  }

  if (cmd === 'published') {
    die('❌ published 已移除，请使用：xhs posted [--account <name>]');
  }
  if (cmd === 'browser') {
    await runBrowserCommand(tail);
    return;
  }

  if (cmd === 'login') {
    const { opts, rest } = parseOpts(tail);
    if (rest.length > 0) {
      die('❌ 用法: login [--account <name>]');
    }
    const session = resolveSessionCli(accountFromOpts(opts));
    const msg = await implLogin(session);
    if (msg.startsWith('✅')) {
      setCurrentAccount(session.account);
    }
    console.log(msg);
    return;
  }
  if (cmd === 'metrics') {
    const { opts, rest } = parseOpts(tail);
    if (rest.length > 0) {
      die('❌ 用法: metrics [--account <name>]');
    }
    console.log(await implGetOperationData(resolveSessionCli(accountFromOpts(opts))));
    return;
  }

  if (cmd === 'posted') {
    const { opts, rest } = parseOpts(tail);
    if (rest.length > 0) {
      die('❌ 用法: posted [--account <name>]');
    }
    const session = resolveSessionCli(accountFromOpts(opts));
    console.log(formatPublishedList(listPublished(session.account)));
    return;
  }

  if (cmd === 'recent') {
    const { opts, rest } = parseOpts(tail);
    if (rest.length > 0) {
      die('❌ 用法: recent [--limit <n>] [--account <name>]');
    }
    const lim = opts.limit !== undefined ? parseInt(opts.limit, 10) : undefined;
    if (opts.limit !== undefined && (Number.isNaN(lim!) || lim! < 1)) {
      die('❌ --limit 需为正整数');
    }
    console.log(
      await implPosted(lim, resolveSessionCli(accountFromOpts(opts))),
    );
    return;
  }

  if (cmd === 'detail' || cmd === 'note-detail') {
    const { opts, rest } = parseOpts(tail);
    const id = rest[0]?.trim();
    if (!id || rest.length > 1) {
      die('❌ 用法: detail <noteId> [--account <name>]');
    }
    console.log(await implGetNoteDetail(id, resolveSessionCli(accountFromOpts(opts))));
    return;
  }

  if (cmd === 'post') {
    const { opts, flags, rest } = parseOpts(tail);
    if (rest.length > 0) {
      die('❌ 用法: post --title <标题> (--content | --content-file) --image <路径> … [--account <name>]');
    }
    const session = resolveSessionCli(accountFromOpts(opts));
    const title = opts.title?.trim();
    if (!title) {
      die('❌ post 需要 --title <标题>');
    }
    let content = opts.content ?? '';
    if (opts['content-file']) {
      const p = opts['content-file'];
      if (!existsSync(p)) {
        die(`❌ 找不到文件: ${p}`);
      }
      content = readFileSync(p, 'utf-8');
    }
    if (!content.trim()) {
      die('❌ 请提供 --content 或 --content-file');
    }
    const imagePaths = collectImagePaths(tail);
    if (imagePaths.length === 0) {
      die('❌ 至少需要一张图片: 重复 --image <本地路径>（1～18 张）');
    }
    console.log(
      await implPost({
        title,
        content,
        imagePaths,
        publish: resolvePostPublish(opts, flags),
        browserUserDataDir: session.browserUserDataDir,
      }),
    );
    return;
  }

  die(`❌ 未知命令 “${cmd}”。请使用 xhs help 查看用法。`);
}

function handleCliError(e: unknown): void {
  if (e instanceof CliError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}

export async function runCli(argv: string[]): Promise<void> {
  if (argv.length === 0) {
    console.error('❌ 请提供子命令，例如 xhs help、xhs login …\n');
    printHelp();
    process.exit(1);
  }

  if (argv[0] === 'help' || argv[0] === '--help' || argv[0] === '-h') {
    printHelp();
    return;
  }

  try {
    await runOneCommand(argv);
  } catch (e) {
    handleCliError(e);
  } finally {
    await detachBrowserSession().catch(() => {});
  }
}
