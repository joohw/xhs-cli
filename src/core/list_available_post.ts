// src/xhs-cli/list_available_post.ts
// 列出所有待发布的帖子




import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { POST_QUEUE_DIR } from '../config.js';
import { PostNoteParams } from './post.js';


// 列出所有待发布的帖子
export function listQueuePost(): Array<{ filename: string; title?: string; content: string; createdAt: Date; size: number }> {
    if (!existsSync(POST_QUEUE_DIR)) {
        return [];
    }
    try {
        const files = readdirSync(POST_QUEUE_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        const posts: Array<{ filename: string; title?: string; content: string; createdAt: Date; size: number }> = [];
        for (const file of jsonFiles) {
            const filePath = join(POST_QUEUE_DIR, file);
            try {
                const stats = statSync(filePath);
                const content = readFileSync(filePath, 'utf-8');
                const params = JSON.parse(content) as PostNoteParams;
                posts.push({
                    filename: file,
                    title: params.title,
                    content: params.content,
                    createdAt: stats.birthtime,
                    size: stats.size,
                });
            } catch (error) {
                // 如果文件读取失败，跳过
                console.error(`⚠️  读取文件失败 ${file}:`, error instanceof Error ? error.message : error);
            }
        }
        // 按创建时间排序（最新的在前）
        posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return posts;
    } catch (error) {
        throw new Error(`读取队列目录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}


// CLI 命令：列出所有待发布的帖子
export function listQueuePostCommand(): void {
    try {
        const posts = listQueuePost();
        if (posts.length === 0) {
            console.error('📭 队列中没有待发布的帖子');
            return;
        }
        console.error(`\n📋 待发布队列 (共 ${posts.length} 个):\n`);
        posts.forEach((post, index) => {
            console.error(`${index + 1}. ${post.filename}`);
            if (post.title) {
                console.error(`   标题: ${post.title}`);
            }
            console.error(`   内容:`);
            // 输出完整内容，每行添加缩进
            const contentLines = post.content.split('\n');
            contentLines.forEach(line => {
                console.error(`   ${line}`);
            });
            console.error(`   创建时间: ${post.createdAt.toLocaleString('zh-CN')}`);
            console.error(`   文件大小: ${(post.size / 1024).toFixed(2)} KB`);
            console.error('');
        });
    } catch (error) {
        console.error('❌ 列出队列失败:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

