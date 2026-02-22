import fs from 'fs';
import path from 'path';

export interface InitOptions {
  force?: boolean;
  includeHooks?: boolean;
  includeMcp?: boolean;
  includeCommands?: boolean;
  includeSecurity?: boolean;
  includeGitignore?: boolean;
}

export interface InitResult {
  success: boolean;
  created: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Generate CODEBUDDY.md content tailored to the detected language/framework.
 * Exported for unit testing.
 */
export function generateCODEBUDDYMdContent(profile: {
  languages?: string[];
  framework?: string;
  commands?: { test?: string; lint?: string; build?: string; format?: string };
  directories?: { src?: string; tests?: string };
} | null): string {
  const lang = profile?.languages?.[0]?.toLowerCase() ?? '';
  const framework = profile?.framework ?? '';
  const cmds = profile?.commands ?? {};
  const dirs = profile?.directories ?? {};

  const testCmd = cmds.test ?? 'npm test';
  const lintCmd = cmds.lint ?? 'npm run lint';
  const buildCmd = cmds.build ?? 'npm run build';
  const srcDir = dirs.src ?? 'src/';
  const testsDir = dirs.tests ?? 'tests/';

  let styleSection: string;
  let archSection: string;
  let testSection: string;

  if (lang === 'python') {
    styleSection = `## Code Style Guidelines
- Follow PEP 8 conventions
- Use type annotations for all function signatures
- Format with black or ruff
- Add docstrings to public functions and classes`;
    archSection = `## Architecture
- ${srcDir} - Source code
- ${testsDir} - Test files (pytest)`;
    testSection = `## Testing
- Write tests with pytest
- Run: \`${testCmd}\`
- Maintain coverage above 80%`;
  } else if (lang === 'go') {
    styleSection = `## Code Style Guidelines
- Follow effective Go conventions
- Run \`gofmt\` / \`goimports\` before committing
- Prefer explicit error handling over panics
- Add godoc comments to exported identifiers`;
    archSection = `## Architecture
- ${srcDir} - Source packages
- ${testsDir} - Test files (*_test.go)`;
    testSection = `## Testing
- Use \`go test ./...\`
- Run: \`${testCmd}\`
- Table-driven tests are preferred`;
  } else if (lang === 'rust') {
    styleSection = `## Code Style Guidelines
- Run \`cargo fmt\` before committing
- Resolve all \`cargo clippy\` warnings
- Prefer \`Result\`/\`Option\` over panics in library code`;
    archSection = `## Architecture
- src/ - Source crates
- tests/ - Integration tests`;
    testSection = `## Testing
- Unit tests in \`#[cfg(test)]\` modules
- Run: \`${testCmd}\`
- Integration tests in tests/`;
  } else {
    // Default: TypeScript / JavaScript / unknown
    const tsNote = lang === 'typescript' || lang === 'javascript'
      ? '- Use TypeScript for all new files\n- Avoid `any`; use proper types'
      : '- Follow the existing code style';
    styleSection = `## Code Style Guidelines
${tsNote}
- Follow the existing code style
- Add comments for complex logic
- Use meaningful variable names`;
    archSection = `## Architecture
- ${srcDir} - Source code
- ${testsDir} - Test files`;
    testSection = `## Testing
- Write tests for new features
- Run: \`${testCmd}\`
- Maintain test coverage above 80%`;
  }

  const frameworkNote = framework ? `\n- Framework: ${framework}` : '';

  return `# Custom Instructions for Code Buddy

## About This Project
<!-- Describe your project here -->
This project is...${frameworkNote}

${styleSection}

${archSection}

${testSection}

## Build
- Build: \`${buildCmd}\`
- Lint: \`${lintCmd}\`

## Git Conventions
- Use conventional commits (feat:, fix:, docs:, etc.)
- Keep commits small and focused
- Write descriptive commit messages

## Important Notes
<!-- Add any project-specific notes here -->
- ...

## Forbidden Actions
<!-- List things Code Buddy should never do -->
- Never commit .env files
- Never expose API keys
- Never delete production data
`;
}

/**
 * Initialize .codebuddy directory with templates and configurations.
 * Similar to Claude Code's project initialization.
 */
export async function initCodeBuddyProject(
  workingDirectory: string = process.cwd(),
  options: InitOptions = {}
): Promise<InitResult> {
  const result: InitResult = {
    success: true,
    created: [],
    skipped: [],
    errors: []
  };

  const codebuddyDir = path.join(workingDirectory, '.codebuddy');

  // Create .codebuddy directory
  if (!fs.existsSync(codebuddyDir)) {
    fs.mkdirSync(codebuddyDir, { recursive: true });
    result.created.push('.codebuddy/');
  }

  // Create runtime directories expected by the runtime
  const runtimeDirs = ['sessions', 'runs', 'tool-results', 'knowledge'];
  for (const dir of runtimeDirs) {
    const dirPath = path.join(codebuddyDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      result.created.push(`.codebuddy/${dir}/`);
    }
  }

  // Create .codebuddy/knowledge/README.md (explains frontmatter format)
  const knowledgeReadmePath = path.join(codebuddyDir, 'knowledge', 'README.md');
  if (!fs.existsSync(knowledgeReadmePath) || options.force) {
    const knowledgeReadmeContent = `# Knowledge Directory

Place \`.md\` files here to inject domain-specific knowledge into Code Buddy's context.

## Frontmatter fields

\`\`\`yaml
---
title: "Short descriptive title"
tags: ["tag1", "tag2"]
scope: "project"       # project | global
priority: 1            # lower = higher priority
---
\`\`\`

Files with lower \`priority\` values are injected first (higher precedence).
`;
    fs.writeFileSync(knowledgeReadmePath, knowledgeReadmeContent);
    result.created.push('.codebuddy/knowledge/README.md');
  }

  // Detect project profile for smart template generation
  let profile: {
    languages?: string[];
    framework?: string;
    commands?: { test?: string; lint?: string; build?: string; format?: string };
    directories?: { src?: string; tests?: string };
  } | null = null;
  try {
    const { RepoProfiler } = await import('../agent/repo-profiler.js');
    profile = await new RepoProfiler(workingDirectory).getProfile();
  } catch {
    // RepoProfiler unavailable — use generic template
  }

  // Create CONTEXT.md — priority 1 in context-files.ts (highest priority)
  const contextMdPath = path.join(codebuddyDir, 'CONTEXT.md');
  if (!fs.existsSync(contextMdPath) || options.force) {
    try {
      const { initContextFile } = await import('../context/context-files.js');
      await initContextFile(workingDirectory);
      result.created.push('.codebuddy/CONTEXT.md');
    } catch {
      // Fallback: write a minimal CONTEXT.md manually
      const contextContent = `# Project Context

This file is automatically loaded by Code Buddy (highest priority context source).

## Project Overview

<!-- Describe your project here -->

## Architecture

<!-- Key architectural decisions -->

## Conventions

<!-- Coding conventions and patterns -->

## Important Files

<!-- Key files and their purposes -->

## Common Tasks

<!-- How to build, test, deploy -->
`;
      fs.writeFileSync(contextMdPath, contextContent);
      result.created.push('.codebuddy/CONTEXT.md');
    }
  } else {
    result.skipped.push('.codebuddy/CONTEXT.md (already exists)');
  }

  // Create CODEBUDDY.md — priority 2 in context-files.ts (project-aware)
  const codebuddyMdPath = path.join(codebuddyDir, 'CODEBUDDY.md');
  if (!fs.existsSync(codebuddyMdPath) || options.force) {
    fs.writeFileSync(codebuddyMdPath, generateCODEBUDDYMdContent(profile));
    result.created.push('.codebuddy/CODEBUDDY.md');
  } else {
    result.skipped.push('.codebuddy/CODEBUDDY.md (already exists)');
  }

  // Create hooks.json
  if (options.includeHooks !== false) {
    const hooksPath = path.join(codebuddyDir, 'hooks.json');
    if (!fs.existsSync(hooksPath) || options.force) {
      const hooksContent = {
        enabled: true,
        globalTimeout: 30000,
        hooks: [
          {
            type: 'pre-commit',
            command: 'npm run lint && npm test',
            enabled: false,
            timeout: 60000,
            continueOnError: false,
            description: 'Run linter and tests before commit'
          },
          {
            type: 'post-edit',
            command: 'npm run typecheck',
            enabled: false,
            timeout: 30000,
            continueOnError: true,
            description: 'Run type checking after file edit'
          },
          {
            type: 'on-file-change',
            command: 'prettier --write {file}',
            enabled: false,
            timeout: 10000,
            continueOnError: true,
            description: 'Format file with Prettier on change'
          }
        ]
      };
      fs.writeFileSync(hooksPath, JSON.stringify(hooksContent, null, 2));
      result.created.push('.codebuddy/hooks.json');
    } else {
      result.skipped.push('.codebuddy/hooks.json (already exists)');
    }
  }

  // Create mcp.json
  if (options.includeMcp !== false) {
    const mcpPath = path.join(codebuddyDir, 'mcp.json');
    if (!fs.existsSync(mcpPath) || options.force) {
      const mcpContent = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        description: 'MCP server configuration. This file can be committed to share MCP servers with your team.',
        mcpServers: {
          'filesystem': {
            name: 'filesystem',
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@anthropic-ai/mcp-server-filesystem', '.'],
            enabled: false,
            description: 'File system access MCP server'
          },
          'github': {
            name: 'github',
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@anthropic-ai/mcp-github'],
            env: {
              GITHUB_TOKEN: '${GITHUB_TOKEN}'
            },
            enabled: false,
            description: 'GitHub integration MCP server'
          }
        }
      };
      fs.writeFileSync(mcpPath, JSON.stringify(mcpContent, null, 2));
      result.created.push('.codebuddy/mcp.json');
    } else {
      result.skipped.push('.codebuddy/mcp.json (already exists)');
    }
  }

