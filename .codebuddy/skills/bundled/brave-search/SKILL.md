---
name: brave-search
version: 1.0.0
description: Brave Search API for web search, local results, news, images, and videos
author: Code Buddy
tags: search, web, api, brave, news, images, local-search, real-time
env:
  BRAVE_SEARCH_API_KEY: ""
---

# Brave Search

Brave Search API provides privacy-focused web search with support for general web results, local business searches, news, images, and videos. Unlike other search APIs, Brave Search maintains user privacy by not tracking searches or building user profiles.

## Direct Control (CLI / API / Scripting)

### API Authentication

All requests require an API key via the `X-Subscription-Token` header. Get your key at https://api.search.brave.com/

### Web Search

**cURL Example:**
```bash
curl -s "https://api.search.brave.com/res/v1/web/search?q=artificial+intelligence+trends+2026&count=10" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: ${BRAVE_SEARCH_API_KEY}"
```

**Node.js Example:**
```javascript
import fetch from 'node-fetch';

async function braveWebSearch(query, options = {}) {
  const params = new URLSearchParams({
    q: query,
    count: options.count || 10,
    offset: options.offset || 0,
    safesearch: options.safesearch || 'moderate',
    freshness: options.freshness || '', // pd (past day), pw (past week), pm (past month), py (past year)
    text_decorations: options.textDecorations !== false,
    spellcheck: options.spellcheck !== false
  });

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status}`);
  }

  return await response.json();
}

// Usage
const results = await braveWebSearch('TypeScript best practices', {
  count: 20,
  freshness: 'py'
});

results.web.results.forEach(result => {
  console.log(`${result.title}\n${result.url}\n${result.description}\n`);
});
```

**Python Example:**
```python
import requests
import os

def brave_web_search(query, count=10, freshness=None):
    params = {
        'q': query,
        'count': count,
        'safesearch': 'moderate',
        'text_decorations': True,
        'spellcheck': True
    }

    if freshness:
        params['freshness'] = freshness

    response = requests.get(
        'https://api.search.brave.com/res/v1/web/search',
        params=params,
        headers={
            'Accept': 'application/json',
            'X-Subscription-Token': os.environ['BRAVE_SEARCH_API_KEY']
        }
    )

    response.raise_for_status()
    return response.json()

# Usage
results = brave_web_search('machine learning tutorials', count=15, freshness='pm')

for result in results.get('web', {}).get('results', []):
    print(f"{result['title']}")
    print(f"{result['url']}")
    print(f"{result['description']}\n")
```

### Local Search (Places/Businesses)

```bash
# Search for restaurants near a location
curl -s "https://api.search.brave.com/res/v1/web/search?q=restaurants+in+San+Francisco&search_lang=en&result_filter=locations" \
  -H "X-Subscription-Token: ${BRAVE_SEARCH_API_KEY}"
```

**Node.js Local Search:**
```javascript
async function braveLocalSearch(query, location) {
  const params = new URLSearchParams({
    q: `${query} in ${location}`,
    result_filter: 'locations',
    count: 20
  });

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
    }
  });

  const data = await response.json();
  return data.locations?.results || [];
}

// Usage
const places = await braveLocalSearch('coffee shops', 'Portland, OR');
places.forEach(place => {
  console.log(`${place.title} - ${place.address}`);
  console.log(`Rating: ${place.rating || 'N/A'} | ${place.phone || ''}`);
});
```

### News Search

```bash
# Search recent news with freshness filter
curl -s "https://api.search.brave.com/res/v1/web/search?q=climate+change+policy&freshness=pd&result_filter=news" \
  -H "X-Subscription-Token: ${BRAVE_SEARCH_API_KEY}"
```

**Python News Search:**
```python
def brave_news_search(query, freshness='pw'):
    """Search news articles with freshness filter (pd/pw/pm/py)"""
    params = {
        'q': query,
        'freshness': freshness,
        'result_filter': 'news',
        'count': 20
    }

    response = requests.get(
        'https://api.search.brave.com/res/v1/web/search',
        params=params,
        headers={'X-Subscription-Token': os.environ['BRAVE_SEARCH_API_KEY']}
    )

    return response.json().get('news', {}).get('results', [])

# Get today's news
articles = brave_news_search('artificial intelligence', freshness='pd')
for article in articles:
    print(f"[{article.get('age', 'N/A')}] {article['title']}")
    print(f"Source: {article.get('source', 'Unknown')}")
    print(f"{article['url']}\n")
