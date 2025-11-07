// 封面生成结果类型
export interface CoverGenerationResult {
  images: GeneratedImage[];
  templateId: string;
  generatedAt: number;
  metadata?: Record<string, any>;
}

// 生成的图片信息
export interface GeneratedImage {
  path: string;
  type: ImageType;
  order: number;
  size?: {
    width: number;
    height: number;
  };
}


// 图片类型枚举
export enum ImageType {
  COVER = 'cover',        // 封面图
  CONTENT = 'content',    // 内容图
  DETAIL = 'detail',      // 详情图
  COMPOSITE = 'composite' // 组合图
}