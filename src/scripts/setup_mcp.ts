// MCP 服务器自动配置脚本 - 支持 Claude Desktop 和 Cursor
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { homedir, platform } from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as readline from 'readline';


// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// 获取项目根目录路径（dist/mcp/index.js 的绝对路径）
function getProjectPath(): string {
  const projectRoot = resolve(__dirname, '..', '..');
  const indexPath = join(projectRoot, 'dist', 'mcp', 'index.js');
  if (!existsSync(indexPath)) {
    // 尝试旧路径 dist/index.js
    const oldIndexPath = join(projectRoot, 'dist', 'index.js');
    if (existsSync(oldIndexPath)) {
      return oldIndexPath;
    }
    throw new Error(`未找到 dist/mcp/index.js 或 dist/index.js 文件，请先运行 npm run build 构建项目`);
  }
  return indexPath;
}


// 获取 Claude Desktop 配置文件路径
function getClaudeDesktopConfigPath(): string {
  const os = platform();
  if (os === 'win32') {
    const appData = process.env.APPDATA;
    if (!appData) {
      throw new Error('无法找到 APPDATA 环境变量');
    }
    return join(appData, 'Claude', 'claude_desktop_config.json');
  } else if (os === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    return join(homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  }
}


// 获取 Cursor 配置文件路径
function getCursorConfigPath(): string {
  // Cursor 的配置文件路径是 ~/.cursor/mcp.json（所有平台统一）
  return join(homedir(), '.cursor', 'mcp.json');
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


// 配置 Claude Desktop
function setupClaudeDesktop(projectPath: string): boolean {
  try {
    console.log('\n📱 配置 Claude Desktop...');
    const configPath = getClaudeDesktopConfigPath();
    console.log(`📁 配置文件路径: ${configPath}`);
    const existingConfig = readExistingConfig(configPath);
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
    writeConfig(configPath, config);
    console.log('✅ Claude Desktop 配置完成！');
    return true;
  } catch (error) {
    console.error('❌ Claude Desktop 配置失败:', error instanceof Error ? error.message : error);
    return false;
  }
}


// 配置 Cursor
function setupCursor(projectPath: string): boolean {
  try {
    console.log('\n🖱️  配置 Cursor...');
    const configPath = getCursorConfigPath();
    console.log(`📁 配置文件路径: ${configPath}`);
    const existingConfig = readExistingConfig(configPath);
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
    writeConfig(configPath, config);
    console.log('✅ Cursor 配置完成！');
    return true;
  } catch (error) {
    console.error('❌ Cursor 配置失败:', error instanceof Error ? error.message : error);
    return false;
  }
}


// 检查并构建项目
function ensureBuilt(): void {
  const projectRoot = resolve(__dirname, '..', '..');
  const distPath = join(projectRoot, 'dist');
  if (!existsSync(distPath)) {
    console.log('📦 检测到未构建项目，开始构建...');
    try {
      execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ 构建完成！');
    } catch (error) {
      throw new Error('构建失败，请检查项目配置');
    }
  } else {
    const mcpIndexPath = join(distPath, 'mcp', 'index.js');
    const oldIndexPath = join(distPath, 'index.js');
    if (!existsSync(mcpIndexPath) && !existsSync(oldIndexPath)) {
      console.log('📦 检测到构建文件不完整，重新构建...');
      try {
        execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
        console.log('✅ 构建完成！');
      } catch (error) {
        throw new Error('构建失败，请检查项目配置');
      }
    }
  }
}


// 交互式询问用户要配置的客户端
async function askUserForTargets(): Promise<('claude' | 'cursor')[]> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    console.log('请选择要配置的 MCP 客户端：\n');
    console.log('  1. Claude Desktop');
    console.log('  2. Cursor');
    console.log('  3. 全部（Claude Desktop + Cursor）');
    console.log('  0. 取消\n');
    rl.question('请输入选项 (1/2/3/0): ', (answer) => {
      rl.close();
      const choice = answer.trim();
      const targets: ('claude' | 'cursor')[] = [];
      if (choice === '1') {
        targets.push('claude');
      } else if (choice === '2') {
        targets.push('cursor');
      } else if (choice === '3') {
        targets.push('claude', 'cursor');
      } else if (choice === '0') {
        console.log('已取消配置');
        process.exit(0);
      } else {
        console.log('无效选项，默认配置全部客户端');
        targets.push('claude', 'cursor');
      }
      resolve(targets);
    });
  });
}


// 主函数
export async function setupMCP(targets?: ('claude' | 'cursor')[]): Promise<void> {
  try {
    console.log('🚀 开始配置 MCP 服务器...\n');
    // 确保项目已构建
    ensureBuilt();
    // 获取项目路径
    const projectPath = getProjectPath();
    console.log(`📦 项目路径: ${projectPath}\n`);
    // 如果没有指定目标，询问用户
    let targetsToSetup: ('claude' | 'cursor')[];
    if (targets && targets.length > 0) {
      targetsToSetup = targets;
    } else {
      targetsToSetup = await askUserForTargets();
    }
    let successCount = 0;
    // 配置各个客户端
    if (targetsToSetup.includes('claude')) {
      if (setupClaudeDesktop(projectPath)) {
        successCount++;
      }
    }
    if (targetsToSetup.includes('cursor')) {
      if (setupCursor(projectPath)) {
        successCount++;
      }
    }
    // 输出结果
    if (successCount > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ MCP 服务器配置完成！');
      console.log('='.repeat(60));
      console.log('\n📝 下一步:');
      if (targetsToSetup.includes('claude')) {
        console.log('   1. 重启 Claude Desktop 使配置生效');
      }
      if (targetsToSetup.includes('cursor')) {
        console.log('   1. 重启 Cursor 使配置生效');
        console.log('   2. 在 Cursor 中打开 AI 面板（Cmd/Ctrl + L）');
      }
      console.log('   3. 尝试使用工具，例如："检查我的小红书登录状态"');
      console.log('\n💡 提示: 如果未登录，请先运行: npm run xhs login');
    } else {
      console.error('\n❌ 所有配置都失败了，请检查错误信息');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 配置失败:');
    if (error instanceof Error) {
      console.error(`   错误: ${error.message}`);
      if (error.message.includes('dist')) {
        console.error('\n💡 解决方案: 请先运行 npm run build 构建项目');
      }
    } else {
      console.error('   未知错误:', error);
    }
    process.exit(1);
  }
}


// 如果直接运行此脚本（通过 tsx 或 node）
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('setup_mcp.ts') || 
  process.argv[1].endsWith('setup_mcp.js') ||
  process.argv[1].includes('setup_mcp')
);
if (isMainModule) {
  const args = process.argv.slice(2);
  const targets: ('claude' | 'cursor')[] = [];
  // 如果指定了命令行参数，使用参数；否则会询问用户
  if (args.includes('--claude')) {
    targets.push('claude');
  }
  if (args.includes('--cursor')) {
    targets.push('cursor');
  }
  if (args.includes('--all')) {
    targets.push('claude', 'cursor');
  }
  // 如果指定了参数，使用参数；否则传入 undefined 让函数询问用户
  setupMCP(targets.length > 0 ? targets : undefined).catch(console.error);
}

