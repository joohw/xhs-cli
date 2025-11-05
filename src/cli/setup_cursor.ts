// 自动配置 Cursor MCP 服务器
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { homedir, platform } from 'os';
import { fileURLToPath } from 'url';


// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// 获取 Cursor 配置文件路径
function getCursorConfigPath(): string {
  const os = platform();
  if (os === 'win32') {
    // Windows: %APPDATA%\Cursor\User\globalStorage\cursor.mcp\mcp.json
    const appData = process.env.APPDATA;
    if (!appData) {
      throw new Error('无法找到 APPDATA 环境变量');
    }
    return join(appData, 'Cursor', 'User', 'globalStorage', 'cursor.mcp', 'mcp.json');
  } else if (os === 'darwin') {
    // macOS: ~/Library/Application Support/Cursor/User/globalStorage/cursor.mcp/mcp.json
    return join(homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'cursor.mcp', 'mcp.json');
  } else {
    // Linux: ~/.config/Cursor/User/globalStorage/cursor.mcp/mcp.json
    return join(homedir(), '.config', 'Cursor', 'User', 'globalStorage', 'cursor.mcp', 'mcp.json');
  }
}


// 获取项目根目录路径（dist/index.js 的绝对路径）
function getProjectPath(): string {
  // 从 src/cli/setup_cursor.ts 回溯到项目根目录
  const projectRoot = resolve(__dirname, '..', '..');
  const indexPath = join(projectRoot, 'dist', 'index.js');
  // 检查 dist/index.js 是否存在
  if (!existsSync(indexPath)) {
    throw new Error(`未找到 dist/index.js 文件，请先运行 npm run build 构建项目`);
  }
  return indexPath;
}


// 读取现有配置
function readExistingConfig(configPath: string): any {
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('⚠️  读取现有配置文件失败，将创建新配置');
      return {};
    }
  }
  return {};
}


// 写入配置
function writeConfig(configPath: string, config: any): void {
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
    console.log(`✅ 创建配置目录: ${configDir}`);
  }
  const content = JSON.stringify(config, null, 2);
  writeFileSync(configPath, content, 'utf-8');
  console.log(`✅ 配置文件已更新: ${configPath}`);
}


// 导出函数供 CLI 使用
export async function setupCursor(): Promise<void> {
  try {
    console.log('🚀 开始配置 Cursor MCP 服务器...\n');
    // 获取配置文件路径
    const configPath = getCursorConfigPath();
    console.log(`📁 配置文件路径: ${configPath}`);
    // 获取项目路径
    const projectPath = getProjectPath();
    console.log(`📦 项目路径: ${projectPath}`);
    // 读取现有配置
    const existingConfig = readExistingConfig(configPath);
    // 更新或创建配置
    const config = {
      ...existingConfig,
      mcpServers: {
        ...(existingConfig.mcpServers || {}),
        'xhs-mcp': {
          command: 'node',
          args: [projectPath],
        },
      },
    };
    // 写入配置
    writeConfig(configPath, config);
    console.log('\n✅ 配置完成！');
    console.log('\n📝 下一步:');
    console.log('   1. 重启 Cursor 使配置生效');
    console.log('   2. 在 Cursor 中打开 AI 面板（Cmd/Ctrl + L）');
    console.log('   3. 尝试使用工具，例如："检查我的小红书登录状态"');
    console.log('\n💡 提示: 如果未登录，请先运行: npm run xhs login');
  } catch (error) {
    console.error('\n❌ 配置失败:');
    if (error instanceof Error) {
      console.error(`   错误: ${error.message}`);
      if (error.message.includes('dist/index.js')) {
        console.error('\n💡 解决方案: 请先运行 npm run build 构建项目');
      }
    } else {
      console.error('   未知错误:', error);
    }
    process.exit(1);
  }
}
