---
name: spotify
version: 1.0.0
description: Control Spotify playback from the terminal using spotify_player or spotifyd
author: Code Buddy
tags: spotify, music, playback, player
---

# Spotify Control

## Overview

Control Spotify playback from the terminal. Requires Spotify Premium.

## spotify_player (recommended TUI)

### Install
```bash
# macOS
brew install spotify_player

# Linux (cargo)
cargo install spotify_player

# Or download binary from GitHub releases
```

### Usage
```bash
# Launch TUI
spotify_player

# Commands (inside TUI)
# Space     — play/pause
# n         — next track
# p         — previous track
# /         — search
# q         — quit
```

## spotifyd + spotify-tui (alternative)

### Install
```bash
# spotifyd (daemon)
brew install spotifyd   # macOS
# spotify-tui (control)
brew install spotify-tui
```

### Usage
```bash
spotifyd --no-daemon &  # Start daemon
spt                     # Launch TUI
```

## Spotify Web API (programmatic)

### Get current track
```bash
curl -s -H "Authorization: Bearer $SPOTIFY_TOKEN" \
  https://api.spotify.com/v1/me/player/currently-playing \
  | jq -r '"\(.item.name) - \(.item.artists[0].name)"'
```

### Play/Pause
```bash
# Pause
curl -s -X PUT -H "Authorization: Bearer $SPOTIFY_TOKEN" \
  https://api.spotify.com/v1/me/player/pause

# Play
curl -s -X PUT -H "Authorization: Bearer $SPOTIFY_TOKEN" \
  https://api.spotify.com/v1/me/player/play
```

### Search
```bash
curl -s -H "Authorization: Bearer $SPOTIFY_TOKEN" \
  "https://api.spotify.com/v1/search?q=bohemian+rhapsody&type=track&limit=5" \
  | jq -r '.tracks.items[] | "\(.name) - \(.artists[0].name)"'
```

## Tips

- `spotify_player` auto-handles auth via browser OAuth flow
- Config: `~/.config/spotify-player/app.toml`
- For headless servers, use `spotifyd` daemon
- Spotify Premium required for playback control
