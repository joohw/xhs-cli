// 封面生成核心功能
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { getCoverTemplate } from './templates.js';
import { join } from 'path';
import { loadAllFonts } from './fonts.js';
import { resetHighlightColor } from './utils/markdown.js';


// 小红书封面尺寸（2:3比例）
const COVER_WIDTH = 1080;
const COVER_HEIGHT = 1620;



// 加载字体（使用字体管理系统）
async function loadFonts() {
  return await loadAllFonts();
}


// 函数1：生成封面（只支持标题，不支持内容）
export async function generateCoverTitleOnly(title: string, templateId: string = '1', outputDir?: string): Promise<string> {
  // 验证封面模板ID
  const template = getCoverTemplate(templateId);
  if (!template) {
    throw new Error(`封面模板ID "${templateId}" 不存在`);
  }
  // 如果没有指定输出目录，使用默认目录
  if (!outputDir) {
    outputDir = join(process.cwd(), 'public', 'images');
  }
  // 确保输出目录存在
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  // 加载字体
  const fonts = await loadFonts();
  // 重置高亮颜色（为每张新图片生成随机颜色）
  resetHighlightColor();
  // 使用模板渲染仅标题的 React 元素
  const element = template.render(title);
  // 使用 satori 生成 SVG（satori 会自动匹配字体）
  const svg = await satori(element, {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    fonts: fonts,
  });
  // 使用 @resvg/resvg-js 将 SVG 转换为 PNG
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: COVER_WIDTH,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  // 保存图片
  const filename = `cover-${template.id}-${Date.now()}.png`;
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, pngBuffer);
  return filepath;
}
