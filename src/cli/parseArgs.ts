/** CLI 参数解析（供 cliRouter 与测试共用） */

export function parseOpts(argv: string[]): {
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
export function resolvePostPublish(
  opts: Record<string, string>,
  flags: Set<string>,
): boolean {
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

/** 读取 `--account`；空值由调用方校验 */
export function accountFromOpts(opts: Record<string, string>): string | undefined {
  return opts.account?.trim() || undefined;
}

/** 扫描 argv 中的重复 `--image <path>` */
export function collectImagePaths(argv: string[]): string[] {
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
