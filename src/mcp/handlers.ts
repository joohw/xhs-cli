// MCP 工具处理器
// 协议层和业务逻辑层之间的适配器/中间件


import { login } from '../core/login.js';
import { checkLoginState } from '../core/check_login_state.js';
import { getOperationData } from '../core/get_operation_data.js';
import { getNoteDetail } from '../core/get_note_detail.js';
import { launchBrowser } from '../browser/browser.js';
import { getRecentNotes } from '../core/get_recent_notes.js';
import { serializeNote } from '../types/note.js';
import { serializeOperationData } from '../types/operationData.js';
import { formatForMCP, formatErrorForMCP } from './format.js';
import { existsSync, statSync } from 'fs';
import { join } from 'path';



// 检查登录状态
export async function handleCheckLogin() {
  const isLoggedIn = await checkLoginState();
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          isLoggedIn,
          status: isLoggedIn ? '已登录' : '未登录',
          message: isLoggedIn
            ? '可以正常使用小红书功能'
            : '请先运行登录命令或通过浏览器登录',
        }, null, 2),
      },
    ],
  };
}



// 获取运营数据
export async function handleGetOverallData() {
  try {
    const data = await getOperationData();
    return formatForMCP(data, serializeOperationData);
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 获取笔记统计(MCP格式)
export async function handleGetRecentNotes(limit?: number) {
  try {
    const isLoggedIn = await checkLoginState();
    if (!isLoggedIn) {
      return formatErrorForMCP(new Error('未登录状态。请先确保已登录小红书。'));
    }
    const data = await getRecentNotes(); // 获取返回值并格式化
    const limitedData = limit ? data.slice(0, limit) : data;
    return formatForMCP(
      {
        total: data.length,
        limit: limit || data.length,
        notes: limitedData,
      },
      () => limitedData.map(note => serializeNote(note)).join('\n\n')
    );
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 获取笔记详情 - 直接调用CLI函数（已返回MCP格式）
export async function handleGetNoteDetailById(noteId: string) {
  try {
    const isLoggedIn = await checkLoginState();
    if (!isLoggedIn) {
      return formatErrorForMCP(new Error('未登录状态。请先确保已登录小红书。'));
    }
    return await getNoteDetail(noteId);
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 更新详细统计数据（需要从 CLI 中提取核心函数，暂时用占位）
export async function handleUpdateDetailedStatistics() {
  return formatErrorForMCP(new Error('功能待实现：更新详细统计数据功能尚未实现'));
}



// 读取发帖指导原则（需要从 CLI 中提取核心函数，暂时用占位）
export async function handleReadPostingGuidelines(generatePlan: boolean = true) {
  return formatErrorForMCP(new Error('功能待实现'));
}


// 登录状态详情
export async function handleLoginStatus() {
  try {
    const isLoggedIn = await checkLoginState();
    const cookiePath = join(process.cwd(), 'auth', 'cookies.json');
    let lastLoginTime: string | null = null;
    if (existsSync(cookiePath)) {
      const stats = statSync(cookiePath);
      lastLoginTime = stats.mtime.toISOString();
    }
    let browserConnection = false;
    try {
      const browser = await launchBrowser(true);
      await browser.close();
      browserConnection = true;
    } catch {
      browserConnection = false;
    }
    const statusInfo = {
      isLoggedIn,
      hasValidCookies: isLoggedIn,
      browserConnection,
      lastLoginTime,
      capabilities: {
        canAccessCreatorCenter: isLoggedIn,
        canFetchStatistics: isLoggedIn,
        canGetNoteDetails: isLoggedIn,
      },
    };
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(statusInfo, null, 2),
        },
      ],
    };
  } catch (error) {
    return formatErrorForMCP(error);
  }
}



// 登录
export async function handleLogin() {
  try {
    const loginResult = await login();
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: loginResult,
            message: loginResult
              ? '登录成功或已处于登录状态'
              : '登录失败，请重试',
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return formatErrorForMCP(error);
  }
}
