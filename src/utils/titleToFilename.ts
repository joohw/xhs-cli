export function titleToFilename(title: string): string {
    // 移除或替换文件名中不允许的字符
    let filename = title
        .replace(/[<>:"/\\|?*]/g, '-')  // 替换 Windows 不允许的字符
        .replace(/\s+/g, '-')           // 将空格替换为连字符
        .replace(/[^\w\u4e00-\u9fa5-]/g, '')  // 只保留字母、数字、中文和连字符
        .replace(/-+/g, '-')            // 将多个连字符合并为一个
        .replace(/^-|-$/g, '');         // 移除开头和结尾的连字符
    // 限制文件名长度（保留 .json 扩展名的空间）
    if (filename.length > 200) {
        filename = filename.substring(0, 200);
    }
    // 如果文件名为空，使用默认名称
    if (!filename) {
        filename = 'untitled';
    }
    return `${filename}.json`;
}