// 简单的 Markdown 解析工具（支持加粗、下划线等）
import React from 'react';


// 马克笔颜色列表（常见的高亮笔颜色）
const HIGHLIGHTER_COLORS = [
  'rgba(255, 235, 59, 0.3)',   // 黄色
  'rgba(255, 152, 0, 0.3)',     // 橙色
  'rgba(255, 64, 129, 0.3)',    // 粉色
  'rgba(156, 39, 176, 0.3)',    // 紫色
  'rgba(76, 175, 80, 0.3)',     // 绿色
  'rgba(33, 150, 243, 0.3)',    // 蓝色
  'rgba(255, 193, 7, 0.3)',     // 金黄色
  'rgba(236, 64, 122, 0.3)',    // 粉红色
];


// 为每张图片生成一个随机颜色（但同一张图片内保持一致）
let currentHighlightColor: string | null = null;


// 获取当前的高亮颜色（如果还没有，随机选择一个）
function getHighlightColor(): string {
  if (!currentHighlightColor) {
    currentHighlightColor = HIGHLIGHTER_COLORS[Math.floor(Math.random() * HIGHLIGHTER_COLORS.length)];
  }
  return currentHighlightColor;
}


// 重置颜色（用于新图片）
export function resetHighlightColor() {
  currentHighlightColor = null;
}


// 解析简单的 Markdown 语法并转换为 React 元素
export function parseMarkdown(text: string, baseStyle?: any): React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  let keyIndex = 0;
  
  // 递归解析函数
  function parse(text: string, style: any = {}): any[] {
    const result: any[] = [];
    let currentIndex = 0;
    
    // 匹配模式：**加粗**、__下划线__、<u>下划线</u>
    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, type: 'bold' },
      { regex: /__(.+?)__/g, type: 'underline' },
      { regex: /<u>(.+?)<\/u>/g, type: 'underline' },
    ];
    
    // 找到所有匹配项
    const matches: Array<{ start: number; end: number; type: string; content: string }> = [];
    
    for (const pattern of patterns) {
      let match;
      pattern.regex.lastIndex = 0; // 重置正则
      while ((match = pattern.regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: pattern.type,
          content: match[1],
        });
      }
    }
    
    // 按位置排序
    matches.sort((a, b) => a.start - b.start);
    
    // 处理重叠的匹配（优先处理内层的）
    const processedMatches: typeof matches = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      let overlapped = false;
      for (let j = 0; j < processedMatches.length; j++) {
        const processed = processedMatches[j];
        if (match.start < processed.end && match.end > processed.start) {
          overlapped = true;
          break;
        }
      }
      if (!overlapped) {
        processedMatches.push(match);
      }
    }
    
    // 构建结果
    let lastIndex = 0;
    for (const match of processedMatches) {
      // 添加匹配前的普通文本
      if (match.start > lastIndex) {
        const plainText = text.substring(lastIndex, match.start);
        if (plainText) {
          result.push(plainText);
        }
      }
      
      // 添加匹配的格式化文本
      const matchStyle = { ...style };
      // 所有格式强调都使用马克笔效果（包括加粗）
      if (match.type === 'bold' || match.type === 'underline') {
        // 使用 background-image 的 linear-gradient 在文字底部创建背景条
        const highlightColor = getHighlightColor();
        // 创建一个从底部向上 8px 的背景渐变
        matchStyle.backgroundImage = `linear-gradient(to top, ${highlightColor} 0%, ${highlightColor} 8px, transparent 8px, transparent 100%)`;
        matchStyle.backgroundPosition = 'bottom';
        matchStyle.backgroundRepeat = 'no-repeat';
        matchStyle.backgroundSize = '100% 8px';
      }
      
      // 递归解析匹配内容（支持嵌套）
      const nested = parse(match.content, matchStyle);
      // satori 只支持 flex 或 none，所以使用 flex 并设置为行内布局
      result.push(React.createElement('span', {
        key: `markdown-${keyIndex++}`,
        style: {
          display: 'flex',
          flexDirection: 'row',
          ...matchStyle,
        },
      }, nested))
      
      lastIndex = match.end;
    }
    
    // 添加剩余的普通文本
    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex);
      if (remaining) {
        result.push(remaining);
      }
    }
    
    // 如果没有匹配项，返回原文本
    if (result.length === 0) {
      return [text];
    }
    
    return result;
  }
  
  const parsed = parse(text, baseStyle);
  
  // 将结果转换为 React 元素数组
  return parsed.map((item, index) => {
    if (typeof item === 'string') {
      return item;
    }
    return item;
  }).filter(item => item !== null && item !== undefined);
}


// 将 Markdown 文本转换为单个 React 元素（用于内联渲染）
export function renderMarkdown(text: string, baseStyle?: any): React.ReactElement {
  const elements = parseMarkdown(text, baseStyle);
  
  // 如果只有一个元素且是字符串，直接返回
  if (elements.length === 1 && typeof elements[0] === 'string') {
    return React.createElement('span', { style: baseStyle }, elements[0]);
  }
  
  // 否则包装在 span 中，satori 只支持 flex
  return React.createElement('span', { 
    style: { 
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      ...baseStyle 
    } 
  }, elements);
}

