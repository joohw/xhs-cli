// src/core/examples.ts
// 范文管理功能

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EXAMPLES_DIR } from '../config.js';

// 列出所有范文
export function listExamples(): Array<{ filename: string; title: string }> {
  if (!existsSync(EXAMPLES_DIR)) {
    return [];
  }
  try {
    const files = readdirSync(EXAMPLES_DIR);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    const examples: Array<{ filename: string; title: string }> = [];
    
    for (const file of txtFiles) {
      const filePath = join(EXAMPLES_DIR, file);
      try {
        // 从文件内容中提取标题（第一行）
        const content = readFileSync(filePath, 'utf-8');
        const firstLine = content.split('\n')[0].trim();
        const title = firstLine || file.replace('.txt', '');
        
        examples.push({
          filename: file,
          title,
        });
      } catch (error) {
        // 如果文件读取失败，跳过
        console.error(`⚠️  读取文件失败 ${file}:`, error instanceof Error ? error.message : error);
      }
    }
    return examples;
  } catch (error) {
    throw new Error(`读取范文目录失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 获取单个范文内容
export function getExample(filename: string): { title: string; content: string } {
  if (!filename || !filename.endsWith('.txt')) {
    throw new Error('文件名必须是 .txt 格式');
  }
  
  const filePath = join(EXAMPLES_DIR, filename);
  if (!existsSync(filePath)) {
    throw new Error(`范文文件不存在: ${filename}`);
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const firstLine = content.split('\n')[0].trim();
    const title = firstLine || filename.replace('.txt', '');
    
    return {
      title,
      content,
    };
  } catch (error) {
    throw new Error(`读取范文文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 保存范文
export function saveExample(filename: string, content: string): { filename: string; message: string } {
  if (!filename || !filename.endsWith('.txt')) {
    throw new Error('文件名必须是 .txt 格式');
  }
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('内容不能为空');
  }
  
  // 确保目录存在
  if (!existsSync(EXAMPLES_DIR)) {
    mkdirSync(EXAMPLES_DIR, { recursive: true });
  }
  
  const filePath = join(EXAMPLES_DIR, filename);
  const isUpdate = existsSync(filePath);
  
  try {
    writeFileSync(filePath, content, 'utf-8');
    return {
      filename,
      message: isUpdate ? `范文已更新: ${filename}` : `范文已保存: ${filename}`,
    };
  } catch (error) {
    throw new Error(`保存范文文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

