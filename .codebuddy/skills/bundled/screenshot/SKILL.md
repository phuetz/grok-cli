---
name: screenshot
version: 1.0.0
description: Capture screenshots and screen recordings from the terminal
author: Code Buddy
tags: screenshot, screen, capture, record, scrot
---

# Screenshot & Screen Recording

## Overview

Capture screenshots and screen recordings from the terminal.

## Screenshots

### Linux
```bash
# Full screen (scrot)
scrot /tmp/screenshot.png

# Active window
scrot -u /tmp/window.png

# Selection (click and drag)
scrot -s /tmp/selection.png

# Delayed (5 seconds)
scrot -d 5 /tmp/delayed.png

# Using gnome-screenshot
gnome-screenshot -f /tmp/screenshot.png
gnome-screenshot -a -f /tmp/area.png   # area selection

# Using import (ImageMagick)
import /tmp/screenshot.png             # click to select window
import -window root /tmp/fullscreen.png
```

### macOS
```bash
# Full screen
screencapture /tmp/screenshot.png

# Selection
screencapture -i /tmp/selection.png

# Window (click to select)
screencapture -iW /tmp/window.png

# Delayed (5 seconds)
screencapture -T 5 /tmp/delayed.png

# No shadow
screencapture -io /tmp/noshadow.png
```

### WSL (Windows Subsystem for Linux)
```bash
# Use PowerShell from WSL
powershell.exe -c "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { \$bitmap = New-Object System.Drawing.Bitmap(\$_.Bounds.Width, \$_.Bounds.Height); \$graphics = [System.Drawing.Graphics]::FromImage(\$bitmap); \$graphics.CopyFromScreen(\$_.Bounds.Location, [System.Drawing.Point]::Empty, \$_.Bounds.Size); \$bitmap.Save('C:\\tmp\\screenshot.png') }"
cp /mnt/c/tmp/screenshot.png /tmp/screenshot.png
```

## Screen Recording

### Linux (ffmpeg)
```bash
# Record screen (X11)
ffmpeg -f x11grab -r 30 -s 1920x1080 -i :0.0 -c:v libx264 -preset fast /tmp/recording.mp4

# Record with audio
ffmpeg -f x11grab -r 30 -s 1920x1080 -i :0.0 -f pulse -i default -c:v libx264 -c:a aac /tmp/recording.mp4

# Stop with Ctrl+C
```

### macOS
```bash
# Start recording
screencapture -v /tmp/recording.mp4
# Stop with Ctrl+C or Escape
```

## Tips

- Use PNG for screenshots (lossless)
- Use MP4/WebM for recordings
- For OCR on screenshots: `tesseract screenshot.png - --oem 3` (requires tesseract)
- Resize: `convert screenshot.png -resize 50% thumbnail.png`
- Annotate: `convert screenshot.png -pointsize 24 -annotate +10+30 "Text" annotated.png`
