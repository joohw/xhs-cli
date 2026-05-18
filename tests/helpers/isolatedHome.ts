import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/** 为本测试文件设置独立 XHS_CLI_HOME（须在 import 业务模块之前调用） */
export function installIsolatedHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'xhs-cli-test-'));
  process.env.XHS_CLI_HOME = home;
  return home;
}

export function removeIsolatedHome(home: string): void {
  rmSync(home, { recursive: true, force: true });
  delete process.env.XHS_CLI_HOME;
}
