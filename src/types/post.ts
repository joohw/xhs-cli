// 发布笔记参数接口
export interface PostNoteParams {
    title?: string;
    content: string;
    tags?: string[]; // 标签数组，如 ["#MCP", "#AI"]
    images?: string[]; // 图片袁术路径或在线链接
    scheduledPublishTime?: string; // 计划发布时间（ISO 8601 格式，如 "2024-01-01T10:00:00Z"）
}