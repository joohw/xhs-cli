#!/usr/bin/env node
// XHS-CLI 入口：子命令由 src/agent/cliRouter 调度；工具说明见 boot.md；LLM 交互见 xhs agent

import { runCli } from './agent/cliRouter.js';

async function main() {
  const args = process.argv.slice(2);
  try {
    await runCli(args);
  } catch (error) {
    console.error('❌ 执行出错:', error);
    if (error instanceof Error) {
      console.error('错误信息:', error.message);
    }
    process.exit(1);
  }
}

main();
