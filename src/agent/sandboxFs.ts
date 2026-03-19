/**
 * Agent 沙盒：路径限制在 ~/.xhs-cli/.cache/sandbox 内，防止越权读写。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, relative, resolve } from 'path';
import { SANDBOX_DIR, ensureAppDataLayout } from '../config.js';

const MAX_READ_BYTES = 2 * 1024 * 1024; // 2 MiB
const MAX_WRITE_BYTES = 2 * 1024 * 1024;

function getSandboxRootResolved(): string {
  ensureAppDataLayout();
  if (!existsSync(SANDBOX_DIR)) {
    mkdirSync(SANDBOX_DIR, { recursive: true });
  }
  return resolve(SANDBOX_DIR);
}

/**
 * 将相对路径（相对于沙盒根）解析为绝对路径；禁止 .. 与绝对路径。
 */
export function resolveSandboxRelative(userPath: string): string {
  const trimmed = userPath.trim().replace(/\\/g, '/');
  if (!trimmed || trimmed.includes('\0')) {
    throw new Error('路径无效');
  }
  if (trimmed.startsWith('/') || /^[A-Za-z]:/.test(trimmed)) {
    throw new Error('禁止使用绝对路径，请使用相对于沙盒根的路径，例如 examples/foo.txt');
  }
  const segments = trimmed.split('/').filter((s) => s.length > 0);
  for (const seg of segments) {
    if (seg === '..') {
      throw new Error('禁止使用 ..');
    }
  }
  const root = getSandboxRootResolved();
  const full = resolve(root, ...segments);
  const rel = relative(root, full);
  if (rel.startsWith('..') || rel === '..') {
    throw new Error('解析结果越出沙盒范围');
  }
  return full;
}

export function implSandboxReadFile(relativePath: string): string {
  const full = resolveSandboxRelative(relativePath);
  if (!existsSync(full) || !statSync(full).isFile()) {
    return `文件不存在或不是普通文件: ${relativePath}`;
  }
  const size = statSync(full).size;
  if (size > MAX_READ_BYTES) {
    return `文件过大（${size} 字节），上限 ${MAX_READ_BYTES} 字节: ${relativePath}`;
  }
  const content = readFileSync(full, 'utf-8');
  return `路径: ${relativePath}\n\n${content}`;
}

export function implSandboxWriteFile(relativePath: string, content: string): string {
  if (typeof content !== 'string') {
    throw new Error('content 须为字符串');
  }
  const buf = Buffer.byteLength(content, 'utf-8');
  if (buf > MAX_WRITE_BYTES) {
    return `内容过大（${buf} 字节），上限 ${MAX_WRITE_BYTES} 字节`;
  }
  const full = resolveSandboxRelative(relativePath);
  const dir = dirname(full);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(full, content, 'utf-8');
  return `✅ 已写入沙盒文件: ${relativePath}（${buf} 字节）`;
}

/** 列出沙盒内子目录（相对路径，空字符串表示根） */
export function implSandboxListDir(relativeDir = ''): string {
  const root = getSandboxRootResolved();
  let full = root;
  if (relativeDir.trim()) {
    full = resolveSandboxRelative(relativeDir.replace(/\\/g, '/').replace(/\/+$/, '') || '.');
  }
  if (!existsSync(full)) {
    return `目录不存在: ${relativeDir || '(沙盒根)'}`;
  }
  const st = statSync(full);
  if (!st.isDirectory()) {
    return `不是目录: ${relativeDir}`;
  }
  const names = readdirSync(full, { withFileTypes: true });
  const lines = names.map((e) => {
    const prefix = e.isDirectory() ? '[dir] ' : '[file] ';
    return `${prefix}${e.name}`;
  });
  const relBase = relativeDir.trim() || '.';
  return lines.length === 0
    ? `目录为空: ${relBase}`
    : `目录 ${relBase}（共 ${lines.length} 项）:\n${lines.join('\n')}`;
}
