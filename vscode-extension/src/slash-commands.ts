/**
 * Slash Commands System
 * GitHub Copilot-style slash commands for the chat
 */

import * as vscode from 'vscode';
import { AIClient } from './ai-client';

export interface SlashCommand {
  name: string;
  description: string;
  icon: string;
  execute: (args: string, context: CommandContext) => Promise<string>;
}

export interface CommandContext {
  editor?: vscode.TextEditor;
  selection?: string;
  document?: vscode.TextDocument;
  workspaceFiles?: string[];
  terminalOutput?: string;
}

export class SlashCommandHandler {
  private commands: Map<string, SlashCommand> = new Map();

  constructor(private readonly aiClient: AIClient) {
    this.registerBuiltinCommands();
  }

  private registerBuiltinCommands(): void {
    // /explain - Explain code
    this.register({
      name: 'explain',
      description: 'Explain the selected code or concept',
      icon: '$(lightbulb)',
      execute: async (args, ctx) => {
        const code = ctx.selection || args;
        if (!code) {
          return 'Please select some code or provide code to explain.';
        }

        const language = ctx.document?.languageId || 'code';
        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are an expert developer. Explain the code clearly and concisely. Include:
- What the code does
- How it works step by step
- Any important patterns or concepts used
- Potential edge cases or gotchas`,
          },
          {
            role: 'user',
            content: `Explain this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ]);
      },
    });

    // /fix - Fix bugs in code
    this.register({
      name: 'fix',
      description: 'Fix bugs or issues in the selected code',
      icon: '$(wrench)',
      execute: async (args, ctx) => {
        const code = ctx.selection || args;
        if (!code) {
          return 'Please select some code to fix.';
        }

        const language = ctx.document?.languageId || 'code';
        const issue = args && ctx.selection ? args : 'any bugs or issues';

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are an expert ${language} developer. Analyze the code for bugs and issues, then provide the fixed version with explanations.`,
          },
          {
            role: 'user',
            content: `Fix ${issue} in this code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide the fixed code and explain what was wrong.`,
          },
        ]);
      },
    });

    // /tests - Generate tests
    this.register({
      name: 'tests',
      description: 'Generate unit tests for the selected code',
      icon: '$(beaker)',
      execute: async (args, ctx) => {
        const code = ctx.selection || args;
        if (!code) {
          return 'Please select some code to generate tests for.';
        }

        const language = ctx.document?.languageId || 'code';
        const framework = this.detectTestFramework(language);

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are an expert ${language} developer specializing in testing. Generate comprehensive unit tests using ${framework}.
Include:
- Happy path tests
- Edge cases
- Error handling tests
- Mocking where appropriate`,
          },
          {
            role: 'user',
            content: `Generate tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ]);
      },
    });

    // /doc - Add documentation
    this.register({
      name: 'doc',
      description: 'Generate documentation for the selected code',
      icon: '$(book)',
      execute: async (args, ctx) => {
        const code = ctx.selection || args;
        if (!code) {
          return 'Please select some code to document.';
        }

        const language = ctx.document?.languageId || 'code';
        const docStyle = this.getDocStyle(language);

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are an expert ${language} developer. Add comprehensive documentation using ${docStyle} style.
Include:
- Description of purpose
- Parameter descriptions with types
- Return value description
- Usage examples where helpful
- Any important notes or warnings`,
          },
          {
            role: 'user',
            content: `Add documentation to this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nReturn the code with documentation comments added.`,
          },
        ]);
      },
    });

    // /review - Code review
    this.register({
      name: 'review',
      description: 'Review code for issues and improvements',
      icon: '$(checklist)',
      execute: async (args, ctx) => {
        const code = ctx.selection || args;
        if (!code) {
          return 'Please select some code to review.';
        }

        const language = ctx.document?.languageId || 'code';

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are a senior ${language} developer conducting a code review. Provide a thorough review covering:

1. **Bugs & Issues**: Any bugs, logic errors, or potential runtime issues
2. **Security**: Security vulnerabilities (injection, XSS, etc.)
3. **Performance**: Performance issues or inefficiencies
4. **Best Practices**: Violations of coding standards or best practices
5. **Readability**: Code clarity and maintainability
6. **Suggestions**: Specific improvements with code examples

Be constructive and prioritize issues by severity.`,
          },
          {
            role: 'user',
            content: `Review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ]);
      },
    });

    // /optimize - Optimize code
    this.register({
      name: 'optimize',
      description: 'Optimize code for performance',
      icon: '$(zap)',
      execute: async (args, ctx) => {
        const code = ctx.selection || args;
        if (!code) {
          return 'Please select some code to optimize.';
        }

        const language = ctx.document?.languageId || 'code';
        const focus = args && ctx.selection ? args : 'performance and readability';

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are an expert ${language} developer specializing in optimization. Optimize the code for ${focus}.
Explain:
- What optimizations were made
- Why they improve the code
- Any trade-offs to consider`,
          },
          {
            role: 'user',
            content: `Optimize this ${language} code for ${focus}:\n\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ]);
      },
    });

    // /refactor - Refactor code
    this.register({
      name: 'refactor',
      description: 'Refactor code to improve structure',
      icon: '$(symbol-structure)',
      execute: async (args, ctx) => {
        const code = ctx.selection || args;
        if (!code) {
          return 'Please select some code to refactor.';
        }

        const language = ctx.document?.languageId || 'code';
        const goal = args && ctx.selection ? args : 'improve structure and readability';

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are an expert ${language} developer. Refactor the code to ${goal}.
Apply:
- SOLID principles where applicable
- Clean code practices
- Design patterns if beneficial
- Better naming and organization`,
          },
          {
            role: 'user',
            content: `Refactor this ${language} code to ${goal}:\n\n\`\`\`${language}\n${code}\n\`\`\``,
          },
        ]);
      },
    });

    // /commit - Generate commit message
    this.register({
      name: 'commit',
      description: 'Generate a commit message for changes',
      icon: '$(git-commit)',
      execute: async (args, ctx) => {
        const diff = args || ctx.selection || '';

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are an expert at writing git commit messages following conventional commits format.
Rules:
- Use format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf
- Keep subject line under 72 characters
- Add body with details if needed
- Be specific about what changed`,
          },
          {
            role: 'user',
            content: diff
              ? `Generate a commit message for these changes:\n\n${diff}`
              : 'Generate a commit message template for the current changes.',
          },
        ]);
      },
    });

    // /terminal - Explain terminal command or error
    this.register({
      name: 'terminal',
      description: 'Explain terminal command or error',
      icon: '$(terminal)',
      execute: async (args, ctx) => {
        const content = args || ctx.terminalOutput || '';
        if (!content) {
          return 'Please provide a terminal command or paste an error message.';
        }

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are an expert in command line tools and terminal usage. Help the user understand:
- What a command does
- Why an error occurred
- How to fix issues
- Alternative approaches`,
          },
          {
            role: 'user',
            content: `Explain this terminal output/command:\n\n\`\`\`\n${content}\n\`\`\``,
          },
        ]);
      },
    });

    // /search - Search codebase
    this.register({
      name: 'search',
      description: 'Search the codebase for patterns or concepts',
      icon: '$(search)',
      execute: async (args, ctx) => {
        if (!args) {
          return 'Please provide a search query. Example: /search authentication logic';
        }

        // Search files
        const files = await vscode.workspace.findFiles('**/*.{ts,js,py,go,rs,java,tsx,jsx}', '**/node_modules/**', 100);
        const fileList = files.map(f => vscode.workspace.asRelativePath(f)).join('\n');

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are helping search a codebase. Based on the query and file list, suggest which files are most likely relevant and why.`,
          },
          {
            role: 'user',
            content: `Search query: "${args}"\n\nAvailable files:\n${fileList}\n\nWhich files are most likely relevant to this search?`,
          },
        ]);
      },
    });

    // /new - Generate new code
    this.register({
      name: 'new',
      description: 'Generate new code from description',
      icon: '$(add)',
      execute: async (args, ctx) => {
        if (!args) {
          return 'Please describe what code to generate. Example: /new a function to validate email addresses';
        }

        const language = ctx.document?.languageId || 'typescript';

        return await this.aiClient.chat([
          {
            role: 'system',
            content: `You are an expert ${language} developer. Generate clean, well-documented code based on the description.`,
          },
          {
            role: 'user',
            content: `Generate ${language} code for: ${args}`,
          },
        ]);
      },
    });

    // /help - Show available commands
    this.register({
      name: 'help',
      description: 'Show available slash commands',
      icon: '$(question)',
      execute: async () => {
        const commandList = Array.from(this.commands.values())
          .map(cmd => `**/${cmd.name}** - ${cmd.description}`)
          .join('\n');

        return `## Available Commands\n\n${commandList}\n\n## @ Mentions\n\n- **@file** - Include a specific file\n- **@workspace** - Search across workspace\n- **@selection** - Use current selection\n- **@terminal** - Include recent terminal output\n- **@git** - Include git diff/status`;
      },
    });
  }

  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
  }

  getCommands(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  getCommand(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  parseMessage(message: string): { command?: string; args: string } {
    const match = message.match(/^\/(\w+)\s*(.*)/s);
    if (match) {
      return { command: match[1], args: match[2].trim() };
    }
    return { args: message };
  }

  async execute(command: string, args: string, context: CommandContext): Promise<string> {
    const cmd = this.commands.get(command);
    if (!cmd) {
      return `Unknown command: /${command}. Type /help for available commands.`;
    }

    try {
      return await cmd.execute(args, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return `Error executing /${command}: ${message}`;
    }
  }

  private detectTestFramework(language: string): string {
    switch (language) {
      case 'typescript':
      case 'typescriptreact':
      case 'javascript':
      case 'javascriptreact':
        return 'Jest or Vitest';
      case 'python':
        return 'pytest';
      case 'go':
        return 'Go testing package';
      case 'rust':
        return 'Rust test module';
      case 'java':
        return 'JUnit 5';
      default:
        return 'appropriate testing framework';
    }
  }

  private getDocStyle(language: string): string {
    switch (language) {
      case 'typescript':
      case 'typescriptreact':
      case 'javascript':
      case 'javascriptreact':
        return 'JSDoc';
      case 'python':
        return 'Google-style docstrings';
      case 'go':
        return 'Go doc comments';
      case 'rust':
        return 'Rust doc comments (///)';
      case 'java':
        return 'Javadoc';
      default:
        return 'standard documentation';
    }
  }
}
