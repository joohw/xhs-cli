/**
 * CLI：子命令直接调用 toolset 中的 impl*；自然语言 Agent 由外部宿主集成。
 * 无参数时进入交互模式，逐行解析与 `xhs <argv...>` 相同的命令。
 */
import { readFileSync, existsSync } from 'fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
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
} from '../toolset/accountRegistry.js';
import {
  createDraft,
  listDrafts,
  loadDraft,
  approveDraft,
  publishDraftById,
  formatDraftListItems,
  formatDraftShow,
  type DraftStatus,
} from '../toolset/drafts.js';
import { formatPublishedList, listPublished } from '../toolset/publishedRecords.js';
import { printXhsInteractiveBanner } from './banner.js';

class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

function die(msg: string): never {
  throw new CliError(msg);
}

/** `readline.question` 在 Ctrl+C 时会抛出 AbortError，视为正常结束而非业务错误 */
export function isReadlineAbortError(e: unknown): boolean {
  if (e === null || typeof e !== 'object') {
    return false;
  }
  const err = e as { name?: string; code?: string };
  return err.name === 'AbortError' || err.code === 'ABORT_ERR';
}

/** 类 shell 分词：支持双引号、单引号包裹含空格的参数 */
function splitShellLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) {
        quote = null;
      } else {
        cur += c;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur.length > 0) {
        out.push(cur);
        cur = '';
      }
      continue;
    }
    cur += c;
  }
  if (cur.length > 0) {
    out.push(cur);
  }
  return out;
}

