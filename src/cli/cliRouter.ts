/**
 * CLI：子命令直接调用 toolset 中的 impl*；自然语言 Agent 由外部宿主集成。
 */
import { readFileSync, existsSync } from 'fs';
import {
  implLogin,
  implGetOperationData,
  implPosted,
  implGetNoteDetail,
  implPost,
  resolveSession,
} from '../toolset/index.js';
import {
  formatAccountListLines,
  addStoredAccount,
  setCurrentStoredAccount,
  loadAccountsRegistry,
  formatShowAccount,
  pickAccountSlug,
} from '../toolset/accountRegistry.js';
import {
  createDraft,
  listDrafts,
  loadDraft,
  approveDraft,
  postDraftById,
  formatDraftListItems,
  formatDraftShow,
  type DraftStatus,
} from '../toolset/drafts.js';
import { formatPublishedList, listPublished } from '../toolset/publishedRecords.js';

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
  console.error(`xhs-cli — 小红书命令行工具（多账号 / 草稿 / 本地归档）

用法与说明:
  xhs help
      显示本帮助（无子命令时也会打印本说明）

  # 会话与登录（可加 --account / login <slug>；未指定时用默认账号；仅一个已配置账号时自动选用；无账号配置时沿用 ~/.xhs-cli/.cache/browser-data）
  xhs login [--account <name> | <name>]
  xhs metrics --account <name>
  xhs recent [--account <name>] [--limit <n>]
  xhs posted [--account <name>]
  xhs detail <noteId> [--account <name>]
  xhs post (--title <标题> (--content <正文> | --content-file <路径>))
              [--image <路径>]... [--publish | --publish=true|false] [--account <name>]

  # 账号（配置存 ~/.xhs-cli/.cache/accounts/registry.json ，每账号独立 browser-data）
  xhs account list
  xhs account add <name>
  xhs account use <name>
  xhs account current
  xhs account show <name>

  # 草稿：直接 draft 创建；drafts 列表；通过后 draft post 走发帖（成功后写入本地 posted 归档）
  xhs draft [--account <name>] --title <标题> (--content | --content-file) [--image <路径>]...
      （registry 仅一个账号时可省略 --account）
  xhs drafts [--account <name>] [--status draft|approved|published]
  xhs draft show <id> [--account <name>]
  xhs draft approve <id> [--account <name>]
  xhs draft post <id> [--account <name>]

数据目录见 ~/.xhs-cli/.cache/（详见 README 与 src/config.ts）。
备注：不会在无人确认时擅自发帖；xhs post 的 --publish 与 draft post 由人工按需触发。
`);
}

/** 解析 `--key value` / `--key=value` / 布尔 `--flag` */
function parseOpts(argv: string[]): {
  rest: string[];
  flags: Set<string>;
  opts: Record<string, string>;
} {
  const rest: string[] = [];
  const flags = new Set<string>();
  const opts: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      rest.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        const k = a.slice(2, eq);
        opts[k] = a.slice(eq + 1);
        continue;
      }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        opts[key] = next;
        i += 1;
      } else {
        flags.add(key);
      }
      continue;
    }
    rest.push(a);
  }
  return { rest, flags, opts };
}

/** `post` 是否自动点击发布：显式 `--publish=<bool>` 优先于单独 `--publish` 开关 */
function resolvePostPublish(opts: Record<string, string>, flags: Set<string>): boolean {
  if (opts.publish !== undefined) {
    const v = opts.publish.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') {
      return true;
    }
    if (v === 'false' || v === '0' || v === 'no') {
      return false;
    }
  }
  return flags.has('publish');
}

