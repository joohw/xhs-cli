import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

/** 包根目录（开发时为仓库根；全局安装时为 node_modules/xhs-cli） */
export function getPackageRoot(): string {
  // 必须用 resolve：在 Windows 上 `dirname(fileURLToPath(new URL('../../'))` 会因尾部 `\` 多退一级目录
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
}

/** boot.md 位于 `src/agent/boot.md`；构建后复制到 `dist/agent/boot.md` */
export function getBootMdPath(): string {
  const root = getPackageRoot();
  const distPath = join(root, 'dist', 'agent', 'boot.md');
  if (existsSync(distPath)) {
    return distPath;
  }
  const srcPath = join(root, 'src', 'agent', 'boot.md');
  if (existsSync(srcPath)) {
    return srcPath;
  }
  return distPath;
}

/** 发帖指南等 prompts 目录（优先已构建的 dist/prompts） */
export function getPromptsDir(): string {
  const root = getPackageRoot();
  const distPrompts = join(root, 'dist', 'prompts');
  if (existsSync(distPrompts)) {
    return distPrompts;
  }
  return join(root, 'src', 'prompts');
}