function printHelp(): void {
  console.error(`xhs-cli — 小红书命令行工具（多账号 / 草稿 / 本地归档）

用法与说明:
  xhs
      进入交互模式；提示符 xhs> ，exit / quit 退出；Ctrl+C 正常结束
  xhs help
      显示本帮助

  # 会话与登录（可加 --account <slug>；未指定时用当前默认账号；无配置时沿用 ~/.xhs-cli/.cache/browser-data）
  xhs login [--account <name>]
  xhs metrics [--account <name>]
  xhs posted [--account <name>] [--limit <n>]
  xhs note-detail <noteId> [--account <name>]
  xhs post (--title <标题> (--content <正文> | --content-file <路径>))
              [--image <路径>]... [--publish | --publish=true|false] [--account <name>]

  # 账号（配置存 ~/.xhs-cli/.cache/accounts/registry.json ，每账号独立 browser-data）
  xhs account list
  xhs account add <name> [--display-name <显示名>] [--role <role>]
  xhs account use <name>
  xhs account current
  xhs account show <name>

  # 草稿：创建 → approve → publish（publish 仅在成功发布后更新状态并写入 published）
  xhs draft create --account <name> --title <标题> (--content | --content-file) [--image <路径>]...
  xhs draft list [--account <name>] [--status draft|approved|published]
  xhs draft show <id>
  xhs draft approve <id>
  xhs draft publish <id>

  xhs published list [--account <name>]

数据目录见 ~/.xhs-cli/.cache/（详见 README 与 src/config.ts）。
备注：不会在无人确认时擅自发帖；草稿 publish / post --publish 由人工按需触发。
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
        console.log(
          '未设置默认账号；未指定 --account 时将使用 ~/.xhs-cli/.cache/browser-data 。',
        );
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
        die('❌ 用法: account add <name> [--display-name ...] [--role ...]');
      }
      const { opts } = parseOpts(rest.slice(1));
      const displayName =
        opts['display-name']?.trim() || opts.displayName?.trim() || name;
      const role = opts.role?.trim() || 'general';
      addStoredAccount({ name, displayName, role });
      console.log(`✅ 已添加账号: ${name}`);
      return;
    }
  } catch (e) {
    die(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
  die(`❌ 未知 account 子命令: ${sub}`);
}

async function runDraftCommand(tail: string[]): Promise<void> {
  const sub = tail[0]?.toLowerCase()?.trim();
  const rest = tail.slice(1);
  if (!sub) {
    die('❌ 用法: draft create | list | show | approve | publish ...');
    return;
  }
  try {
    if (sub === 'create') {
      const { opts } = parseOpts(rest);
      const account = opts.account?.trim();
      const title = opts.title?.trim();
      if (!account) {
        die('❌ draft create 需要 --account <name>');
      }
      if (!title) {
        die('❌ draft create 需要 --title <标题>');
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
      const imagePaths = collectImagePaths(rest);
      const d = createDraft({
        account,
        title,
        content,
        imagePaths: imagePaths.length > 0 ? imagePaths : undefined,
      });
      console.log(`✅ 草稿已创建: ${d.id}`);
      return;
    }
    if (sub === 'list') {
      const { opts } = parseOpts(rest);
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
      return;
    }
    if (sub === 'show') {
      const id = rest[0]?.trim();
      if (!id) {
        die('❌ 用法: draft show <id>');
      }
      const d = loadDraft(id);
      if (!d) {
        die(`❌ 未找到草稿: ${id}`);
      }
      console.log(formatDraftShow(d));
      return;
    }
    if (sub === 'approve') {
      const id = rest[0]?.trim();
      if (!id) {
        die('❌ 用法: draft approve <id>');
      }
      approveDraft(id);
      console.log(`✅ 已批准: ${id}`);
      return;
    }
    if (sub === 'publish') {
      const id = rest[0]?.trim();
      if (!id) {
        die('❌ 用法: draft publish <id>');
      }
      console.log(await publishDraftById(id));
      return;
    }
  } catch (e) {
    die(`❌ ${e instanceof Error ? e.message : String(e)}`);
  }
  die(`❌ 未知 draft 子命令: ${sub}`);
}

function runPublishedCommand(tail: string[]): void {
  const sub = tail[0]?.toLowerCase()?.trim();
  const rest = tail.slice(1);
  if (!sub || sub === 'list') {
    const { opts } = parseOpts(rest);
    console.log(formatPublishedList(listPublished(opts.account?.trim())));
    return;
  }
  die('❌ 用法: published list [--account <name>]');
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
  if (cmd === 'draft') {
    await runDraftCommand(tail);
    return;
  }
  if (cmd === 'published') {
    runPublishedCommand(tail);
    return;
  }

  if (cmd === 'login') {
    const { opts } = parseOpts(tail);
    console.log(await implLogin(resolveSessionCli(opts.account)));
    return;
  }
  if (cmd === 'metrics') {
    const { opts } = parseOpts(tail);
    console.log(await implGetOperationData(resolveSessionCli(opts.account)));
    return;
  }

  if (cmd === 'posted') {
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

  if (cmd === 'note-detail') {
    const { opts, rest } = parseOpts(tail);
    const id = rest[0]?.trim();
    if (!id) {
      die('❌ 用法: note-detail <noteId> [--account <name>]');
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

  die(`❌ 未知命令 “${cmd}”。输入 help 查看用法。`);
}

async function runInteractiveLoop(): Promise<void> {
  const rl = createInterface({ input, output, terminal: true });
  printXhsInteractiveBanner();
  console.error('交互模式：account / draft / published；login [--account]；metrics；posted；note-detail；post；help；exit。\n');
  try {
    for (;;) {
      let line: string;
      try {
        line = await rl.question('xhs> ');
      } catch (e) {
        if (isReadlineAbortError(e)) {
          break;
        }
        throw e;
      }
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      if (/^(exit|quit)$/i.test(trimmed)) {
        break;
      }
      if (/^help$/i.test(trimmed)) {
        printHelp();
        continue;
      }
      const argv = splitShellLine(trimmed);
      try {
        await runOneCommand(argv);
      } catch (e) {
        if (e instanceof CliError) {
          console.error(e.message);
        } else {
          console.error(e instanceof Error ? e.message : e);
        }
      }
    }
  } finally {
    rl.close();
  }
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
    await runInteractiveLoop();
    return;
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
