// 字体管理系统 - 简单加载所有字体，让 satori 自己管理
import { readFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import opentype from 'opentype.js';


// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// 字体配置类型
export interface FontConfig {
  name: string;
  data: ArrayBuffer;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style: 'normal' | 'italic';
}


// 加载所有可用字体（自动扫描 fonts.ts 同目录下的 fonts 文件夹中的所有 TTF 文件）
export async function loadAllFonts(): Promise<FontConfig[]> {
  const fonts: FontConfig[] = [];
  // 字体目录位于 fonts.ts 同目录下的 fonts 文件夹
  const fontsDir = join(__dirname, 'fonts');
  
  // 确保字体目录存在
  if (!existsSync(fontsDir)) {
    throw new Error(`字体目录不存在: ${fontsDir}\n请将 TTF 格式的字体文件放入该目录`);
  }
  
  // 扫描目录下的所有 TTF 文件
  const files = readdirSync(fontsDir).filter(file => file.toLowerCase().endsWith('.ttf'));
  
  if (files.length === 0) {
    throw new Error(`未找到任何 TTF 字体文件，请确保 ${fontsDir} 目录中有字体文件`);
  }
  
  // 加载每个字体文件
  for (const file of files) {
    const fontPath = join(fontsDir, file);
    try {
      const fontData = readFileSync(fontPath);
      // 从字体文件中读取字体信息（opentype.parse 需要 ArrayBuffer）
      const font = opentype.parse(fontData.buffer);
      const fontName = font.names?.fontFamily?.en || font.names?.fullName?.en || font.names?.postscriptName?.en || file.replace('.ttf', '');
      
      // 从字体文件元数据中读取字重（OS/2 表的 usWeightClass）
      let weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 = 400;
      if (font.tables?.os2?.usWeightClass) {
        const rawWeight = font.tables.os2.usWeightClass;
        // 将字重值映射到标准值（100-900，步长为100）
        if (rawWeight <= 150) weight = 100;
        else if (rawWeight <= 250) weight = 200;
        else if (rawWeight <= 350) weight = 300;
        else if (rawWeight <= 450) weight = 400;
        else if (rawWeight <= 550) weight = 500;
        else if (rawWeight <= 650) weight = 600;
        else if (rawWeight <= 750) weight = 700;
        else if (rawWeight <= 850) weight = 800;
        else weight = 900;
      }
      
      // 从字体文件元数据中读取样式（macStyle 或 italicAngle）
      let style: 'normal' | 'italic' = 'normal';
      // 检查 italicAngle（斜体角度不为0表示是斜体）
      if (font.italicAngle && font.italicAngle !== 0) {
        style = 'italic';
      }
      // 或者检查 macStyle 标志位（位1表示斜体）
      else if (font.tables?.head?.macStyle && (font.tables.head.macStyle & 1) !== 0) {
        style = 'italic';
      }
      
      fonts.push({
        name: fontName,
        data: fontData.buffer,
        weight: weight,
        style: style,
      });
      
      console.log(`加载字体: ${fontName} (文件: ${file}, 字重: ${weight}, 样式: ${style})`);
    } catch (error) {
      console.warn(`加载字体文件失败 ${file}:`, error);
    }
  }
  
  if (fonts.length === 0) {
    throw new Error('未能加载任何字体文件');
  }
  
  console.log(`成功加载 ${fonts.length} 个字体文件`);
  return fonts;
}


// 获取所有可用字体名称列表
export function getAvailableFontNames(): string[] {
  const fontNames = new Set<string>();
  // 字体目录位于 fonts.ts 同目录下的 fonts 文件夹
  const fontsDir = join(__dirname, 'fonts');
  
  if (!existsSync(fontsDir)) {
    return [];
  }
  
  const files = readdirSync(fontsDir).filter(file => file.toLowerCase().endsWith('.ttf'));
  
  for (const file of files) {
    const fontPath = join(fontsDir, file);
    try {
      const fontData = readFileSync(fontPath);
      const font = opentype.parse(fontData.buffer);
      const fontName = font.names?.fontFamily?.en || font.names?.fullName?.en || font.names?.postscriptName?.en || file.replace('.ttf', '');
      fontNames.add(fontName);
    } catch (error) {
      // 忽略解析失败的文件
    }
  }
  
  return Array.from(fontNames);
}
