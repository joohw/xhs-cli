// 测试函数 - 仅打开浏览器到主页，方便调试
import { launchBrowser } from '../browser/browser.js';


// 打开浏览器到主页（仅用于调试）
export async function openTestBrowser(): Promise<void> {
  // 使用 browser 模块启动非无头浏览器
  const browser = await launchBrowser(false);
  const page = await browser.newPage();
  await page.goto('https://creator.xiaohongshu.com/new/home', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  console.log('✅ 浏览器已打开，可以开始调试\n');
  console.log('提示: 浏览器将保持打开状态，请手动关闭\n');
  // 不关闭浏览器，让用户手动关闭
  // browser 对象会被垃圾回收，但浏览器进程会保持运行
}


// 主函数
async function main() {
  try {
    await openTestBrowser();
  } catch (error) {
    console.error('❌ 打开浏览器失败:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  }
}


// 运行
main().catch(console.error);