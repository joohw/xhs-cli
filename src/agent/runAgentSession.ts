import { Agent } from '@mariozechner/pi-agent-core';
import { getModel } from '@mariozechner/pi-ai';
import { loadBootMarkdown } from './loadBoot.js';
import { buildXhsAgentTools } from './xhsTools.js';

/**
 * 将 `src/agent/boot.md`（构建后 `dist/agent/boot.md`）并入 system prompt（角色与数据约定）；工具由 `buildXhsAgentTools()` 单独提供。
 * API Key 等由 @mariozechner/pi-ai 从环境变量读取（如 OPENAI_API_KEY、ANTHROPIC_API_KEY）。
 */
export async function runAgentSession(promptWords: string[]): Promise<void> {
  const prompt = promptWords.join(' ').trim();
  if (!prompt) {
    console.error('用法: xhs agent "<自然语言任务>"');
    console.error('环境变量示例:');
    console.error('  XHS_AI_PROVIDER   默认 openai（亦可选 anthropic、google 等 pi-ai 支持的 provider）');
    console.error('  XHS_AI_MODEL      默认 gpt-4o-mini（须与 provider 配套）');
    console.error('  OPENAI_API_KEY / ANTHROPIC_API_KEY / … 见 pi-ai 文档');
    process.exit(1);
  }

  const provider = (process.env.XHS_AI_PROVIDER ?? 'openai') as Parameters<typeof getModel>[0];
  const modelId = (process.env.XHS_AI_MODEL ?? 'gpt-4o-mini') as Parameters<typeof getModel>[1];
  const model = getModel(provider, modelId);

  const boot = loadBootMarkdown();
  const agent = new Agent({
    initialState: {
      systemPrompt: `${boot}\n\n请用中文与用户交流；需要时依次调用工具，不要编造接口返回。`,
      model,
      tools: buildXhsAgentTools(),
      thinkingLevel: 'off',
    },
    toolExecution: 'sequential',
  });

  agent.subscribe((event) => {
    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
    if (event.type === 'tool_execution_start') {
      console.error(`\n[tool] ${event.toolName} ${JSON.stringify(event.args)}\n`);
    }
    if (event.type === 'tool_execution_end' && event.isError) {
      console.error(`\n[tool error] ${event.toolName}\n`);
    }
  });

  await agent.prompt(prompt);
  process.stdout.write('\n');
  await agent.waitForIdle();
}
