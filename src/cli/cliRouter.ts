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
} from '../toolset/toolImplementations.js';
import { printXhsInteractiveBanner } from '../toolset/loginBanner.js';

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
  console.error(`xhs-cli — 小红书命令行工具

用法与说明:
  xhs
      进入交互模式；提示符 xhs> ，exit / quit 退出；Ctrl+C 正常结束
  xhs help
      显示本帮助
  xhs login
      打开浏览器，在创作者中心完成登录（Cookie 写入 ~/.xhs-cli/.cache/）
  xhs metrics
      拉取创作者后台运营数据摘要（需已登录）
  xhs posted [--limit <n>]
      列出已发布笔记列表；--limit 限制条数（可选）
  xhs note-detail <noteId>
      按笔记 ID 查看单篇详情与数据（需已登录）
  xhs post --title <标题> (--content <正文> | --content-file <路径>)
              [--image <路径>]... [--publish | --publish=true|false]
      打开发布页并填入标题、正文与本地图片；--image 至少 1 张、最多 18 张，顺序即上传顺序；无待发队列，仅本次参数生效
      默认仅填表（有界面，填完后窗口保留供确认）；加 --publish 或 --publish=true 时在填表后自动点击「发布」

数据目录见 ~/.xhs-cli/.cache/（详见 src/config.ts）。
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

/**
 * 执行一条子命令（与传入 `process.argv` 切片语义一致，不含 `xhs` 本身）。
 */
export async function runOneCommand(argv: string[]): Promise<void> {
  if (argv.length === 0) {
    return;
  }

  const cmd = argv[0];
  const tail = argv.slice(1);

  if (cmd === 'login') {
    console.log(await implLogin());
    return;
  }
  if (cmd === 'metrics') {
    console.log(await implGetOperationData());
    return;
  }

  if (cmd === 'posted') {
    const { opts } = parseOpts(tail);
    const lim = opts.limit !== undefined ? parseInt(opts.limit, 10) : undefined;
    if (opts.limit !== undefined && (Number.isNaN(lim!) || lim! < 1)) {
      die('❌ --limit 需为正整数');
    }
    console.log(await implPosted(lim));
    return;
  }

  if (cmd === 'note-detail') {
    const id = tail[0]?.trim();
    if (!id) {
      die('❌ 用法: note-detail <noteId>');
    }
    console.log(await implGetNoteDetail(id));
    return;
  }

  if (cmd === 'post') {
    const { opts, flags } = parseOpts(tail);
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
    const imagePaths: string[] = [];
    for (let i = 0; i < tail.length; i++) {
      if (tail[i] === '--image' && tail[i + 1] && !tail[i + 1].startsWith('-')) {
        imagePaths.push(tail[i + 1]);
        i += 1;
      }
    }
    if (imagePaths.length === 0) {
      die('❌ 至少需要一张图片: 重复 --image <本地路径>（1～18 张）');
    }
    console.log(
      await implPost({
        title,
        content,
        imagePaths,
        publish: resolvePostPublish(opts, flags),
      }),
    );
    return;
  }

  die(`❌ 未知命令 “${cmd}”。输入 help 查看用法。`);
}

async function runInteractiveLoop(): Promise<void> {
  const rl = createInterface({ input, output, terminal: true });
  printXhsInteractiveBanner();
  console.error('交互模式：login 登录；metrics 获取运营数据；posted 获取已发布笔记；note-detail 获取笔记详情；post 发布笔记；help 帮助；exit / quit 退出。\n');
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
