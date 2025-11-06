// 文字转图片工具 - 使用 Puppeteer（无需 canvas）
import type { Page } from 'puppeteer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// 使用 Puppeteer 将文字转为图片
export async function textToImage(
  page: Page,
  text: string,
  options: {
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
    backgroundColor?: string;
    textColor?: string;
    padding?: number;
    lineHeight?: number;
    deviceScaleFactor?: number; // 设备像素比，用于提高清晰度
  } = {}
): Promise<string> {
  const {
    width = 900,    // 最终图片宽度
    height = 1200,  // 最终图片高度
    fontSize = 40,
    fontFamily = 'Arial, "Microsoft YaHei", sans-serif',
    backgroundColor = '#FFFFFF',
    textColor = '#000000',
    padding = 50,
    lineHeight = 1.5,
    deviceScaleFactor = 2, // 默认 2 倍，提高清晰度
  } = options;

  // 转义 HTML 特殊字符
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // 将换行符转换为 <br>
  const formattedText = escapeHtml(text).replace(/\n/g, '<br>');

  // 生成 HTML 内容，包含带 id 的预览容器
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #F5F5F5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${fontFamily};
    }
    #image-preview {
      background-color: ${backgroundColor};
      width: ${width}px;
      min-height: ${height}px;
      padding: ${padding}px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
    }
    .text-content {
      color: ${textColor};
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      white-space: pre-wrap;
      word-wrap: break-word;
      word-break: break-word;
      text-align: left;
      width: 100%;
    }
  </style>
</head>
<body>
  <div id="image-preview">
    <div class="text-content">${formattedText}</div>
  </div>
</body>
</html>
  `.trim();

  // 计算视口大小：确保能完整显示卡片，但不会太大
  // 视口大小 = 卡片大小 + 边距
  const viewportWidth = width + 200;  // 卡片宽度 + 左右边距
  const viewportHeight = height + 200; // 卡片高度 + 上下边距

  // 设置视口大小，使用 deviceScaleFactor 提高清晰度
  // deviceScaleFactor: 2 意味着截图分辨率是视口的 2 倍
  await page.setViewport({ 
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: deviceScaleFactor, // 提高清晰度
  });

  // 加载 HTML 内容
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // 等待渲染完成
  await new Promise(resolve => setTimeout(resolve, 500));

  // 保存图片到项目目录
  const outputDir = join(process.cwd(), 'temp-images');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filename = `text-${Date.now()}.png`;
  const filepath = join(outputDir, filename) as `${string}.png`;

  // 获取指定 id 的容器并截图
  const previewElement = await page.$('#image-preview');
  if (!previewElement) {
    throw new Error('未找到图片预览容器 #image-preview');
  }

  // 截图指定的容器
  // 使用 element.screenshot() 会自动根据 deviceScaleFactor 缩放
  // 实际截图尺寸 = 元素尺寸 × deviceScaleFactor
  await previewElement.screenshot({
    path: filepath,
    type: 'png',
  });

  return filepath;
}