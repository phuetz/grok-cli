---
name: image-gen
version: 1.0.0
description: Generate images via OpenAI DALL-E or other image generation APIs
author: Code Buddy
tags: image, generation, dall-e, openai, ai-art
env:
  OPENAI_API_KEY: ""
---

# Image Generation

## Overview

Generate images from text prompts using OpenAI's image generation API.

## Prerequisites

- `OPENAI_API_KEY` environment variable set

## Usage via API

### Generate with curl
```bash
curl -s https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "prompt": "A futuristic city at sunset, cyberpunk style",
    "n": 1,
    "size": "1024x1024",
    "quality": "hd"
  }' | jq -r '.data[0].url'
```

### Download the image
```bash
url=$(curl -s https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"dall-e-3","prompt":"...","n":1,"size":"1024x1024"}' \
  | jq -r '.data[0].url')
curl -s "$url" -o /tmp/generated.png
```

## Models & Options

| Model | Sizes | Quality | Notes |
|-------|-------|---------|-------|
| dall-e-3 | 1024x1024, 1792x1024, 1024x1792 | standard, hd | Best quality, prompt rewriting |
| dall-e-2 | 256x256, 512x512, 1024x1024 | standard | Faster, cheaper |

## Tips

- DALL-E 3 rewrites your prompt for better results — check `revised_prompt` in response
- Use `hd` quality for detailed images, `standard` for quick drafts
- For landscape: `1792x1024`, for portrait: `1024x1792`
- Save to `/tmp/` for temporary images, project `assets/` for permanent ones
- To share: use the returned URL (expires after ~1 hour) or download first

## Batch Generation

```bash
for i in 1 2 3 4; do
  curl -s https://api.openai.com/v1/images/generations \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"dall-e-3\",\"prompt\":\"Variation $i of abstract art\",\"n\":1,\"size\":\"1024x1024\"}" \
    | jq -r '.data[0].url' | xargs -I{} curl -s {} -o "/tmp/gen-$i.png"
done
```
