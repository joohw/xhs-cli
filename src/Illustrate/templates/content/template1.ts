// 图文模板1：简约风格
import React from 'react';
import { ContentTemplateConfig } from '../types.js';


// 边距配置（单位：px）
const PADDING = {
  top: 100,
  right: 100,
  bottom: 100,
  left: 100,
};


export const contentTemplate1: ContentTemplateConfig = {
  id: '1',
  name: '简约风格图文',
  description: '简洁大方的图文设计',
  render: (title: string, content: string) => {
    return React.createElement('div', {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        fontFamily: 'Noto Sans SC',
        paddingTop: `${PADDING.top}px`,
        paddingRight: `${PADDING.right}px`,
        paddingBottom: `${PADDING.bottom}px`,
        paddingLeft: `${PADDING.left}px`,
      }
    }, [
      // 标题区域
      React.createElement('div', {
        key: 'title',
        style: {
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '40px',
          paddingBottom: '20px',
          borderBottom: '2px solid #FF6B9D',
        }
      }, [
        React.createElement('div', {
          key: 'title-text',
          style: {
            fontSize: 42,
            fontWeight: 700,
            color: '#333333',
            lineHeight: 1.3,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            width: '100%',
          }
        }, title)
      ]),
      // 内容区域
      React.createElement('div', {
        key: 'content',
        style: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }
      }, [
        React.createElement('div', {
          key: 'content-text',
          style: {
            fontSize: 32,
            color: '#333333',
            lineHeight: 1.8,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            width: '100%',
          }
        }, content)
      ])
    ]);
  }
};

