// src/config.ts
// 配置文件 — 所有应用生成的数据位于 ~/.xhs-cli/.cache/

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/** 应用主目录（仅作根路径，业务数据在 .cache 下） */
export const APP_HOME = join(homedir(), '.xhs-cli');

/**
 * 应用缓存与生成数据根目录（笔记缓存、Cookie、浏览器配置等）
 */
export const CACHE_DIR = join(APP_HOME, '.cache');

/** Puppeteer 用户数据目录（与 getUserDataDir 一致） */
export const BROWSER_USER_DATA_DIR = join(CACHE_DIR, 'browser-data');

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
