// src/config.ts
// 配置文件 — 所有应用生成的数据位于 ~/.xhs-cli/.cache/（测试可用 XHS_CLI_HOME 覆盖）

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

function resolveAppHome(): string {
  const override = process.env.XHS_CLI_HOME?.trim();
  if (override) {
    return override;
  }
  return join(homedir(), '.xhs-cli');
}

/** 应用主目录（仅作根路径，业务数据在 .cache 下） */
export const APP_HOME = resolveAppHome();

/**
 * 应用缓存与生成数据根目录（笔记缓存、Cookie、浏览器配置等）
 */
export const CACHE_DIR = join(APP_HOME, '.cache');

/** Puppeteer 用户数据目录（单账号或未选择多账号时的默认会话目录） */
export const BROWSER_USER_DATA_DIR = join(CACHE_DIR, 'browser-data');

/** 多账号元数据目录（会话目录在每账号子目录 browser-data） */
export const ACCOUNTS_ROOT = join(CACHE_DIR, 'accounts');
/** 账号注册表：`~/.xhs-cli/.cache/accounts/registry.json` */
export const ACCOUNTS_REGISTRY_PATH = join(ACCOUNTS_ROOT, 'registry.json');
/** 已发布归档：`~/.xhs-cli/.cache/published/` */
export const PUBLISHED_ROOT = join(CACHE_DIR, 'published');

// 笔记缓存目录
export const NOTES_CACHE_DIR = join(CACHE_DIR, 'notes');
// 浏览器 cookie 文件
export const COOKIE_FILE = join(CACHE_DIR, 'cookies', 'cookies.json');
/** 可选：用户或外部工具自行使用的目录 */
export const SANDBOX_DIR = join(CACHE_DIR, 'sandbox');

let appDataLayoutReady = false;

/** 确保 `~/.xhs-cli/.cache` 目录存在（幂等） */
export function ensureAppDataLayout(): void {
  if (appDataLayoutReady) {
    return;
  }
  appDataLayoutReady = true;
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (!existsSync(SANDBOX_DIR)) {
    mkdirSync(SANDBOX_DIR, { recursive: true });
  }
  if (!existsSync(PUBLISHED_ROOT)) {
    mkdirSync(PUBLISHED_ROOT, { recursive: true });
  }
}

/** 仅测试：重置 ensureAppDataLayout 幂等标记 */
export function resetAppDataLayoutCacheForTests(): void {
  appDataLayoutReady = false;
}

// 运营数据缓存时间
export const CACHE_TTL_OPERATION_DATA = 24 * 60 * 60; // 86400 秒 = 24小时

// 笔记统计缓存时间
export const CACHE_TTL_NOTE_STATISTICS = 24 * 60 * 60; // 24天

// 笔记详情缓存时间
export const CACHE_TTL_NOTE_DETAIL = 30 * 24 * 60 * 60; // 30天

// 用户资料缓存时间
export const CACHE_TTL_USER_PROFILE = 24 * 60 * 60; // 86400 秒 = 24小时

// 笔记列表缓存时间
export const CACHE_TTL_NOTE_LIST = 12 * 60 * 60; // 43200 秒 = 12小时

// 默认缓存时间
export const CACHE_TTL_DEFAULT = 60 * 60; // 3600 秒 = 1小时
