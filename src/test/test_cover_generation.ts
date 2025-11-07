// 测试封面生成功能
import { generateCoverTitleOnly } from '../Illustrate/generateCover.js';
import { COVER_IMAGES_DIR } from '../config.js';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';


// 测试用例
const testCases = [
  {
    title: '为什么间隔重复能让记忆更持久？3个实用技巧',
    templateId: '1',
    description: '普通标题测试',
  },
  {
    title: '如何用AI工具**提高工作效率**？这5个方法你一定要知道',
    templateId: '1',
    description: '包含Markdown加粗的标题',
  },
  {
    title: '从拖延症患者到高效学习者，我用了这个方法',
    templateId: '1',
    description: '长标题测试',
  },
  {
    title: '学习效率翻倍的秘密：`间隔重复`原理',
    templateId: '1',
    description: '包含Markdown代码格式的标题',
  },
  {
    title: '简单标题',
    templateId: '1',
    description: '短标题测试',
  },
];


// 测试单个封面生成
async function testCoverGeneration(
  title: string,
  templateId: string,
  description: string,
  index: number
): Promise<string> {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试 ${index + 1}: ${description}`);
    console.log(`标题: ${title}`);
    console.log(`模板ID: ${templateId}`);
    console.log(`${'='.repeat(60)}`);
    
    // 确保输出目录存在
    if (!existsSync(COVER_IMAGES_DIR)) {
      mkdirSync(COVER_IMAGES_DIR, { recursive: true });
    }
    
    const startTime = Date.now();
    const imagePath = await generateCoverTitleOnly(title, templateId, COVER_IMAGES_DIR);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 验证文件是否存在
    if (!existsSync(imagePath)) {
      throw new Error(`生成的图片文件不存在: ${imagePath}`);
    }
    
    // 获取文件大小
    const stats = statSync(imagePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`✅ 封面生成成功！`);
    console.log(`   文件路径: ${imagePath}`);
    console.log(`   文件大小: ${fileSizeKB} KB`);
    console.log(`   生成耗时: ${duration}ms`);
    
    return imagePath;
  } catch (error) {
    console.error(`❌ 封面生成失败:`, error);
    if (error instanceof Error) {
      console.error(`   错误信息: ${error.message}`);
    }
    throw error;
  }
}


// 主测试函数
async function main() {
  console.log('🚀 开始测试封面生成功能...\n');
  console.log(`输出目录: ${COVER_IMAGES_DIR}\n`);
  
  const results: Array<{ success: boolean; path?: string; error?: string }> = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    try {
      const imagePath = await testCoverGeneration(
        testCase.title,
        testCase.templateId,
        testCase.description,
        i
      );
      results.push({ success: true, path: imagePath });
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  // 输出测试总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 测试总结');
  console.log(`${'='.repeat(60)}`);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`总测试数: ${testCases.length}`);
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  
  if (successCount > 0) {
    console.log(`\n生成的图片文件:`);
    results.forEach((result, index) => {
      if (result.success && result.path) {
        const filename = result.path.split(/[/\\]/).pop();
        console.log(`  ${index + 1}. ${filename}`);
      }
    });
  }
  
  if (failCount > 0) {
    console.log(`\n失败的测试:`);
    results.forEach((result, index) => {
      if (!result.success) {
        console.log(`  ${index + 1}. ${testCases[index].description}`);
        console.log(`     错误: ${result.error}`);
      }
    });
  }
  
  console.log(`\n所有生成的图片保存在: ${COVER_IMAGES_DIR}`);
  
  // 如果有失败的测试，退出码为1
  if (failCount > 0) {
    process.exit(1);
  }
  
  console.log(`\n✅ 所有测试通过！`);
}


// 运行测试
main().catch((error) => {
  console.error('\n❌ 测试执行失败:', error);
  process.exit(1);
});

