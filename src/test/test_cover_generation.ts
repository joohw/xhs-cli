// 测试封面生成功能
import { generateCover } from '../Illustrate/generateCover.js';
import { COVER_IMAGES_DIR } from '../config.js';
import { existsSync, mkdirSync } from 'fs';

async function main() {
  if (!existsSync(COVER_IMAGES_DIR)) {
    mkdirSync(COVER_IMAGES_DIR, { recursive: true });
  }
  try {
    const title = 'XHS CLI 是所有小红书内容创作者的**版本答案**';
    const paths = await generateCover(title, COVER_IMAGES_DIR, '1');
    console.log('生成的图片路径:', paths);
  } catch (error) {
    console.error('生成失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();