function resolveSessionCli(explicitAccount?: string) {
  try {
    return resolveSession(explicitAccount?.trim());
  } catch (e) {
    die(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** `login [--account slug | slug]`：位置参数 slug 等价于 `--account`，二者不可同时使用。 */
function resolveLoginExplicitAccountSlug(
  opts: Record<string, string>,
  rest: string[],
): string | undefined {
  const fromFlag = opts.account?.trim();
  const positional = rest[0]?.trim();
  if (fromFlag && positional) {
    die('❌ 用法: login --account <name> 时不要附加位置参数（与 login <name> 请勿同时使用）');
  }
  if (!fromFlag && rest.length > 1) {
    die('❌ 用法: login [--account <name>] 或 login <name>');
  }
  if (opts.account !== undefined && !fromFlag) {
    die('❌ --account 需要非空账号名');
  }
  return fromFlag || positional || undefined;
}

/** 扫描 argv 中的重复 `--image <path>`（与解析顺序无关） */
function collectImagePaths(argv: string[]): string[] {
  const imagePaths: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (
      argv[i] === '--image' &&
      argv[i + 1] &&
      !argv[i + 1].startsWith('-')
    ) {
      imagePaths.push(argv[i + 1]);
      i += 1;
    }
  }
  return imagePaths;
}

function runAccountCommand(tail: string[]): void {
  const sub = tail[0]?.toLowerCase()?.trim();
  const rest = tail.slice(1);
  if (!sub || sub === 'help' || sub === '--help') {
    die(`❌ 用法: account list | add ... | use <name> | current | show <name>`);
    return;
  }
  try {
    if (sub === 'list') {
      console.log(formatAccountListLines());
      return;
    }
    if (sub === 'current') {
      const reg = loadAccountsRegistry();
      if (!reg.currentAccount) {
        const keys = Object.keys(reg.accounts);
        if (keys.length === 1) {
          console.log(
            `未设置默认账号；仅此一个已配置账号（${keys[0]}），login/post 等将自动使用该账号。`,
          );
        } else {
          console.log(
            '未设置默认账号；未指定 --account 时将使用 ~/.xhs-cli/.cache/browser-data 。',
          );
        }
      } else {
        console.log(`当前默认账号: ${reg.currentAccount}`);
      }
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
    if (sub === 'use') {
      const name = rest[0]?.trim();
      if (!name) {
        die('❌ 用法: account use <name>');
      }
      setCurrentStoredAccount(name);
      console.log(`✅ 已将默认账号设为: ${name}`);
      return;
    }
    if (sub === 'add') {
      const name = rest[0]?.trim();
      if (!name) {
        die('❌ 用法: account add <name>');
      }
      addStoredAccount({ name });
      console.log(`✅ 已添加账号: ${name}`);
      return;
    }
  } catch (e) {
    die(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
  die(`❌ 未知 account 子命令: ${sub}`);
}

async function runDraftCommand(tail: string[]): Promise<void> {
  const sub0 = tail[0]?.toLowerCase()?.trim();
  if (sub0 === 'create') {
    die('❌ 已移除子命令 create，请使用：xhs draft [--account <name>] --title <标题> (--content | --content-file) …');
  }
  if (sub0 === 'list') {
    die('❌ 请使用 xhs drafts 列出草稿');
  }
  if (sub0 === 'publish') {
    die('❌ draft publish 已改为：xhs draft post <id> [--account <name>]');
  }

  const draftSubcommands = new Set(['show', 'approve', 'post']);
  if (sub0 && draftSubcommands.has(sub0)) {
    const rest = tail.slice(1);
    try {
      if (sub0 === 'show') {
        const id = rest[0]?.trim();
        if (!id) {
          die('❌ 用法: draft show <id> [--account <name>]');
        }
        const { opts } = parseOpts(rest.slice(1));
        const d = loadDraft(id, opts.account?.trim());
        if (!d) {
          die(`❌ 未找到草稿: ${id}`);
        }
        console.log(formatDraftShow(d));
        return;
      }
      if (sub0 === 'approve') {
        const id = rest[0]?.trim();
        if (!id) {
          die('❌ 用法: draft approve <id> [--account <name>]');
        }
        const { opts } = parseOpts(rest.slice(1));
        approveDraft(id, opts.account?.trim());
        console.log(`✅ 已批准: ${id}`);
        return;
      }
      if (sub0 === 'post') {
        const id = rest[0]?.trim();
        if (!id) {
          die('❌ 用法: draft post <id> [--account <name>]');
        }
        const { opts } = parseOpts(rest.slice(1));
        console.log(await postDraftById(id, opts.account?.trim()));
        return;
      }
    } catch (e) {
      die(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try {
    const { opts } = parseOpts(tail);
    const explicitAcc = opts.account?.trim();
    const account = explicitAcc ?? pickAccountSlug(loadAccountsRegistry());
    if (!account) {
      die(
        '❌ draft 需要 --account <name>（已配置多个账号时须指定，或先执行 xhs account use <name>）',
      );
    }
    const title = opts.title?.trim();
    if (!title) {
      die('❌ draft 需要 --title <标题>');
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
    const d = createDraft({
      account,
      title,
      content,
      imagePaths: imagePaths.length > 0 ? imagePaths : undefined,
    });
    console.log(`✅ 草稿已创建: ${d.id}`);
  } catch (e) {
    die(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

function runDraftsCommand(tail: string[]): void {
  try {
    const { opts } = parseOpts(tail);
    let filter: DraftStatus | undefined;
    if (opts.status?.trim()) {
      const s = opts.status.trim().toLowerCase();
      if (s !== 'draft' && s !== 'approved' && s !== 'published') {
        die('❌ --status 必须是 draft | approved | published');
      }
      filter = s as DraftStatus;
    }
    console.log(
      formatDraftListItems(
        listDrafts({
          account: opts.account?.trim(),
          status: filter,
        }),
      ),
    );
  } catch (e) {
    die(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * 执行一条子命令（与传入 `process.argv` 切片语义一致，不含 `xhs` 本身）。
 */
export async function runOneCommand(argv: string[]): Promise<void> {
  if (argv.length === 0) {
    return;
  }

  const cmd = argv[0];
  const tail = argv.slice(1);

  if (cmd === 'account') {
    runAccountCommand(tail);
    return;
  }
  if (cmd === 'drafts') {
    runDraftsCommand(tail);
    return;
  }
  if (cmd === 'draft') {
    await runDraftCommand(tail);
    return;
  }

  if (cmd === 'published') {
    die('❌ published 已移除，请使用：xhs posted [--account <name>]');
  }

  if (cmd === 'login') {
    const { opts, rest } = parseOpts(tail);
    const slug = resolveLoginExplicitAccountSlug(opts, rest);
    console.log(await implLogin(resolveSessionCli(slug)));
    return;
  }
  if (cmd === 'metrics') {
    const { opts } = parseOpts(tail);
    const account = opts.account?.trim();
    if (!account) {
      die('❌ metrics 必须指定 --account <name>');
    }
    console.log(await implGetOperationData(resolveSessionCli(account)));
    return;
  }

  if (cmd === 'posted') {
    const { opts } = parseOpts(tail);
    console.log(formatPublishedList(listPublished(opts.account?.trim())));
    return;
  }

  if (cmd === 'recent') {
    const { opts } = parseOpts(tail);
    const lim = opts.limit !== undefined ? parseInt(opts.limit, 10) : undefined;
    if (opts.limit !== undefined && (Number.isNaN(lim!) || lim! < 1)) {
      die('❌ --limit 需为正整数');
    }
    console.log(
      await implPosted(lim, resolveSessionCli(opts.account)),
    );
    return;
  }

  if (cmd === 'detail' || cmd === 'note-detail') {
    const { opts, rest } = parseOpts(tail);
    const id = rest[0]?.trim();
    if (!id) {
      die('❌ 用法: detail <noteId> [--account <name>]');
    }
    console.log(await implGetNoteDetail(id, resolveSessionCli(opts.account)));
    return;
  }

  if (cmd === 'post') {
    const { opts, flags } = parseOpts(tail);
    const session = resolveSessionCli(opts.account);
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
  }
}
