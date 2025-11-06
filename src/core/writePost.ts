// src/core/addPost.ts
// 核心功能：添加 post 到队列


import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { POST_QUEUE_DIR } from '../config.js';



// 添加 post 到队列（接收 title, content, images, scheduledPublishTime）
export function writePost(title: string | undefined, content: string, images?: string[], scheduledPublishTime?: string): string {
    if (!content || typeof content !== 'string') {
        throw new Error('content 字段是必需的且必须是字符串');
    }
    // 确保队列目录存在
    if (!existsSync(POST_QUEUE_DIR)) {
        mkdirSync(POST_QUEUE_DIR, { recursive: true });
    }
    // 生成文件名（使用时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const queueFilename = `post-${timestamp}.json`;
    const queueFilePath = join(POST_QUEUE_DIR, queueFilename);
    // 检查文件是否已存在（理论上不应该发生，因为使用了时间戳）
    if (existsSync(queueFilePath)) {
        throw new Error(`文件已存在: ${queueFilename}`);
    }
    // 构建数据对象
    const data: {
        title?: string;
        content: string;
        images?: string[];
        scheduledPublishTime?: string;
    } = {
        content,
    };
    if (title) {
        data.title = title;
    }
    if (images && images.length > 0) {
        data.images = images;
    }
    if (scheduledPublishTime) {
        data.scheduledPublishTime = scheduledPublishTime;
    }
    // 写入文件
    try {
        const fileContent = JSON.stringify(data, null, 2);
        writeFileSync(queueFilePath, fileContent, 'utf-8');
        return queueFilename;
    } catch (error) {
        throw new Error(`写入文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}

