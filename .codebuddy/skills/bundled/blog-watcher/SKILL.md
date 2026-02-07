---
name: blog-watcher
version: 1.0.0
description: Monitor blogs, RSS/Atom feeds, and websites for updates
author: Code Buddy
tags: rss, blog, feed, monitor, watch
---

# Blog Watcher

## Overview

Monitor blogs and RSS/Atom feeds for new content and updates.

## Reading RSS/Atom Feeds

### Fetch and parse with curl + jq/xmlstarlet
```bash
# Atom feed (GitHub releases, blogs)
curl -s "https://github.com/user/repo/releases.atom" \
  | xmlstarlet sel -t -m "//entry" -v "title" -n

# RSS feed
curl -s "https://blog.example.com/rss" \
  | xmlstarlet sel -N rss="http://purl.org/rss/1.0/" -t -m "//item" -v "title" -o " | " -v "link" -n
```

### Using newsboat (TUI reader)
```bash
# Install
sudo apt-get install newsboat  # or: brew install newsboat

# Add feeds to ~/.newsboat/urls
echo "https://blog.example.com/rss" >> ~/.newsboat/urls

# Launch
newsboat
```

### Simple bash monitor
```bash
#!/bin/bash
# Check for new posts since last check
FEED_URL="https://blog.example.com/rss"
CACHE="/tmp/feedcache-$(echo "$FEED_URL" | md5sum | cut -d' ' -f1)"
NEW=$(curl -s "$FEED_URL" | xmlstarlet sel -t -m "//item" -v "title" -o "|" -v "link" -n | head -5)

if [ -f "$CACHE" ]; then
  diff <(cat "$CACHE") <(echo "$NEW") | grep "^>" | sed 's/^> //'
fi
echo "$NEW" > "$CACHE"
```

## Monitoring GitHub

```bash
# Watch releases
gh api repos/owner/repo/releases --jq '.[0:5][] | "\(.tag_name) - \(.name) (\(.published_at | split("T")[0]))"'

# Watch commits
gh api repos/owner/repo/commits --jq '.[0:5][] | "\(.sha[0:7]) \(.commit.message | split("\n")[0])"'

# Watch issues
gh api repos/owner/repo/issues --jq '.[0:10][] | "#\(.number) \(.title) [\(.state)]"'
```

## Monitoring Web Pages (changes)

```bash
# Save a snapshot and compare later
curl -s "https://example.com/page" | html2text > /tmp/page-snapshot.txt
# Later...
curl -s "https://example.com/page" | html2text | diff /tmp/page-snapshot.txt -
```

## Tips

- Install `xmlstarlet` for XML/RSS parsing: `apt install xmlstarlet` or `brew install xmlstarlet`
- Use `html2text` to convert web pages to plain text for diffing
- Combine with cron or Code Buddy's daemon for automated monitoring
- For JSON feeds (modern blogs): just use `curl -s | jq`
