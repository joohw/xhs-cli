// src/core/post.ts
// 核心功能：发布小红书笔记



import { launchBrowser } from '../browser/browser.js';
import { existsSync, readFileSync, mkdirSync, unlinkSync, writeFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { createInterface } from 'readline';
import { POST_QUEUE_DIR, POST_POSTED_DIR, getPostImagesDir, ensureAppDataLayout } from '../config.js';
import { listQueuePost } from './list_available_post.js';
import { PostNoteParams } from '../types/post.js';





function validatePostParams(params: PostNoteParams): void {
    // 验证内容
    if (!params.content || typeof params.content !== 'string') {
        throw new Error('内容(content)是必需的且必须是字符串');
    }
    if (params.content.trim().length === 0) {
        throw new Error('内容(content)不能为空');
    }
    // 验证内容长度（小红书可能有长度限制）
    if (params.content.length < 10) {
        throw new Error('内容太短了，不能少于10个字');
    }
    if (params.content.length > 1000) {
        throw new Error('小红书笔记长度不能超过1000个字');
    }
    // 验证标题（如果提供）
    if (params.title !== undefined) {
        if (typeof params.title !== 'string') {
            throw new Error('标题(title)必须是字符串');
        }
        if (params.title.length > 100) {
            throw new Error('标题长度不能超过100个字符');
        }
    }
    // 验证标签（如果提供）
    if (params.tags !== undefined) {
        if (!Array.isArray(params.tags)) {
            throw new Error('标签(tags)必须是数组');
        }
        for (const tag of params.tags) {
            if (typeof tag !== 'string') {
                throw new Error('每个标签必须是字符串');
            }
            if (tag.length > 50) {
                throw new Error('单个标签长度不能超过50个字符');
            }
        }
        if (params.tags.length > 10) {
            throw new Error('标签数量不能超过10个');
        }
    }
}



// 验证图片是否存在
function validatePostImages(queueFilename: string): void {
    if (!queueFilename) {
        throw new Error('发布笔记需要提供queueFilename参数来查找对应的图片');
    }
    const postName = getPostNameFromFilename(queueFilename);
    const imagePaths = findPostImages(postName);
    if (imagePaths.length === 0) {
        throw new Error(`未找到笔记"${postName}"对应的图片。请确保在 ~/.xhs-cli/.cache/post/images/${postName}/ 目录下放置至少一张图片（如1.png、2.jpg等）`);
    }
    // 验证图片数量（小红书通常支持1-9张图片）
    if (imagePaths.length > 9) {
        throw new Error(`图片数量不能超过9张，当前找到${imagePaths.length}张`);
    }
    // 验证图片文件是否存在且可读
    for (const imagePath of imagePaths) {
        if (!existsSync(imagePath)) {
            throw new Error(`图片文件不存在: ${imagePath}`);
        }
        try {
            // 尝试读取文件来验证权限
            readFileSync(imagePath);
        } catch (error) {
            throw new Error(`无法读取图片文件: ${imagePath} - ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    console.error(`✅ 图片验证通过: 找到 ${imagePaths.length} 张图片`);
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
        // 从文件名提取标题（去掉 .txt 后缀）
        const title = filename.replace(/\.txt$/, '');
        // 读取文件内容作为笔记内容
        const content = readFileSync(queueFilePath, 'utf-8');
        if (!content || content.trim().length === 0) {
            throw new Error('文件内容为空');
        }
        return {
            title,
            content,
        };
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
        const postedFilePath = join(POST_POSTED_DIR, filename);
        if (!existsSync(queueFilePath)) {
            console.error('⚠️  队列文件不存在，无法移动:', queueFilePath);
            return;
        }
        // 直接移动文件（TXT 文件不需要修改）
        const content = readFileSync(queueFilePath, 'utf-8');
        writeFileSync(postedFilePath, content, 'utf-8');
        // 删除原文件
        unlinkSync(queueFilePath);
        console.error(`✅ 已发布的文件已移动到: ${postedFilePath}`);
    } catch (error) {
        console.error('⚠️  移动文件到已发布目录失败:', error instanceof Error ? error.message : error);
    }
}

// 从文件名中提取post名称（去掉.txt后缀）
function getPostNameFromFilename(filename: string): string {
    return filename.replace(/\.txt$/, '');
}


// 获取 post 对应的图片目录
function getPostImageDir(postName: string): string {
    return getPostImagesDir(postName);
}


// 自动查找post对应的图片目录下的图片（按数字顺序：1.png, 1.jpg, 1.jpeg, 1.webp, 2.png, ...）
function findPostImages(postName: string): string[] {
    const postImageDir = getPostImageDir(postName);
    if (!existsSync(postImageDir)) {
        return [];
    }
    const files = readdirSync(postImageDir);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const imageMap = new Map<number, string>();
    // 支持的图片格式
    for (const file of files) {
        const ext = extname(file).toLowerCase();
        if (imageExtensions.includes(ext)) {
            // 提取文件名中的数字（如 1.png -> 1）
            const match = file.match(/^(\d+)\./);
            if (match) {
                const num = parseInt(match[1], 10);
                const fullPath = join(postImageDir, file);
                // 如果该数字还没有图片，或者当前图片的优先级更高（png > jpg > jpeg > webp）
                if (!imageMap.has(num)) {
                    imageMap.set(num, fullPath);
                } else {
                    const existingPath = imageMap.get(num)!;
                    const existingExt = extname(existingPath).toLowerCase();
                    const priority: Record<string, number> = { '.png': 4, '.jpg': 3, '.jpeg': 2, '.webp': 1 };
                    if ((priority[ext] || 0) > (priority[existingExt] || 0)) {
                        imageMap.set(num, fullPath);
                    }
                }
            }
        }
    }
    // 按数字顺序排序并返回
    const sortedNumbers = Array.from(imageMap.keys()).sort((a, b) => a - b);
    return sortedNumbers.map(num => imageMap.get(num)!);
}




// 核心函数：发布笔记（返回结果数据）- 使用非无头模式
export async function postNote(queueFilename: string): Promise<PostNoteResult> {
    ensureAppDataLayout();
    const params = loadPostFromQueue(queueFilename);
    validatePostParams(params);
    validatePostImages(queueFilename);
    const browser = await launchBrowser(false);
    try {
        const page = await browser.newPage();
        await page.goto('https://creator.xiaohongshu.com/new/home', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const currentUrl = page.url();
        const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/signin');
        if (isLoginPage) {
            throw new Error('未登录状态。请先运行 xhs login 进行登录。');
        }
        console.error('📥 正在打开发布页面...');
        await page.goto('https://creator.xiaohongshu.com/publish/publish?from=homepage&target=image', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });
        await new Promise(resolve => setTimeout(resolve, 3000));   
        const postName = getPostNameFromFilename(queueFilename);
        const imagePaths = findPostImages(postName);
        if (imagePaths.length > 0) {
            console.error(`📷 找到 ${imagePaths.length} 张图片，正在上传...`);
            try {
                await page.waitForSelector('input.upload-input[type="file"]', { timeout: 10000 });
                const uploadInput = await page.$('input.upload-input[type="file"]');
                if (!uploadInput) {
                    throw new Error('未找到图片上传输入框');
                }
                await uploadInput.uploadFile(...imagePaths);
                console.error(`✅ 已上传 ${imagePaths.length} 张图片`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error('❌ 图片上传失败:', error instanceof Error ? error.message : error);
                throw error;
            }
        } else {
            console.error('⚠️  未找到图片，必须要至少一张图片才能发布');
            throw new Error('未找到图片，必须要至少一张图片才能发布');
        }
        if (params.title) {
            try {
                await page.waitForSelector('input.d-text', { timeout: 5000 });
                const titleInput = await page.$('input.d-text');
                if (titleInput) {
                    await titleInput.click({ clickCount: 3 });
                    await titleInput.type(params.title, { delay: 100 });
                    console.error('✅ 标题已填写');
                }
            } catch (error) {
                console.error('⚠️  填写标题失败，继续...');
            }
        }
        // 修改：使用更高效的方式设置内容
        try {
            await page.waitForSelector('div.tiptap.ProseMirror[contenteditable="true"]', { timeout: 5000 });
            const contentSet = await page.evaluate((content: string) => {
                const editor = document.querySelector('div.tiptap.ProseMirror[contenteditable="true"]') as HTMLElement;
                if (!editor) return false;
                editor.focus();
                editor.innerHTML = '';
                const textNode = document.createTextNode(content);
                editor.appendChild(textNode);    
                // 触发输入事件以确保编辑器知道内容已更改
                const inputEvent = new Event('input', { bubbles: true });
                editor.dispatchEvent(inputEvent);
                const changeEvent = new Event('change', { bubbles: true });
                editor.dispatchEvent(changeEvent);
                return true;
            }, params.content);
            if (contentSet) {
                console.error('✅ 内容已直接设置完成');
            } else {
                throw new Error('无法找到内容编辑器');
            }
        } catch (error) {
            console.error('❌ 设置内容失败:', error instanceof Error ? error.message : error);
            throw error;
        }
        if (params.tags && params.tags.length > 0) {
            console.error('🏷️  正在添加标签...');
            console.error('⚠️  标签添加功能待实现');
        }
        console.error('✅ 表单填写完成');
        console.error('💡 提示: 请在浏览器中手动保存草稿或发布');
        console.error('💡 浏览器将保持打开，您可以继续编辑或发布');
        const result: PostNoteResult = {
            success: true,
            message: '表单填写完成，请在浏览器中手动保存草稿或发布',
        };
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
        console.error('📭 暂时没有可以发布的笔记');
        process.exit(1);
    }
    console.error(`\n📋 请选择要发布的笔记 (共 ${posts.length} 个):\n`);
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



