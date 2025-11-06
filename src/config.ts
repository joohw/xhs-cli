// src/config.ts
// 配置文件

import { join } from 'path';
import { homedir } from 'os';


// 缓存目录配置（使用用户主目录）
export const CACHE_DIR = join(homedir(), '.xhs-cli');
// 笔记缓存目录
export const NOTES_CACHE_DIR = join(CACHE_DIR, 'notes');
// 浏览器cookie文件
export const COOKIE_FILE = join(CACHE_DIR, 'cookies', 'cookies.json');
// 用户资料缓存文件
export const USER_PROFILE_CACHE_FILE = join(CACHE_DIR, 'user_profile.json');
// 发帖队列目录
export const POST_QUEUE_DIR = join(CACHE_DIR, 'post', 'queue');
// 已发布目录
export const POST_POSTED_DIR = join(CACHE_DIR, 'post', 'posted');




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