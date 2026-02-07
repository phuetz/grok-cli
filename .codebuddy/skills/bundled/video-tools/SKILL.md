---
name: video-tools
version: 1.0.0
description: Extract frames, clips, and metadata from video files using ffmpeg
author: Code Buddy
tags: video, ffmpeg, frames, clip, convert, media
---

# Video Tools

## Overview

Extract frames, create clips, convert formats, and inspect video files using ffmpeg.

## Prerequisites

```bash
# Install ffmpeg
sudo apt-get install ffmpeg   # Ubuntu/Debian
brew install ffmpeg            # macOS
```

## Extract Frames

### Single frame
```bash
# First frame
ffmpeg -i video.mp4 -frames:v 1 /tmp/frame.jpg

# At specific timestamp (10 seconds)
ffmpeg -ss 00:00:10 -i video.mp4 -frames:v 1 /tmp/frame-10s.jpg

# High quality PNG
ffmpeg -ss 00:00:10 -i video.mp4 -frames:v 1 /tmp/frame.png
```

### Multiple frames
```bash
# One frame per second
ffmpeg -i video.mp4 -vf fps=1 /tmp/frame-%04d.jpg

# One frame every 10 seconds
ffmpeg -i video.mp4 -vf fps=1/10 /tmp/frame-%04d.jpg

# Specific number of frames (thumbnail grid)
ffmpeg -i video.mp4 -vf "select='not(mod(n,100))',scale=320:-1,tile=3x3" /tmp/grid.jpg
```

## Extract Clips

```bash
# Extract 30-second clip starting at 1:00
ffmpeg -ss 00:01:00 -i video.mp4 -t 30 -c copy /tmp/clip.mp4

# Extract with re-encoding (for precise cuts)
ffmpeg -ss 00:01:00 -i video.mp4 -t 30 -c:v libx264 -c:a aac /tmp/clip.mp4
```

## Convert Formats

```bash
# MP4 to WebM
ffmpeg -i video.mp4 -c:v libvpx-vp9 -c:a libopus video.webm

# MOV to MP4
ffmpeg -i video.mov -c:v libx264 -c:a aac video.mp4

# Reduce file size
ffmpeg -i video.mp4 -crf 28 -preset fast -c:a copy smaller.mp4

# Extract audio only
ffmpeg -i video.mp4 -vn -c:a libmp3lame audio.mp3
ffmpeg -i video.mp4 -vn -c:a copy audio.aac
```

## Inspect

```bash
# Get video info
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4

# Quick summary
ffprobe -v quiet -show_entries format=duration,size,bit_rate -of compact video.mp4

# Get duration
ffprobe -v quiet -show_entries format=duration -of csv=p=0 video.mp4

# Get resolution
ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 video.mp4
```

## GIF Creation

```bash
# Video to GIF (with palette for quality)
ffmpeg -i video.mp4 -vf "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif

# Specific section as GIF
ffmpeg -ss 00:00:05 -t 3 -i video.mp4 -vf "fps=15,scale=320:-1" output.gif
```

## Tips

- Use `-c copy` for fast extraction without re-encoding
- Use `-crf` (18-28) to control quality: lower = better, 23 is default
- Use `jpg` for quick previews, `png` for crisp UI frames
- `-preset ultrafast` for speed, `-preset slow` for compression
- Always use `-ss` before `-i` for fast seeking
