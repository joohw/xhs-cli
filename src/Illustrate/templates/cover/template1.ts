// 封面模板1：简约风格
import React from 'react';
import { CoverTemplateConfig } from '../types.js';
import { parseMarkdown } from '../../utils/markdown.js';


// 边距配置（单位：px）
const PADDING = {
  top: 120,
  right: 120,
  bottom: 120,
  left: 120,
};


// 引号 SVG 图标（基于 lucide-react Quote 图标）
const QuoteIcon = (props: { style?: any }) => {
  return React.createElement('svg', {
    width: '120',
    height: '120',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'rgba(51, 51, 51, 0.3)',
    strokeWidth: '1.5',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: {
      display: 'flex',
      ...(props.style || {}),
    },
  }, [
    React.createElement('path', {
      key: 'path1',
      d: 'M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z',
    }),
    React.createElement('path', {
      key: 'path2',
      d: 'M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z',
    }),
  ]);
};


export const coverTemplate1: CoverTemplateConfig = {
  id: '1',
  name: '简约风格封面',
  description: '简洁大方的封面设计',
  render: (title: string) => {
    return React.createElement('div', {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F0ED',
        position: 'relative',
        fontFamily: 'Noto Sans SC',
        paddingTop: `${PADDING.top}px`,
        paddingRight: `${PADDING.right}px`,
        paddingBottom: `${PADDING.bottom}px`,
        paddingLeft: `${PADDING.left}px`,
      }
    }, [
      // 上方引号（左上角，旋转180度）
      React.createElement('div', {
        key: 'quote-top',
        style: {
          position: 'absolute',
          top: `${PADDING.top - 40}px`,
          left: `${PADDING.left - 20}px`,
          display: 'flex',
          transform: 'rotate(180deg)',
        }
      }, React.createElement(QuoteIcon, {
        style: {
          width: '120px',
          height: '120px',
        }
      })),
      // 标题区域（居中）
      React.createElement('div', {
        key: 'title',
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          width: '100%',
        }
      }, [
        React.createElement('div', {
          key: 'title-text',
          style: {
            fontSize: 120,
            fontWeight: 600, // semibold
            color: 'rgba(51, 51, 51, 0.8)',
            lineHeight: 1.3,
            maxWidth: '100%',
            width: '100%',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }
        }, parseMarkdown(title, {
          fontSize: 120,
          fontWeight: 600, // semibold
          color: 'rgba(51, 51, 51, 0.8)',
        }))
      ]),
    ]);
  }
};

