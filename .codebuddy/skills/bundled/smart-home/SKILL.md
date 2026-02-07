---
name: smart-home
version: 1.0.0
description: Control smart home devices (Philips Hue, Home Assistant) from the terminal
author: Code Buddy
tags: smart-home, hue, homeassistant, iot, lights
---

# Smart Home Control

## Overview

Control smart home devices from the terminal via REST APIs.

## Philips Hue

### Discover bridge
```bash
curl -s https://discovery.meethue.com | jq '.[0].internalipaddress'
```

### Create API user (one-time, press bridge button first)
```bash
curl -s -X POST "http://<bridge-ip>/api" \
  -d '{"devicetype":"codebuddy#terminal"}' | jq
```

### Control lights
```bash
HUE_BRIDGE="http://<bridge-ip>/api/<username>"

# List all lights
curl -s "$HUE_BRIDGE/lights" | jq 'to_entries[] | {id: .key, name: .value.name, on: .value.state.on}'

# Turn on light 1
curl -s -X PUT "$HUE_BRIDGE/lights/1/state" -d '{"on":true}'

# Set color (hue: 0-65535, sat: 0-254, bri: 0-254)
curl -s -X PUT "$HUE_BRIDGE/lights/1/state" -d '{"on":true,"hue":46920,"sat":254,"bri":254}'

# Turn off all lights
curl -s "$HUE_BRIDGE/lights" | jq -r 'keys[]' | while read id; do
  curl -s -X PUT "$HUE_BRIDGE/lights/$id/state" -d '{"on":false}'
done
```

### Scenes
```bash
# List scenes
curl -s "$HUE_BRIDGE/scenes" | jq 'to_entries[] | {id: .key, name: .value.name}'

# Activate scene
curl -s -X PUT "$HUE_BRIDGE/groups/0/action" -d '{"scene":"<scene-id>"}'
```

## Home Assistant

### API access
```bash
HA_URL="http://<ha-ip>:8123"
HA_TOKEN="your-long-lived-access-token"

# List entities
curl -s "$HA_URL/api/states" -H "Authorization: Bearer $HA_TOKEN" \
  | jq '.[].entity_id' | head -20

# Get entity state
curl -s "$HA_URL/api/states/light.living_room" -H "Authorization: Bearer $HA_TOKEN" | jq

# Turn on
curl -s -X POST "$HA_URL/api/services/light/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}'

# Turn off
curl -s -X POST "$HA_URL/api/services/light/turn_off" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -d '{"entity_id": "light.living_room"}'
```

## Tips

- Store bridge IP and API key in `.env` for convenience
- Hue bridge button must be pressed within 30s of creating a user
- Home Assistant long-lived tokens: Profile → Long-Lived Access Tokens
- Use `jq` to filter large entity lists: `| jq '.[] | select(.entity_id | startswith("light."))'`