  // Create security.json
  if (options.includeSecurity !== false) {
    const securityPath = path.join(codebuddyDir, 'security.json');
    if (!fs.existsSync(securityPath) || options.force) {
      const securityContent = {
        mode: 'suggest',
        allowedDirectories: [],
        blockedCommands: [],
        blockedPaths: []
      };
      fs.writeFileSync(securityPath, JSON.stringify(securityContent, null, 2));
      result.created.push('.codebuddy/security.json');
    } else {
      result.skipped.push('.codebuddy/security.json (already exists)');
    }
  }

  // Create commands directory with examples
  if (options.includeCommands !== false) {
    const commandsDir = path.join(codebuddyDir, 'commands');
    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir, { recursive: true });
      result.created.push('.codebuddy/commands/');
    }

    const exampleCommandPath = path.join(commandsDir, 'example.md');
    if (!fs.existsSync(exampleCommandPath) || options.force) {
      const exampleCommandContent = `---
description: Example custom command template
---

# Example Command

This is an example slash command. Usage: /example [argument]

Replace this content with your own prompt template.

You can use placeholders:
- $1, $2, etc. for positional arguments
- $@ for all arguments combined

Example: Analyze the file $1 and suggest improvements.
`;
      fs.writeFileSync(exampleCommandPath, exampleCommandContent);
      result.created.push('.codebuddy/commands/example.md');
    }

    const deployCommandPath = path.join(commandsDir, 'deploy.md');
    if (!fs.existsSync(deployCommandPath) || options.force) {
      const deployCommandContent = `---
description: Deploy the application to production
---

# Deploy Command

Perform a deployment to production:

1. Run all tests to ensure nothing is broken
2. Build the project for production
3. Check for any uncommitted changes
4. Create a git tag for the release
5. Push to the deployment branch

Environment: $1 (default: production)

Safety checks:
- Ensure all tests pass
- Ensure no uncommitted changes
- Confirm before proceeding
`;
      fs.writeFileSync(deployCommandPath, deployCommandContent);
      result.created.push('.codebuddy/commands/deploy.md');
    }
  }

  // Create settings.json (model aligned with SettingsManager default)
  const settingsPath = path.join(codebuddyDir, 'settings.json');
  if (!fs.existsSync(settingsPath) || options.force) {
    const settingsContent = {
      model: 'grok-code-fast-1',
      maxToolRounds: 400,
      theme: 'default'
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settingsContent, null, 2));
    result.created.push('.codebuddy/settings.json');
  } else {
    result.skipped.push('.codebuddy/settings.json (already exists)');
  }

  // Update .gitignore
  if (options.includeGitignore !== false) {
    const gitignorePath = path.join(workingDirectory, '.gitignore');
    const codebuddyIgnoreEntries = `
# Code Buddy
.codebuddy/sessions/
.codebuddy/history/
.codebuddy/runs/
.codebuddy/tool-results/
.codebuddy/cache/
.codebuddy/user-settings.json
`;

    if (fs.existsSync(gitignorePath)) {
      const currentContent = fs.readFileSync(gitignorePath, 'utf-8');
      if (!currentContent.includes('# Code Buddy') && !currentContent.includes('# Grok CLI')) {
        fs.appendFileSync(gitignorePath, codebuddyIgnoreEntries);
        result.created.push('.gitignore (updated with Code Buddy entries)');
      } else {
        result.skipped.push('.gitignore (already has Code Buddy entries)');
      }
    } else {
      fs.writeFileSync(gitignorePath, codebuddyIgnoreEntries.trim());
      result.created.push('.gitignore');
    }
  }

  // Create README for .codebuddy directory
  const readmePath = path.join(codebuddyDir, 'README.md');
  if (!fs.existsSync(readmePath) || options.force) {
    const readmeContent = `# .codebuddy Directory

This directory contains configuration and customization files for [Code Buddy](https://github.com/phuetz/code-buddy).

## Files

- **CONTEXT.md** - Primary context file (highest priority, loaded first by the runtime)
- **CODEBUDDY.md** - Custom instructions that Code Buddy follows when working in this project
- **settings.json** - Project-specific settings
- **hooks.json** - Automated hooks (pre-commit, post-edit, etc.)
- **mcp.json** - MCP server configurations (committable, shared with team)
- **security.json** - Security mode configuration
- **commands/** - Custom slash commands
- **knowledge/** - Domain knowledge files (frontmatter: title, tags, scope, priority)
- **sessions/** - Saved sessions (gitignored)
- **runs/** - Run observability logs (gitignored)
- **tool-results/** - Cached tool outputs (gitignored)

## Context Priority

The runtime loads context in this order (lower number = higher priority):
1. \`.codebuddy/CONTEXT.md\` — edit this first
2. \`CODEBUDDY.md\` (project root)
3. \`.codebuddy/context.md\`
4. \`CLAUDE.md\`

## Custom Commands

Create \`.md\` files in the \`commands/\` directory to add custom slash commands.

Example \`commands/my-command.md\`:
\`\`\`markdown
---
description: My custom command
---

# My Command

Your prompt template here. Use $1, $2 for arguments.
\`\`\`

Then use it with: \`/my-command arg1 arg2\`

## Hooks

Configure automated actions in \`hooks.json\`:
- \`pre-commit\` - Run before git commit
- \`post-edit\` - Run after file edit
- \`on-file-change\` - Run when files change

## MCP Servers

Configure MCP servers in \`mcp.json\` to extend Code Buddy's capabilities.
This file can be committed to share servers with your team.

## Security

Configure security modes in \`security.json\`:
- \`suggest\` - All changes require approval (safest)
- \`auto-edit\` - File edits auto-apply, bash requires approval
- \`full-auto\` - Fully autonomous but sandboxed

## More Information

See the [Code Buddy documentation](https://github.com/phuetz/code-buddy) for more details.
`;
    fs.writeFileSync(readmePath, readmeContent);
    result.created.push('.codebuddy/README.md');
  }

  return result;
}

/**
 * Format init result for display (ASCII markers, no emojis)
 */
export function formatInitResult(result: InitResult): string {
  let output = 'Code Buddy Project Initialization\n' + '='.repeat(50) + '\n\n';

  if (result.created.length > 0) {
    output += '[+] Created:\n';
    for (const item of result.created) {
      output += `    ${item}\n`;
    }
    output += '\n';
  }

  if (result.skipped.length > 0) {
    output += '[=] Skipped (already exists):\n';
    for (const item of result.skipped) {
      output += `    ${item}\n`;
    }
    output += '\n';
  }

  if (result.errors.length > 0) {
    output += '[!] Errors:\n';
    for (const item of result.errors) {
      output += `    ${item}\n`;
    }
    output += '\n';
  }

  output += '-'.repeat(50) + '\n';
  output += 'Next steps:\n';
  output += '  1. Edit .codebuddy/CONTEXT.md  -- primary context (loaded first by the runtime)\n';
  output += '  2. Edit .codebuddy/CODEBUDDY.md -- additional custom instructions\n';
  output += '  3. Run \'buddy doctor\' to verify your environment\n';
  output += '  4. Add files to .codebuddy/knowledge/ for domain-specific context\n';

  return output;
}
