# AI Providers Configuration

Code Buddy supports multiple AI providers as backends. You can use any of the following:

- **Grok** (xAI) - Default
- **Claude** (Anthropic)
- **ChatGPT** (OpenAI)
- **Gemini** (Google)

## Quick Setup

### Environment Variables

Set the API key for your preferred provider:

```bash
# Grok (xAI) - Default
export GROK_API_KEY="your-xai-api-key"
# or
export XAI_API_KEY="your-xai-api-key"

# Claude (Anthropic)
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# ChatGPT (OpenAI)
export OPENAI_API_KEY="your-openai-api-key"

# Gemini (Google)
export GOOGLE_API_KEY="your-google-api-key"
# or
export GEMINI_API_KEY="your-gemini-api-key"
```

### Installing Optional SDKs

Some providers require optional SDKs:

```bash
# For Claude (Anthropic)
npm install @anthropic-ai/sdk

# For Gemini (Google)
npm install @google/generative-ai
```

OpenAI SDK is included by default.

## Using Providers

### CLI Usage

```bash
# Use default provider (Grok)
buddy chat "Hello"

# Use specific provider
buddy --provider claude chat "Hello"
buddy --provider openai chat "Hello"
buddy --provider gemini chat "Hello"

# Use specific model
buddy --model gpt-4o chat "Hello"
buddy --model claude-3-5-sonnet-latest chat "Hello"
```

### Switching Providers

```bash
# Switch to Claude
buddy provider set claude

# Switch to ChatGPT
buddy provider set openai

# List available providers
buddy provider list

# Show current provider
buddy provider current
```

## Provider Features

| Provider | Tool Use | Vision | Max Context | Streaming |
|----------|----------|--------|-------------|-----------|
| Grok     | ✅       | ✅     | 128K        | ✅        |
| Claude   | ✅       | ✅     | 200K        | ✅        |
| ChatGPT  | ✅       | ✅     | 128K        | ✅        |
| Gemini   | ✅       | ✅     | 2M          | ✅        |

## Available Models

### Grok (xAI)
- `grok-beta` - Latest Grok model
- `grok-vision-beta` - Vision capable
- `grok-code-fast-1` - Optimized for coding (default)

### Claude (Anthropic)
- `claude-sonnet-4-20250514` - Claude Sonnet 4 (default)
- `claude-opus-4-20250514` - Claude Opus 4
- `claude-3-5-sonnet-latest` - Claude 3.5 Sonnet
- `claude-3-5-haiku-latest` - Claude 3.5 Haiku (fast)
- `claude-3-opus-latest` - Claude 3 Opus

### ChatGPT (OpenAI)
- `gpt-4o` - GPT-4o (default)
- `gpt-4o-mini` - GPT-4o Mini (fast, cheap)
- `gpt-4-turbo` - GPT-4 Turbo
- `o1` - O1 reasoning model
- `o1-mini` - O1 Mini
- `o3-mini` - O3 Mini (latest)

### Gemini (Google)
- `gemini-2.0-flash` - Gemini 2.0 Flash (default)
- `gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini-1.5-flash` - Gemini 1.5 Flash

## Pricing (per 1M tokens)

| Provider | Input | Output |
|----------|-------|--------|
| Grok     | ~$2   | ~$10   |
| Claude   | $3    | $15    |
| ChatGPT  | $2.5  | $10    |
| Gemini   | $0.15 | $0.60  |

## Programmatic Usage

```typescript
import { getProviderManager, autoConfigureProviders } from 'code-buddy';

// Auto-configure from environment variables
const manager = await autoConfigureProviders();

// Or manually register providers
await manager.registerProvider('claude', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-latest',
});

await manager.registerProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

// Switch provider
manager.setActiveProvider('claude');

// Use provider
const response = await manager.complete({
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Configuration File

You can also configure providers in `.codebuddy.json`:

```json
{
  "provider": "claude",
  "model": "claude-3-5-sonnet-latest",
  "providers": {
    "claude": {
      "model": "claude-3-5-sonnet-latest",
      "temperature": 0.7
    },
    "openai": {
      "model": "gpt-4o",
      "temperature": 0.7
    }
  }
}
```

## Troubleshooting

### "Anthropic SDK not installed"

Install the optional dependency:
```bash
npm install @anthropic-ai/sdk
```

### "Invalid API key"

Make sure your API key is correctly set in environment variables. Check:
```bash
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

### Provider not available

Verify the provider is registered:
```bash
buddy provider list
```

If empty, ensure the API key environment variable is set before starting Code Buddy.
