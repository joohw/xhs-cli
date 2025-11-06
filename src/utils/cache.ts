// src/utils/cache.js


import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { CACHE_DIR } from '../config.js';


// 缓存数据包装类型
interface CachedData<T> {
  data: T;
  cachedAt: string; // ISO 8601 格式的时间戳
}


// 确保缓存目录存在
export function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}


// 保存数据到缓存文件（自动添加时间戳）
export function saveToCache<T>(filename: string, data: T): void {
  ensureCacheDir();
  const filePath = join(CACHE_DIR, filename);
  const dirPath = join(CACHE_DIR, filename.split('/').slice(0, -1).join('/'));
  if (dirPath !== CACHE_DIR && !existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
  const cached: CachedData<T> = {
    data: data,
    cachedAt: new Date().toISOString(),
  };
  writeFileSync(filePath, JSON.stringify(cached, null, 2), 'utf8');
}


// 从缓存文件读取数据（支持过期检查）,参数为秒
export function loadFromCache<T>(filename: string, maxAge?: number): T | null {
  const filePath = join(CACHE_DIR, filename);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const content = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'cachedAt' in parsed && 'data' in parsed) {
      const cached = parsed as CachedData<T>;
      if (maxAge !== undefined) {
        const cachedTime = new Date(cached.cachedAt).getTime();
        const now = Date.now();
        if (now - cachedTime > maxAge * 1000) {
          return null;
        }
      }
      return cached.data;
    }
    return parsed as T;
  } catch (error) {
    console.error(`⚠️ 读取缓存文件失败: ${filename}`, error);
    return null;
  }
}


// 检查缓存是否有效（基于时间）
export function isCacheValid(filename: string, maxAge: number = 3600): boolean {
  const filePath = join(CACHE_DIR, filename);
  if (!existsSync(filePath)) {
    return false;
  }
  try {
    const stats = statSync(filePath);
    const now = Date.now();
    return now - stats.mtime.getTime() < maxAge;
  } catch (error) {
    return false;
  }
}

// 获取缓存文件的修改时间
export function getCacheMtime(filename: string): Date | null {
  const filePath = join(CACHE_DIR, filename);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const stats = statSync(filePath);
    return stats.mtime;
  } catch (error) {
    return null;
  }
}

// 删除缓存文件
export function removeCache(filename: string): boolean {
  const filePath = join(CACHE_DIR, filename);
  if (!existsSync(filePath)) {
    return false;
  }
  try {
    require('fs').unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`⚠️ 删除缓存文件失败: ${filename}`, error);
    return false;
  }
}

// 清空整个缓存目录
export function clearCache(): void {
  if (existsSync(CACHE_DIR)) {
    try {
      require('fs').rmSync(CACHE_DIR, { recursive: true, force: true });
      console.error('✅ 缓存已清空');
    } catch (error) {
      console.error('❌ 清空缓存失败:', error);
    }
  }
}

// 获取缓存文件列表
export function listCacheFiles(): string[] {
  if (!existsSync(CACHE_DIR)) {
    return [];
  }
  try {
    return require('fs').readdirSync(CACHE_DIR);
  } catch (error) {
    console.error('⚠️ 获取缓存文件列表失败:', error);
    return [];
  }
}

// 检查缓存文件是否存在
export function cacheExists(filename: string): boolean {
  const filePath = join(CACHE_DIR, filename);
  return existsSync(filePath);
}