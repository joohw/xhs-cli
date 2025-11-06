// 模板配置系统 - 统一注册和管理模板
import { CoverTemplateConfig, ContentTemplateConfig } from './templates/types.js';
import { coverTemplate1 } from './templates/cover/template1.js';
import { contentTemplate1 } from './templates/content/template1.js';


// 导出类型定义
export type { CoverTemplateConfig, ContentTemplateConfig } from './templates/types.js';


// 封面模板注册表
export const coverTemplates: Record<string, CoverTemplateConfig> = {
  '1': coverTemplate1,
};


// 图文模板注册表
export const contentTemplates: Record<string, ContentTemplateConfig> = {
  '1': contentTemplate1,
};


// 获取所有封面模板列表
export function getCoverTemplatesList(): Array<{ id: string; name: string; description: string }> {
  return Object.values(coverTemplates).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }));
}


// 获取所有图文模板列表
export function getContentTemplatesList(): Array<{ id: string; name: string; description: string }> {
  return Object.values(contentTemplates).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }));
}


// 根据ID获取封面模板
export function getCoverTemplate(templateId: string): CoverTemplateConfig | null {
  return coverTemplates[templateId] || null;
}


// 根据ID获取图文模板
export function getContentTemplate(templateId: string): ContentTemplateConfig | null {
  return contentTemplates[templateId] || null;
}

