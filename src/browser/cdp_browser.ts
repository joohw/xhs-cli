import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import puppeteer, { type Browser } from 'puppeteer-core';
import { BROWSER_USER_DATA_DIR, ensureAppDataLayout } from '../config.js';

/** 与 @puppeteer/browsers 一致，解析 Chrome 启动日志中的 CDP WebSocket URL。 */
const CDP_WEBSOCKET_ENDPOINT_REGEX = /^DevTools listening on (ws:\/\/.*)$/;

const LAUNCH_READY_MS = 30_000;

let spawnedChromeChild: ChildProcess | null = null;
let lastChromeLaunchHeadless = false;

export function clearSpawnedChromeProcessRef(): void {
  spawnedChromeChild = null;
}

export function wasLastChromeLaunchHeadless(): boolean {
  return lastChromeLaunchHeadless;
}

/** 按 user-data-dir 映射调试端口，避免多账号争用同一端口；可用 `XHS_BROWSER_REMOTE_DEBUGGING_PORT` 覆盖。 */
export function remoteDebuggingPortForUserDataDir(userDataDir: string): number {
  const raw = process.env.XHS_BROWSER_REMOTE_DEBUGGING_PORT?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0 && n <= 65535) {
      return n;
    }
  }
  let h = 5381;
  for (let i = 0; i < userDataDir.length; i++) {
    h = (h * 33 + userDataDir.charCodeAt(i)) | 0;
  }
  return 53471 + (Math.abs(h) % 100);
}

async function probeRemoteDebuggingWsEndpoint(
  port: number,
  timeoutMs: number,
): Promise<string | undefined> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: ctrl.signal,
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { webSocketDebuggerUrl?: string };
    const ws = data.webSocketDebuggerUrl;
    return typeof ws === 'string' && ws.length > 0 ? ws : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function waitForDevToolsWebSocketUrl(
  proc: ChildProcess,
  userDataDir: string,
  timeoutMs: number,
): Promise<string> {
  const streams = [proc.stdout, proc.stderr].filter((s): s is NonNullable<typeof s> => s != null);
  if (streams.length === 0) {
    return Promise.reject(new Error('浏览器子进程无 stdout/stderr，无法获取 CDP 地址'));
  }

  return new Promise((resolve, reject) => {
    const rls: readline.Interface[] = [];
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      for (const rl of rls) {
        try {
          rl.close();
        } catch {
          /* ignore */
        }
      }
      rls.length = 0;
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      proc.off('exit', onExit);
      proc.off('error', onProcError);
      cleanup();
      fn();
    };

    timer = setTimeout(() => {
      finish(() => {
        reject(new Error(`等待 Chrome 输出 DevTools 地址超时（${timeoutMs}ms）`));
      });
    }, timeoutMs);

    const onExit = (code: number | null) => {
      finish(() => {
        reject(
          new Error(
            code === 0
              ? `浏览器进程立即以代码 0 退出：user-data-dir「${userDataDir}」可能正被另一只「无远程调试端口」的 Chrome 持有。请关闭占用该目录的 Chrome 窗口后重试。`
              : `浏览器进程在就绪前退出（代码 ${code ?? 'unknown'}）`,
          ),
        );
      });
    };

    const onProcError = (err: Error) => {
      finish(() => {
        reject(err);
      });
    };

    const onLine = (line: string) => {
      const m = line.trim().match(CDP_WEBSOCKET_ENDPOINT_REGEX);
      if (m?.[1]) {
        finish(() => {
          resolve(m[1]);
        });
      }
    };

    proc.once('exit', onExit);
    proc.once('error', onProcError);

    for (const s of streams) {
      const rl = readline.createInterface(s);
      rls.push(rl);
      rl.on('line', onLine);
    }
  });
}

function findLocalChromiumExecutable(): string | undefined {
  const candidates: string[] = [];
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA;
    const pf = process.env.PROGRAMFILES;
    const pf86 = process.env['PROGRAMFILES(X86)'];
    if (local) {
      candidates.push(path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    if (pf) {
      candidates.push(path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    if (pf86) {
      candidates.push(path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    candidates.push(
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    );
  }
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

export type ConnectBrowserOptions = {
  executablePath?: string;
  userDataDir?: string;
  headless?: boolean;
  extraArgs?: string[];
};

/**
 * spawn + CDP connect：Node 退出时只断连，不 kill 浏览器（与 boss-cli 一致）。
 * 同一 user-data-dir 跨命令经固定调试端口复用 Chrome 实例。
 */
export async function connectBrowser(options: ConnectBrowserOptions = {}): Promise<Browser> {
  const executablePath =
    options.executablePath?.trim() ||
    process.env.CHROME_PATH?.trim() ||
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
    findLocalChromiumExecutable();

  ensureAppDataLayout();
  const userDataDir = options.userDataDir?.trim() || BROWSER_USER_DATA_DIR;
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true });
  }

  if (!executablePath) {
    throw new Error(
      '未找到本机 Chrome/Chromium。请安装浏览器或设置 CHROME_PATH / PUPPETEER_EXECUTABLE_PATH。',
    );
  }

  const headless = options.headless ?? process.env.XHS_BROWSER_HEADLESS === 'true';
  const port = remoteDebuggingPortForUserDataDir(userDataDir);

  clearSpawnedChromeProcessRef();

  const existingWsUrl = await probeRemoteDebuggingWsEndpoint(port, 800);
  if (existingWsUrl) {
    return await puppeteer.connect({
      browserWSEndpoint: existingWsUrl,
      defaultViewport: headless ? { width: 1280, height: 720 } : null,
    });
  }

  lastChromeLaunchHeadless = !!headless;

  const userArgs = [
    '--disable-infobars',
    '--disable-restore-session-state',
    '--disable-session-crashed-bubble',
    '--no-first-run',
    '--no-default-browser-check',
    ...(headless ? [] : ['--start-maximized']),
    ...(options.extraArgs ?? []),
  ];

  let chromeArgs = puppeteer
    .defaultArgs({
      browser: 'chrome',
      userDataDir,
      headless,
      args: userArgs,
    })
    .filter((a) => a !== '--enable-automation' && a !== 'about:blank' && a !== 'data:,');

  if (!chromeArgs.some((a) => a.startsWith('--remote-debugging-'))) {
    chromeArgs.push(`--remote-debugging-port=${port}`);
  }

  const proc = spawn(executablePath, chromeArgs, {
    detached: true,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  spawnedChromeChild = proc;

  let wsUrl: string;
  try {
    wsUrl = await waitForDevToolsWebSocketUrl(proc, userDataDir, LAUNCH_READY_MS);
  } catch (e) {
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
    clearSpawnedChromeProcessRef();
    throw e;
  }

  try {
    proc.stdout?.resume();
    proc.stderr?.resume();
  } catch {
    /* ignore */
  }

  if (proc.exitCode === null && proc.signalCode === null) {
    try {
      proc.unref();
    } catch {
      /* ignore */
    }
  } else {
    clearSpawnedChromeProcessRef();
  }

  try {
    return await puppeteer.connect({
      browserWSEndpoint: wsUrl,
      defaultViewport: headless ? { width: 1280, height: 720 } : null,
    });
  } catch (e) {
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
    clearSpawnedChromeProcessRef();
    throw e;
  }
}
