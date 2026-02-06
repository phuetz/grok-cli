# Skills System

## Overview

Code Buddy has a unified skill system that bridges two formats:

1. **SKILL.md** (recommended) - Natural language skills in YAML frontmatter + Markdown
2. **Legacy JSON** (deprecated) - Programmatic skills via `SkillManager`

## SKILL.md Format

```markdown
---
name: my-skill
description: What this skill does
version: 1.0.0
tags: [keyword1, keyword2]
tier: workspace
requires:
  tools: [view_file, search]
---

# My Skill

System prompt instructions here...
```

### Tiers (loading priority)
- **workspace** (highest) - `.codebuddy/skills/`
- **managed** - `~/.codebuddy/skills/`
- **bundled** (lowest) - `src/skills/bundled/`

### Matching
Skills are matched to user queries via tag similarity. When a skill matches with confidence >= 0.3:
- Its required tools are added to the tool selection
- Its system prompt is injected into context
- Steps with tool hints are included

## Unified API

```typescript
import { getSkillRegistry, getAllUnifiedSkills } from './skills/index.js';

// Get all skills (both SKILL.md and legacy) as UnifiedSkill[]
const skills = getAllUnifiedSkills();

// Search for skills
const registry = getSkillRegistry();
const matches = registry.search('typescript generics');
```

## Migration

See `src/skills/MIGRATION.md` for converting legacy JSON skills to SKILL.md format.
