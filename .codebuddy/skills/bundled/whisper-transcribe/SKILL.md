---
name: whisper-transcribe
version: 1.0.0
description: Transcribe audio and video files to text using OpenAI Whisper (local CLI or API)
author: Code Buddy
tags: whisper, transcribe, speech-to-text, stt, audio
---

# Whisper Transcription

## Overview

Transcribe audio/video files to text using OpenAI Whisper — either locally (free, no API key) or via the API.

## Local Whisper (no API key)

### Install
```bash
pip install openai-whisper
# or with conda:
conda install -c conda-forge openai-whisper
```

### Transcribe
```bash
whisper audio.mp3 --model medium --output_format txt
whisper audio.m4a --model small --language fr --output_format srt
whisper meeting.wav --model large --output_format json
```

### Models (speed vs accuracy)

| Model | Size | Speed | Accuracy | Use When |
|-------|------|-------|----------|----------|
| tiny | 39M | Fastest | Low | Quick drafts, short clips |
| base | 74M | Fast | Fair | Simple audio, clear speech |
| small | 244M | Medium | Good | General use |
| medium | 769M | Slow | Great | Meetings, accented speech |
| large | 1.5G | Slowest | Best | Critical accuracy needed |

Models download to `~/.cache/whisper` on first use.

### Output Formats

| Format | Extension | Use |
|--------|-----------|-----|
| txt | .txt | Plain text |
| srt | .srt | Subtitles with timestamps |
| vtt | .vtt | Web subtitles |
| json | .json | Programmatic access |
| tsv | .tsv | Spreadsheet import |

### Translation (to English)
```bash
whisper audio_french.mp3 --task translate --model medium
```

## API Whisper (requires OPENAI_API_KEY)

```bash
curl -s https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F file="@audio.mp3" \
  -F model="whisper-1" \
  -F response_format="text"
```

Max file size: 25MB. For larger files, split with ffmpeg:
```bash
ffmpeg -i long_audio.mp3 -f segment -segment_time 600 -c copy chunk_%03d.mp3
```

## Tips

- Extract audio from video: `ffmpeg -i video.mp4 -vn -acodec libmp3lame audio.mp3`
- Reduce file size: `ffmpeg -i input.wav -ar 16000 -ac 1 output.mp3`
- For meetings: use `medium` or `large` model with `--language` flag
- Combine chunks: concatenate text output files