```

### Image Search

```bash
curl -s "https://api.search.brave.com/res/v1/images/search?q=northern+lights+photography&count=20&safesearch=strict" \
  -H "X-Subscription-Token: ${BRAVE_SEARCH_API_KEY}"
```

**Node.js Image Search:**
```javascript
async function braveImageSearch(query, options = {}) {
  const params = new URLSearchParams({
    q: query,
    count: options.count || 20,
    safesearch: options.safesearch || 'moderate',
    spellcheck: true
  });

  const response = await fetch(`https://api.search.brave.com/res/v1/images/search?${params}`, {
    headers: {
      'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
    }
  });

  return await response.json();
}

// Usage
const images = await braveImageSearch('sustainable architecture', { count: 50 });
images.results.forEach(img => {
  console.log(`${img.title}`);
  console.log(`${img.url} (${img.properties.width}x${img.properties.height})`);
});
```

### Video Search

```javascript
async function braveVideoSearch(query, options = {}) {
  const params = new URLSearchParams({
    q: query,
    count: options.count || 20,
    safesearch: options.safesearch || 'moderate'
  });

  const response = await fetch(`https://api.search.brave.com/res/v1/videos/search?${params}`, {
    headers: {
      'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY
    }
  });

  return await response.json();
}

// Usage
const videos = await braveVideoSearch('TypeScript tutorials');
videos.results.forEach(video => {
  console.log(`${video.title} - ${video.duration || 'N/A'}`);
  console.log(`${video.url}\n`);
});
```

## MCP Server Integration

Add to `.codebuddy/mcp.json`:

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-brave-search"
      ],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_SEARCH_API_KEY}"
      }
    }
  }
}
```

### Available MCP Tools

Once configured, the following tools become available:

1. **brave_web_search**
   - Search the web with Brave Search
   - Parameters: `query` (string), `count` (number, default 10)
   - Returns web results with titles, URLs, descriptions

2. **brave_local_search**
   - Search for local businesses and places
   - Parameters: `query` (string), `count` (number)
   - Returns location results with addresses, ratings, phone numbers

Example MCP usage:
```
Ask Code Buddy: "Use brave_web_search to find the latest React 19 documentation"
Ask Code Buddy: "Find coffee shops near downtown Seattle using brave_local_search"
```

## Common Workflows

### 1. Research Topic with Recent Results

**Goal:** Research a technical topic and get only recent, relevant articles

```bash
# Step 1: Search with freshness filter for past month
curl -s "https://api.search.brave.com/res/v1/web/search?q=Rust+async+programming+best+practices&freshness=pm&count=20" \
  -H "X-Subscription-Token: ${BRAVE_SEARCH_API_KEY}" | jq '.web.results[] | {title, url, description, age}'

# Step 2: Filter by domain if needed (in Node.js)
const results = await braveWebSearch('Rust async programming best practices', {
  freshness: 'pm',
  count: 20
});

const officialDocs = results.web.results.filter(r =>
  r.url.includes('doc.rust-lang.org') ||
  r.url.includes('rust-lang.github.io')
);

# Step 3: Extract URLs for further processing
const urls = officialDocs.map(r => r.url);

# Step 4: Use Code Buddy to fetch and summarize
// Pass URLs to web_fetch or ask Code Buddy to analyze content
```

### 2. Monitor News on Specific Topic

**Goal:** Track breaking news and recent developments

```python
import time
from datetime import datetime

def monitor_news_topic(query, check_interval=3600):
    """Check for new articles every hour"""
    seen_urls = set()

    while True:
        articles = brave_news_search(query, freshness='pd')
        new_articles = [a for a in articles if a['url'] not in seen_urls]

        if new_articles:
            print(f"\n[{datetime.now()}] Found {len(new_articles)} new articles:")
            for article in new_articles:
                print(f"  - {article['title']}")
                print(f"    {article['url']}")
                seen_urls.add(article['url'])

        time.sleep(check_interval)

# Monitor AI policy news
monitor_news_topic('AI regulation policy', check_interval=3600)
```

### 3. Find Local Businesses with Filtering

**Goal:** Search for businesses matching specific criteria

