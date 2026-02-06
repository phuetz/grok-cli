# Migrating from Legacy Skills to SKILL.md

## Why Migrate?

The SKILL.md system replaces the legacy JSON-based skill format with a more expressive natural language format using YAML frontmatter + Markdown. Benefits:

- **Human-readable**: Skills are written in Markdown, easy to read and edit
- **Richer metadata**: Tiers, requirements, code blocks, multi-step workflows
- **Three-tier loading**: workspace > managed > bundled (with override semantics)
- **Registry integration**: Search, match, and discover skills programmatically

## Quick Comparison

### Legacy JSON Format

```json
{
  "name": "typescript-expert",
  "description": "Expert TypeScript developer",
  "triggers": ["typescript", "type error", "generic"],
  "systemPrompt": "You are a TypeScript expert...",
  "tools": ["view_file", "search"],
  "priority": 10,
  "autoActivate": true
}
```

### SKILL.md Format

```markdown
---
name: typescript-expert
description: Expert TypeScript developer for complex type issues
version: 1.0.0
tags: [typescript, types, generics, inference]
tier: bundled
requires:
  tools: [view_file, search, str_replace_editor]
---

# TypeScript Expert

You are a TypeScript expert. Focus on:

1. Complex generic types and type inference
2. Declaration file (.d.ts) issues
3. Type guards and narrowing
4. Conditional types and mapped types
5. Module resolution and imports

Provide precise type solutions with explanations.
```

## Migration Steps

1. **Create a `.skill.md` file** in one of:
   - `.codebuddy/skills/` (workspace tier)
   - `~/.codebuddy/skills/` (managed tier)
   - `src/skills/bundled/` (bundled tier)

2. **Convert fields:**
   | Legacy Field | SKILL.md Equivalent |
   |---|---|
   | `name` | `name` in frontmatter |
   | `description` | `description` in frontmatter |
   | `triggers` | `tags` in frontmatter |
   | `systemPrompt` | Markdown body content |
   | `tools` | `requires.tools` in frontmatter |
   | `priority` | `tier` (bundled < managed < workspace) |
   | `autoActivate` | Automatic via tag matching |

3. **Register** via `SkillRegistry` (automatic on load) or use `initializeAllSkills()`.

## Backwards Compatibility

During the transition, use the unified adapter:

```typescript
import { legacyToUnified, unifiedToSkillMd } from './skills/adapters/index.js';

// Convert legacy skill to unified format
const unified = legacyToUnified(legacySkill);

// Convert unified to SKILL.md format for registration
const skillMd = unifiedToSkillMd(unified);
```

The `initializeAllSkills()` function automatically cross-registers legacy skills into the SKILL.md registry.
