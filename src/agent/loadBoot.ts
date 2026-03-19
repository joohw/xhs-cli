import { readFileSync } from 'fs';
import { existsSync } from 'fs';
import { getBootMdPath } from './paths.js';

/** 读取 boot.md 全文，供 Agent system prompt 使用 */
export function loadBootMarkdown(): string {
  const path = getBootMdPath();
  if (!existsSync(path)) {
    return '# XHS Agent\n\n未找到 boot.md（预期路径：src/agent/boot.md 或 dist/agent/boot.md）。';
  }
  return readFileSync(path, 'utf-8');
}
