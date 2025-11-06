// 模板类型定义
import React from 'react';


// 封面模板配置（只需要标题）
export interface CoverTemplateConfig {
  id: string;
  name: string;
  description: string;
  render: (title: string) => React.ReactElement;
}


// 图文模板配置（需要标题和内容）
export interface ContentTemplateConfig {
  id: string;
  name: string;
  description: string;
  render: (title: string, content: string) => React.ReactElement;
}

