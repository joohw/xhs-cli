// src/core/writePost.ts
// 核心功能：添加 post 到队列

import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, extname } from 'path';
import { homedir } from 'os';
import { POST_QUEUE_DIR } from '../config.js';
import { titleToFilename } from '../utils/titleToFilename.js';
import { generateCover } from '../Illustrate/generateCover.js';


// 添加 post
export async function createPost(
    title: string,
    content: string,
    images?: string[],
    textToCover?: boolean,//是否自动将标题转换为封面图片
    scheduledPublishTime?: string): Promise<string> {
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
    // 验证图片 - 必须至少提供一张图片
    if ((!images || images.length === 0) && !textToCover) {
        throw new Error('小红书笔记必须至少包含一张图片，或者启用 textToCover 自动生成封面');
    }
    if (images && images.length > 9) {
        throw new Error('图片数量不能超过9张');
    }
    if (scheduledPublishTime) {
        const publishTime = new Date(scheduledPublishTime);
        if (isNaN(publishTime.getTime())) {
            throw new Error('计划发布时间格式无效，请使用ISO 8601格式');
        }
        const now = new Date();
        if (publishTime <= now) {
            throw new Error('计划发布时间必须是将来的时间');
        }
    }
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
    // 如果启用了 textToCover，自动生成封面图片
    if (textToCover && title) {
        try {
            console.error('🎨 正在生成封面图片...');
            const coverPaths = await generateCover(title, postImageDir, '1', true);
            if (coverPaths && coverPaths.length > 0) {
                // 重命名为 0.png
                const targetPath = join(postImageDir, `0.png`);
                copyFileSync(coverPaths[0], targetPath);
                processedImagePaths.push(targetPath);
                validImageCount++;
            }
        } catch (error) {
            console.error('❌ 封面图片生成失败:', error instanceof Error ? error.message : error);
        }
    }
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
    // 验证至少有一张有效的图片
    if (validImageCount === 0) {
        throw new Error('没有找到任何有效的图片文件。请提供至少一张本地图片文件（PNG、JPG、JPEG、WebP格式），或者启用 textToCover 自动生成封面');
    }
    for (let i = 0; i < processedImagePaths.length; i++) {
        console.error(`   ${i}. ${processedImagePaths[i]}`);
    }




    const data: {
        title?: string;
        content: string;
        scheduledPublishTime?: string;
    } = {
        content,
    };
    if (title) {
        data.title = title;
    }
    if (scheduledPublishTime) {
        data.scheduledPublishTime = scheduledPublishTime;
    }
    try {
        const fileContent = JSON.stringify(data, null, 2);
        writeFileSync(queueFilePath, fileContent, 'utf-8');
        // 创建后验证
        if (!existsSync(queueFilePath)) {
            throw new Error('文件创建失败');
        }
        const fileStats = statSync(queueFilePath);
        if (fileStats.size === 0) {
            throw new Error('文件内容为空');
        }
        const fileContentStr = readFileSync(queueFilePath, 'utf-8');
        const parsedData = JSON.parse(fileContentStr);
        if (!parsedData.content || typeof parsedData.content !== 'string') {
            throw new Error('文件内容验证失败');
        }
        return queueFilename;
    } catch (error) {
        throw new Error(`写入文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}


// 获取post对应的图片目录
function getPostImageDir(postName: string): string {
    const postImagesDir = join(homedir(), '.xhs-cli', 'post', 'images', postName);
    if (!existsSync(postImagesDir)) {
        mkdirSync(postImagesDir, { recursive: true });
    }
    return postImagesDir;
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

// 从文件名中提取post名称（去掉.json后缀）
function getPostNameFromFilename(filename: string): string {
    return filename.replace(/\.json$/, '');
}