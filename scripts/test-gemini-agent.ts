#!/usr/bin/env npx tsx
/**
 * Full Agent Test with Gemini Provider
 *
 * Tests the complete agent loop with tool calling
 */

import { GeminiProvider } from '../src/providers/gemini-provider.js';

const TOOLS = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files in a directory',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path' },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description: 'Execute a shell command',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute' },
      },
      required: ['command'],
    },
  },
];

// Mock tool execution
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  console.log(`  🔧 Executing tool: ${name}(${JSON.stringify(args)})`);

  const { execSync } = await import('child_process');

  switch (name) {
    case 'list_directory': {
      const path = args.path as string || '.';
      try {
        const result = execSync(`ls -la "${path}"`, { encoding: 'utf8', timeout: 5000 });
        return result;
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : e}`;
      }
    }
    case 'read_file': {
      const path = args.path as string;
      try {
        const { readFileSync } = await import('fs');
        return readFileSync(path, 'utf8').slice(0, 2000); // Limit to 2000 chars
      } catch (e) {
        return `Error reading file: ${e instanceof Error ? e.message : e}`;
      }
    }
    case 'run_command': {
      const cmd = args.command as string;
      // Safety check
      if (cmd.includes('rm ') || cmd.includes('sudo') || cmd.includes('chmod')) {
        return 'Error: Command blocked for safety';
      }
      try {
        const result = execSync(cmd, { encoding: 'utf8', timeout: 10000, cwd: process.cwd() });
        return result.slice(0, 3000);
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : e}`;
      }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

async function runAgentLoop(provider: GeminiProvider, userQuery: string) {
  console.log(`\n💬 User: ${userQuery}\n`);

  const messages: Array<{ role: string; content: string; name?: string; tool_call_id?: string }> = [
    { role: 'user', content: userQuery },
  ];

  const systemPrompt = `You are Code Buddy, an AI coding assistant. You can use tools to help users with their tasks.
When asked about files or directories, use the appropriate tools to get real information.
Be concise in your responses.`;

  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;
    console.log(`\n--- Iteration ${iterations} ---`);

    const response = await provider.complete({
      messages: messages as Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; name?: string; tool_call_id?: string }>,
      tools: TOOLS,
      systemPrompt,
      maxTokens: 1000,
      toolCallIteration: iterations - 1,
    });

    // If there's text content, add it
    if (response.content) {
      console.log(`\n🤖 Assistant: ${response.content}`);
      messages.push({ role: 'assistant', content: response.content });
    }

    // If there are tool calls, execute them
    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log(`\n📦 Tool calls: ${response.toolCalls.length}`);

      // Add assistant message with tool calls marker
      if (!response.content) {
        messages.push({ role: 'assistant', content: '[Tool calls]' });
      }

      for (const toolCall of response.toolCalls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args);

        console.log(`  📄 Result: ${result.slice(0, 200)}${result.length > 200 ? '...' : ''}`);

        messages.push({
          role: 'tool',
          content: result,
          name: toolCall.function.name,
          tool_call_id: toolCall.id,
        });
      }
    } else {
      // No more tool calls, we're done
      console.log('\n✅ Agent loop complete');
      break;
    }
  }

  if (iterations >= maxIterations) {
    console.log('\n⚠️ Max iterations reached');
  }

  return messages;
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ Set GOOGLE_API_KEY environment variable');
    process.exit(1);
  }

  console.log('🚀 Code Buddy Agent Test with Gemini 2.0 Flash\n');
  console.log('═'.repeat(50));

  const provider = new GeminiProvider();
  await provider.initialize({
    apiKey,
    model: 'gemini-2.0-flash',
  });

  // Test 1: Simple file listing
  console.log('\n📋 TEST 1: List TypeScript files in src/');
  console.log('─'.repeat(50));
  await runAgentLoop(provider, 'How many TypeScript files are there in the src/ directory? Use tools to count them.');

  // Test 2: Read and analyze a file
  console.log('\n\n📋 TEST 2: Read and analyze package.json');
  console.log('─'.repeat(50));
  await runAgentLoop(provider, 'Read the package.json file and tell me the name and version of this project.');

  // Test 3: Run a command
  console.log('\n\n📋 TEST 3: Check git status');
  console.log('─'.repeat(50));
  await runAgentLoop(provider, 'What is the current git branch and are there any uncommitted changes?');

  console.log('\n\n' + '═'.repeat(50));
  console.log('🎉 All agent tests completed!');
  console.log('═'.repeat(50));
}

main().catch(console.error);