```javascript
async function findTopRatedPlaces(type, location, minRating = 4.0) {
  // Step 1: Search for places
  const places = await braveLocalSearch(type, location);

  // Step 2: Filter by rating
  const topRated = places.filter(p =>
    p.rating && parseFloat(p.rating) >= minRating
  );

  // Step 3: Sort by rating (descending)
  topRated.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));

  // Step 4: Return formatted results
  return topRated.map(place => ({
    name: place.title,
    address: place.address,
    rating: place.rating,
    phone: place.phone,
    url: place.url
  }));
}

// Usage
const restaurants = await findTopRatedPlaces('Italian restaurants', 'Boston, MA', 4.5);
console.log(JSON.stringify(restaurants, null, 2));
```

### 4. Comparative Search Analysis

**Goal:** Compare search results across different time periods

```javascript
async function compareSearchTrends(query) {
  // Step 1: Get recent results (past day)
  const recent = await braveWebSearch(query, { freshness: 'pd', count: 10 });

  // Step 2: Get older results (past year)
  const older = await braveWebSearch(query, { freshness: 'py', count: 10 });

  // Step 3: Analyze domain distribution
  const getDomains = (results) => {
    return results.web.results.map(r => new URL(r.url).hostname);
  };

  const recentDomains = getDomains(recent);
  const olderDomains = getDomains(older);

  // Step 4: Identify trending sources
  const newSources = recentDomains.filter(d => !olderDomains.includes(d));

  console.log('New sources in past day:', newSources);

  // Step 5: Extract common themes from titles
  const recentTitles = recent.web.results.map(r => r.title).join(' ');
  console.log('\nRecent focus:', recentTitles);

  return {
    recent: recent.web.results,
    older: older.web.results,
    newSources
  };
}

// Track how coverage of a topic evolves
await compareSearchTrends('quantum computing breakthroughs');
```

### 5. Multi-Modal Content Discovery

**Goal:** Find related content across web, images, videos, and news

```javascript
async function comprehensiveSearch(topic) {
  console.log(`Searching for: ${topic}\n`);

  // Step 1: Web search for overview
  const webResults = await braveWebSearch(topic, { count: 5 });
  console.log('Top Web Results:');
  webResults.web.results.slice(0, 3).forEach(r => {
    console.log(`  ${r.title} - ${r.url}`);
  });

  // Step 2: Recent news articles
  const news = await braveNewsSearch(topic, { freshness: 'pw' });
  console.log('\nRecent News:');
  news.slice(0, 3).forEach(article => {
    console.log(`  [${article.age}] ${article.title}`);
  });

  // Step 3: Find relevant images
  const images = await braveImageSearch(topic, { count: 10 });
  console.log('\nTop Images:');
  images.results.slice(0, 3).forEach(img => {
    console.log(`  ${img.title} - ${img.url}`);
  });

  // Step 4: Video content
  const videos = await braveVideoSearch(topic, { count: 10 });
  console.log('\nVideo Resources:');
  videos.results.slice(0, 3).forEach(video => {
    console.log(`  ${video.title} - ${video.url}`);
  });

  // Step 5: Compile report
  return {
    overview: webResults.web.results[0]?.description,
    topLinks: webResults.web.results.slice(0, 5).map(r => r.url),
    newsCount: news.length,
    imageCount: images.results.length,
    videoCount: videos.results.length
  };
}

// Comprehensive research on a topic
const report = await comprehensiveSearch('sustainable energy solutions 2026');
console.log('\nResearch Summary:', report);
```

## Best Practices

1. **Use Freshness Filters:** For time-sensitive queries, always specify `freshness` parameter (pd/pw/pm/py)
2. **Result Filtering:** Use `result_filter` to get specific content types (news, locations, videos)
3. **Rate Limiting:** Respect API rate limits (typically 1 req/sec for free tier, check your plan)
4. **Safe Search:** Set appropriate `safesearch` level (off/moderate/strict) based on use case
5. **Pagination:** Use `offset` parameter for paginated results (offset = page * count)
6. **Spellcheck:** Keep `spellcheck=true` to handle typos in queries
7. **Privacy:** Brave doesn't track searches, but still avoid including PII in queries

## Troubleshooting

**API Key Issues:**
```bash
# Test API key validity
curl -I "https://api.search.brave.com/res/v1/web/search?q=test" \
  -H "X-Subscription-Token: ${BRAVE_SEARCH_API_KEY}"

# Should return 200 OK if valid, 401 if invalid
```

**No Results:**
- Check query spelling and try with `spellcheck=true`
- Remove restrictive filters (freshness, result_filter)
- Try broader search terms

**Rate Limit Errors (429):**
- Add delays between requests (min 1 second)
- Upgrade to higher tier plan
- Implement exponential backoff retry logic
