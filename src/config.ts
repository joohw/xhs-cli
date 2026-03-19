// src/config.ts
// 配置文件 — 所有应用生成的数据位于 ~/.xhs-cli/.cache/

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/** 应用主目录（仅作根路径，业务数据在 .cache 下） */
export const APP_HOME = join(homedir(), '.xhs-cli');

/**
 * 应用缓存与生成数据根目录（笔记缓存、Cookie、发帖队列、Agent 沙盒、浏览器配置等）
 */
export const CACHE_DIR = join(APP_HOME, '.cache');

/** Puppeteer 用户数据目录（与 getUserDataDir 一致） */
export const BROWSER_USER_DATA_DIR = join(CACHE_DIR, 'browser-data');

// 笔记缓存目录
export const NOTES_CACHE_DIR = join(CACHE_DIR, 'notes');
// 浏览器 cookie 文件
export const COOKIE_FILE = join(CACHE_DIR, 'cookies', 'cookies.json');
// 用户资料缓存文件
export const USER_PROFILE_CACHE_FILE = join(CACHE_DIR, 'user_profile.json');
// 发帖队列目录
export const POST_QUEUE_DIR = join(CACHE_DIR, 'post', 'queue');
// 已发布目录
export const POST_POSTED_DIR = join(CACHE_DIR, 'post', 'posted');
// 封面图片输出目录
export const COVER_IMAGES_DIR = join(CACHE_DIR, 'post', 'images', 'covers');
// 每篇帖子配图目录的父目录（.../post/images/<postName>/）
export const POST_IMAGES_BASE_DIR = join(CACHE_DIR, 'post', 'images');
/** Agent 可读写沙盒（范文、草稿等），路径相对于此根目录 */
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

/**
 * 某篇队列笔记对应的配图目录（不存在则创建）
 */
export function getPostImagesDir(postName: string): string {
  ensureAppDataLayout();
  const dir = join(POST_IMAGES_BASE_DIR, postName);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
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
