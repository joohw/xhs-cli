// src/Illustrate/generateCover.ts

import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowser } from '../browser/browser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// 基于标题生成封面图片
export async function generateCover(
  title: string,
  outputPath: string,
  templateId: string = '1',
  headless: boolean = true): Promise<string[]> {
  // generateCover.js 在 dist/Illustrate/ 目录下，模板在 dist/templates/cover/ 目录下
  const htmlPath = path.resolve(__dirname, '..', 'templates', 'cover', `template_${templateId}.html`);
  const url = `file://${htmlPath}?title=${encodeURIComponent(title)}`;
  const browser = await launchBrowser(headless, [
  ]);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1620, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      html.style.width = '1080px';
      html.style.height = '1620px';
      html.style.margin = '0';
      html.style.padding = '0';
      html.style.overflow = 'hidden';
      body.style.width = '1080px';
      body.style.height = '1620px';
      body.style.margin = '0';
      body.style.padding = '0';
      body.style.overflow = 'hidden';
    });
    const timestamp = Date.now();
    const coverPath = path.join(outputPath, `cover_${timestamp}.png`);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({
      path: coverPath as `${string}.png`,
      fullPage: false,
      clip: { x: 0, y: 0, width: 1080, height: 1620 }
    });
    return [coverPath];
  } finally {
    await browser.close();
  }
}
