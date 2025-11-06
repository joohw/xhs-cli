// src/core/post.ts
// 核心功能：发布小红书笔记



import { launchBrowser } from '../browser/browser.js';
import { existsSync, readFileSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { POST_QUEUE_DIR, POST_POSTED_DIR } from '../config.js';
import { listQueuePost } from './list_available_post.js';



// 发布笔记参数接口
export interface PostNoteParams {
    title?: string;
    content: string;
    images?: string[]; // 图片路径或URL数组
    tags?: string[]; // 标签数组，如 ["#MCP", "#AI"]
    location?: string; // 位置信息
    draft?: boolean; // 是否保存为草稿，默认为 false（即直接发布）
    scheduledPublishTime?: string; // 计划发布时间（ISO 8601 格式，如 "2024-01-01T10:00:00Z"）
}



// 发布笔记结果接口
export interface PostNoteResult {
    success: boolean;
    noteId?: string;
    noteUrl?: string;
    message: string;
}



// 从缓存目录读取发帖队列文件
export function loadPostFromQueue(filename: string): PostNoteParams {
    const queueFilePath = join(POST_QUEUE_DIR, filename);
    if (!existsSync(queueFilePath)) {
        throw new Error(`发帖队列文件不存在: ${queueFilePath}`);
    }
    try {
        const content = readFileSync(queueFilePath, 'utf-8');
        const params = JSON.parse(content) as PostNoteParams;
        // 验证必需字段
        if (!params.content || typeof params.content !== 'string') {
            throw new Error('JSON 文件必须包含 content 字段');
        }
        return params;
    } catch (error) {
        if (error instanceof Error && error.message.includes('不存在')) {
            throw error;
        }
        throw new Error(`读取发帖队列文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}



// 将已发布的文件移动到 posted 目录
function moveToPosted(filename: string): void {
    try {
        if (!existsSync(POST_POSTED_DIR)) {
            mkdirSync(POST_POSTED_DIR, { recursive: true });
        }
        const queueFilePath = join(POST_QUEUE_DIR, filename);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const postedFile = join(POST_POSTED_DIR, `${filename.replace('.json', '')}-${timestamp}.json`);
        renameSync(queueFilePath, postedFile);
        console.error(`✅ 已发布的文件已移动到: ${postedFile}`);
    } catch (error) {
        console.error('⚠️  移动文件到已发布目录失败:', error instanceof Error ? error.message : error);
    }
}




// 辅助函数：处理图片路径（支持本地路径和URL）
async function prepareImagePath(imagePath: string): Promise<string> {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        throw new Error('URL 图片下载功能待实现，请使用本地文件路径');
    }
    // 如果图片路径是相对路径，优先从缓存目录的 post/images 目录查找
    let absolutePath: string;
    if (imagePath.startsWith('/') || /^[A-Z]:/.test(imagePath)) {
        // 绝对路径，直接使用
        absolutePath = imagePath;
    } else {
        // 相对路径，先尝试从 post/images 目录查找
        const postImagesDir = join(process.cwd(), '.cache', 'post', 'images');
        const postImagePath = join(postImagesDir, imagePath);
        if (existsSync(postImagePath)) {
            absolutePath = postImagePath;
        } else {
            // 如果不在 post/images 目录，则从当前工作目录查找
            absolutePath = join(process.cwd(), imagePath);
        }
    }
    if (!existsSync(absolutePath)) {
        throw new Error(`图片文件不存在: ${imagePath} (解析为: ${absolutePath})`);
    }
    return absolutePath;
}




// 核心函数：发布笔记（返回结果数据）- 使用非无头模式
export async function postNote(params: PostNoteParams, queueFilename?: string): Promise<PostNoteResult> {
    const browser = await launchBrowser(false);
    try {
        const page = await browser.newPage();
        // 验证登录状态
        await page.goto('https://creator.xiaohongshu.com/new/home', {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
        });
        const currentUrl = page.url();
        const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
        if (isLoginPage) {
            throw new Error('未登录，请先运行 npm run xhs login 进行登录');
        }

        // 1. 导航到发帖页面（不使用 openFilePicker 参数）
        console.error('📥 正在打开发布页面...');
        await page.goto('https://creator.xiaohongshu.com/publish/publish?from=homepage&target=image', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        // 2. 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. 上传图片（如果有，需要先上传图片）
        if (params.images && params.images.length > 0) {
            console.error('📷 正在上传图片...');
            try {
                // 等待上传输入框出现
                await page.waitForSelector('input.upload-input[type="file"]', { timeout: 10000 });

                const uploadInput = await page.$('input.upload-input[type="file"]');
                if (!uploadInput) {
                    throw new Error('未找到图片上传输入框');
                }

                // 准备图片路径数组
                const imagePaths: string[] = [];
                for (const imagePath of params.images) {
                    const absolutePath = await prepareImagePath(imagePath);
                    imagePaths.push(absolutePath);
                }

                // 上传文件（支持多文件）
                await uploadInput.uploadFile(...imagePaths);
                console.error(`✅ 已上传 ${imagePaths.length} 张图片`);

                // 等待图片上传完成（可能需要等待上传进度）
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error('❌ 图片上传失败:', error instanceof Error ? error.message : error);
                throw error;
            }
        }

        // 4. 填写标题（如果有）
        if (params.title) {
            try {
                await page.waitForSelector('input.d-text', { timeout: 5000 });
                const titleInput = await page.$('input.d-text');
                if (titleInput) {
                    await titleInput.click({ clickCount: 3 }); // 选中现有内容
                    await titleInput.type(params.title, { delay: 100 });
                    console.error('✅ 标题已填写');
                }
            } catch (error) {
                console.error('⚠️  填写标题失败，继续...');
            }
        }

        // 5. 填写内容
        try {
            await page.waitForSelector('div.tiptap.ProseMirror[contenteditable="true"]', { timeout: 5000 });

            const contentInput = await page.$('div.tiptap.ProseMirror[contenteditable="true"]');
            if (!contentInput) {
                throw new Error('未找到内容输入框');
            }

            // 点击内容输入框
            await contentInput.click();
            await new Promise(resolve => setTimeout(resolve, 500));

            // 输入内容
            await page.keyboard.type(params.content, { delay: 50 });
            console.error('✅ 内容已填写');
        } catch (error) {
            console.error('❌ 填写内容失败:', error instanceof Error ? error.message : error);
            throw error;
        }

        // 6. 添加标签（如果有）
        if (params.tags && params.tags.length > 0) {
            console.error('🏷️  正在添加标签...');
            // TODO: 实现标签添加逻辑
            // 需要找到标签输入框或按钮，然后输入标签
            console.error('⚠️  标签添加功能待实现');
        }

        // 7. 添加位置（如果有）
        if (params.location) {
            console.error('📍 正在添加位置...');
            // TODO: 实现位置添加逻辑
            console.error('⚠️  位置添加功能待实现');
        }

        // 8. 默认保存为草稿，不自动发布
        // 默认 draft 为 true，如果用户明确设置为 false 才发布
        const shouldPublish = params.draft === false;

        let result: PostNoteResult;
        if (shouldPublish) {
            console.error('🚀 准备发布（需要手动确认）...');
            // TODO: 查找并点击发布按钮
            // 需要找到实际的按钮选择器，例如：
            // await page.waitForSelector('button:has-text("发布")', { timeout: 5000 });
            // await page.click('button:has-text("发布")');
            // 等待发布成功
            // 从页面获取笔记ID和URL
            console.error('⚠️  自动发布功能待实现');
            result = {
                success: false,
                message: '自动发布功能待实现',
            };
        } else {
            // 默认保存为草稿（不自动点击保存按钮，让用户在浏览器中手动操作）
            console.error('✅ 表单填写完成');
            console.error('💡 提示: 请在浏览器中手动保存草稿或发布');
            console.error('💡 浏览器将保持打开，您可以继续编辑或发布');

            result = {
                success: true,
                message: '表单填写完成，请在浏览器中手动保存草稿或发布',
            };
        }
        // 如果提供了队列文件名且发布成功，自动移动文件
        if (queueFilename && result.success) {
            moveToPosted(queueFilename);
        }
        return result;
    } finally {
        // 不关闭浏览器，让用户可以继续操作
        // await browser.close();
    }
}








// 交互式选择待发布的 post
export async function selectPostInteractively(): Promise<string> {
    const posts = listQueuePost();
    if (posts.length === 0) {
        console.error('📭 队列中没有待发布的帖子');
        console.error('💡 提示: 使用 npm run xhs add-post 添加新的 post');
        process.exit(1);
    }
    console.error(`\n📋 请选择要发布的 post (共 ${posts.length} 个):\n`);
    posts.forEach((post: { filename: string; title?: string; content: string; createdAt: Date; size: number }, index: number) => {
        console.error(`${index + 1}. ${post.filename}`);
        if (post.title) {
            console.error(`   标题: ${post.title}`);
        }
        // 显示内容预览（前50个字符）
        const contentPreview = post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content;
        console.error(`   内容: ${contentPreview}`);
        console.error('');
    });
    return new Promise((resolve, reject) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(`\n请选择 (1-${posts.length}): `, (answer: string) => {
            rl.close();
            const selectedIndex = parseInt(answer.trim(), 10);
            if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > posts.length) {
                console.error('❌ 无效的选择');
                reject(new Error('无效的选择'));
                return;
            }
            const selectedPost = posts[selectedIndex - 1];
            resolve(selectedPost.filename);
        });
    });
}

