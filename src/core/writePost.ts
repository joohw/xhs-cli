// src/core/writePost.ts
// 核心功能：添加 post 到队列

import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, extname } from 'path';
import { POST_QUEUE_DIR, getPostImagesDir, ensureAppDataLayout } from '../config.js';
import { titleToFilename } from '../utils/titleToFilename.js';



// 添加 post
export async function createPost(
    title: string,
    content: string,
    images?: string[]): Promise<string> {
    // 创建前验证
    if (!content || typeof content !== 'string') {
        throw new Error('content 字段是必需的且必须是字符串');
    }
    if (content.trim().length === 0) {
        throw new Error('内容不能为空');
    }
    if (content.length < 10) {
        throw new Error('内容太短了，不能少于10个字');
    }
    if (content.length > 1000) {
        throw new Error('小红书笔记长度不能超过1000个字');
    }
    if (title && typeof title !== 'string') {
        throw new Error('标题必须是字符串');
    }
    if (title && title.length > 20) {
        throw new Error('标题长度不能超过20个字');
    }
    if (images && images.length > 9) {
        throw new Error('图片数量不能超过9张');
    }
    ensureAppDataLayout();
    if (!existsSync(POST_QUEUE_DIR)) {
        mkdirSync(POST_QUEUE_DIR, { recursive: true });
    }
    const queueFilename = titleToFilename(title || 'untitled');
    const queueFilePath = join(POST_QUEUE_DIR, queueFilename);
    // 移除文件存在检查，直接覆盖
    const postName = getPostNameFromFilename(queueFilename);
    const postImageDir = getPostImageDir(postName);
    clearImageDir(postImageDir);
    let validImageCount = 0;
    const processedImagePaths: string[] = []; // 重命名变量避免冲突
    // 处理用户提供的图片
    if (images && images.length > 0) {
        const supportedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
        for (let i = 0; i < images.length; i++) {
            const imagePath = images[i];
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                console.error(`⚠️  网络图片需要手动下载并重命名为 ${validImageCount}.png: ${imagePath}`);
                continue;
            }
            let sourcePath: string;
            if (imagePath.startsWith('/') || /^[A-Z]:/.test(imagePath)) {
                sourcePath = imagePath;
            } else {
                sourcePath = imagePath;
            }

            if (existsSync(sourcePath)) {
                const ext = extname(sourcePath).toLowerCase();
                if (supportedExtensions.includes(ext)) {
                    // 统一重命名为数字序号.png
                    const targetFilename = `${validImageCount}.png`;
                    const targetPath = join(postImageDir, targetFilename);
                    copyFileSync(sourcePath, targetPath);
                    processedImagePaths.push(targetPath);
                    validImageCount++;
                } else {
                    console.error(`⚠️  不支持的图片格式: ${ext}，跳过: ${sourcePath}`);
                }
            } else {
                console.error(`⚠️  图片文件不存在，跳过: ${sourcePath}`);
            }
        }
    }
    for (let i = 0; i < processedImagePaths.length; i++) {
        console.error(`   ${i}. ${processedImagePaths[i]}`);
    }
    try {
        // 直接保存内容为 TXT 文件
        writeFileSync(queueFilePath, content, 'utf-8');
        // 创建后验证
        if (!existsSync(queueFilePath)) {
            throw new Error('文件创建失败');
        }
        const fileStats = statSync(queueFilePath);
        if (fileStats.size === 0) {
            throw new Error('文件内容为空');
        }
        const fileContentStr = readFileSync(queueFilePath, 'utf-8');
        if (!fileContentStr || fileContentStr.trim().length === 0) {
            throw new Error('文件内容验证失败');
        }
        return queueFilename;
    } catch (error) {
        throw new Error(`写入文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}


// 获取 post 对应的图片目录
function getPostImageDir(postName: string): string {
    return getPostImagesDir(postName);
}


// 清空图片目录
function clearImageDir(imageDir: string): void {
    if (!existsSync(imageDir)) {
        return;
    }
    const files = readdirSync(imageDir);
    for (const file of files) {
        const filePath = join(imageDir, file);
        const stats = statSync(filePath);
        if (stats.isFile()) {
            unlinkSync(filePath);
        }
    }
}


// 从文件名中提取post名称（去掉.txt后缀）
function getPostNameFromFilename(filename: string): string {
    return filename.replace(/\.txt$/, '');
}



