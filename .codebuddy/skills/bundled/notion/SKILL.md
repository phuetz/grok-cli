---
name: notion
version: 1.0.0
description: Interact with Notion pages and databases via the API
author: Code Buddy
tags: notion, notes, database, wiki, productivity
env:
  NOTION_API_KEY: ""
---

# Notion Integration

## Overview

Create, read, and update Notion pages and databases via the API.

## Prerequisites

1. Create an integration at https://www.notion.so/my-integrations
2. Set `NOTION_API_KEY` environment variable
3. Share target pages/databases with the integration

## API Reference

### Search
```bash
curl -s -X POST "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"query": "Meeting Notes"}' \
  | jq '.results[] | {id: .id, title: (.properties.title.title[0].plain_text // .properties.Name.title[0].plain_text // "untitled")}'
```

### Read a page
```bash
curl -s "https://api.notion.com/v1/pages/<page-id>" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" | jq
```

### Read page content (blocks)
```bash
curl -s "https://api.notion.com/v1/blocks/<page-id>/children" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  | jq '.results[] | {type: .type, text: (.paragraph.rich_text[0].plain_text // .heading_1.rich_text[0].plain_text // .heading_2.rich_text[0].plain_text // "")}'
```

### Create a page
```bash
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"page_id": "<parent-page-id>"},
    "properties": {
      "title": {"title": [{"text": {"content": "New Page Title"}}]}
    },
    "children": [
      {"paragraph": {"rich_text": [{"text": {"content": "Page content here."}}]}}
    ]
  }' | jq '.id'
```

### Query a database
```bash
curl -s -X POST "https://api.notion.com/v1/databases/<db-id>/query" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"property": "Status", "select": {"equals": "In Progress"}}}' \
  | jq '.results[] | {id: .id, name: .properties.Name.title[0].plain_text}'
```

### Add item to database
```bash
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"database_id": "<db-id>"},
    "properties": {
      "Name": {"title": [{"text": {"content": "New Item"}}]},
      "Status": {"select": {"name": "To Do"}}
    }
  }'
```

## Tips

- All page/database IDs are UUIDs — find them in Notion URLs
- API version header is required: `Notion-Version: 2022-06-28`
- Integration must be shared with each page/database it accesses
- Use `jq` to navigate the nested response structure
- Rate limit: 3 requests/second per integration
