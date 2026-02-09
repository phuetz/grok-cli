---
name: exa-search
version: 1.0.0
description: Exa neural search API for semantic search, content extraction, and similarity finding
author: Code Buddy
tags: search, semantic, neural, ai, similarity, content-extraction, exa
env:
  EXA_API_KEY: ""
---

# Exa Search

Exa (formerly Metaphor) is a neural search engine that understands meaning and context rather than just keywords. It excels at finding similar content, discovering high-quality sources, and extracting structured information from web pages. Perfect for research, content discovery, and building knowledge bases.

## Direct Control (CLI / API / Scripting)

### API Authentication

All requests require an API key via the `x-api-key` header. Get your key at https://dashboard.exa.ai/

### Basic Search

**cURL Example:**
```bash
curl -s https://api.exa.ai/search \
  -H "x-api-key: ${EXA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "groundbreaking machine learning papers",
    "num_results": 10,
    "type": "neural",
    "use_autoprompt": true
  }' | jq .
```

**Node.js Example:**
```javascript
import fetch from 'node-fetch';

async function exaSearch(query, options = {}) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.EXA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      num_results: options.numResults || 10,
      type: options.type || 'neural', // 'neural' or 'keyword'
      use_autoprompt: options.useAutoprompt !== false,
      category: options.category, // 'company', 'research paper', 'news', 'github', 'tweet', 'movie', 'song', 'personal site', 'pdf'
      start_published_date: options.startDate, // ISO 8601 format
      end_published_date: options.endDate,
      include_domains: options.includeDomains, // ['example.com']
      exclude_domains: options.excludeDomains,
      start_crawl_date: options.startCrawlDate,
      end_crawl_date: options.endCrawlDate
    })
  });

  if (!response.ok) {
    throw new Error(`Exa API error: ${response.status}`);
  }

  return await response.json();
}

// Usage
const results = await exaSearch('innovative approaches to zero-knowledge proofs', {
  numResults: 20,
  type: 'neural',
  category: 'research paper',
  startDate: '2024-01-01'
});

results.results.forEach(result => {
  console.log(`${result.title}`);
  console.log(`${result.url}`);
  console.log(`Score: ${result.score} | Published: ${result.published_date || 'N/A'}\n`);
});
```

**Python Example:**
```python
import requests
import os
from datetime import datetime, timedelta

def exa_search(query, num_results=10, search_type='neural', **kwargs):
    """
    Neural search with Exa
    search_type: 'neural' (semantic) or 'keyword' (traditional)
    """
    payload = {
        'query': query,
        'num_results': num_results,
        'type': search_type,
        'use_autoprompt': kwargs.get('use_autoprompt', True)
    }

    # Optional filters
    if 'category' in kwargs:
        payload['category'] = kwargs['category']
    if 'start_date' in kwargs:
        payload['start_published_date'] = kwargs['start_date']
    if 'end_date' in kwargs:
        payload['end_published_date'] = kwargs['end_date']
    if 'include_domains' in kwargs:
        payload['include_domains'] = kwargs['include_domains']
    if 'exclude_domains' in kwargs:
        payload['exclude_domains'] = kwargs['exclude_domains']

    response = requests.post(
        'https://api.exa.ai/search',
        headers={
            'x-api-key': os.environ['EXA_API_KEY'],
            'Content-Type': 'application/json'
        },
        json=payload
    )

    response.raise_for_status()
    return response.json()

# Usage - Find recent research papers
results = exa_search(
    'novel transformer architectures for vision tasks',
    num_results=15,
    search_type='neural',
    category='research paper',
    start_date='2025-01-01'
)

for result in results['results']:
    print(f"{result['title']}")
    print(f"{result['url']} (score: {result['score']:.3f})")
    print()
```

### Find Similar Content

**Node.js Example:**
```javascript
async function exaFindSimilar(url, options = {}) {
  const response = await fetch('https://api.exa.ai/findSimilar', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.EXA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      num_results: options.numResults || 10,
      exclude_source_domain: options.excludeSourceDomain !== false,
      category: options.category,
      start_published_date: options.startDate,
      end_published_date: options.endDate
    })
  });

  return await response.json();
}

// Find similar articles
const similar = await exaFindSimilar('https://arxiv.org/abs/2103.14030', {
  numResults: 15,
  category: 'research paper',
  excludeSourceDomain: true
});

console.log('Similar papers:');
similar.results.forEach(result => {
  console.log(`- ${result.title} (${result.url})`);
});
```

**Python Example:**
```python
def exa_find_similar(url, num_results=10, category=None, exclude_source=True):
    """
    Find content similar to a given URL
    """
    payload = {
        'url': url,
        'num_results': num_results,
        'exclude_source_domain': exclude_source
    }

    if category:
        payload['category'] = category

    response = requests.post(
        'https://api.exa.ai/findSimilar',
        headers={
            'x-api-key': os.environ['EXA_API_KEY'],
            'Content-Type': 'application/json'
        },
        json=payload
    )

    response.raise_for_status()
    return response.json()

# Find similar GitHub repos
similar_repos = exa_find_similar(
    'https://github.com/microsoft/TypeScript',
    num_results=20,
    category='github'
)

for repo in similar_repos['results']:
    print(f"{repo['title']}: {repo['url']}")
```

### Get Contents (Extract Full Text)

**Node.js Example:**
```javascript
async function exaGetContents(ids, options = {}) {
  const response = await fetch('https://api.exa.ai/contents', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.EXA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ids,
      text: options.text !== false, // Extract text content
      highlights: options.highlights, // Extract key highlights
      summary: options.summary // Generate summary
    })
  });

  return await response.json();
}

// Search and extract content
const searchResults = await exaSearch('best practices for Rust async programming', {
  numResults: 5
});

const ids = searchResults.results.map(r => r.id);
const contents = await exaGetContents(ids, {
  text: true,
  highlights: {
    query: 'async await patterns',
    num_sentences: 3,
    highlights_per_url: 2
  },
  summary: {
    query: 'What are the main recommendations?'
  }
});

contents.results.forEach(content => {
  console.log(`\n=== ${content.title} ===`);
  console.log(`URL: ${content.url}`);
  if (content.summary) {
    console.log(`\nSummary: ${content.summary}`);
  }
  if (content.highlights) {
    console.log('\nKey Points:');
    content.highlights.forEach(h => console.log(`- ${h}`));
  }
});
```

**Python Example:**
```python
def exa_get_contents(ids, text=True, highlights=None, summary=None):
    """
    Extract full content from search results
    highlights: dict with 'query', 'num_sentences', 'highlights_per_url'
    summary: dict with 'query'
    """
    payload = {
        'ids': ids,
        'text': text
    }

    if highlights:
        payload['highlights'] = highlights
    if summary:
        payload['summary'] = summary

    response = requests.post(
        'https://api.exa.ai/contents',
        headers={
            'x-api-key': os.environ['EXA_API_KEY'],
            'Content-Type': 'application/json'
        },
        json=payload
    )

    response.raise_for_status()
    return response.json()

# Search and extract
search_results = exa_search(
    'comprehensive guide to database indexing',
    num_results=3,
    category='pdf'
)

ids = [r['id'] for r in search_results['results']]
contents = exa_get_contents(
    ids,
    text=True,
    highlights={
        'query': 'B-tree index performance',
        'num_sentences': 5,
        'highlights_per_url': 3
    },
    summary={'query': 'Summarize the key indexing strategies'}
)

for content in contents['results']:
    print(f"\n{content['title']}")
    print(f"Summary: {content.get('summary', 'N/A')}")
    print("Highlights:")
    for highlight in content.get('highlights', []):
        print(f"  - {highlight}")
```

### Combined Search and Content Extraction

**Node.js Example:**
```javascript
async function exaSearchAndExtract(query, options = {}) {
  // Step 1: Search
  const searchResults = await exaSearch(query, {
    numResults: options.numResults || 10,
    type: options.type || 'neural',
    category: options.category,
    includeDomains: options.includeDomains,
    excludeDomains: options.excludeDomains,
    startDate: options.startDate
  });

  // Step 2: Extract content from top results
  const ids = searchResults.results.slice(0, options.extractTop || 5).map(r => r.id);

  const contents = await exaGetContents(ids, {
    text: true,
    highlights: options.highlights,
    summary: options.summary
  });

  // Step 3: Combine search metadata with content
  return contents.results.map((content, i) => ({
    ...searchResults.results[i],
    fullText: content.text,
    highlights: content.highlights,
    summary: content.summary
  }));
}

// Usage - Research a topic with full content
const fullResults = await exaSearchAndExtract(
  'cutting-edge techniques in federated learning',
  {
    numResults: 10,
    extractTop: 5,
    category: 'research paper',
    startDate: '2025-01-01',
    highlights: {
      query: 'privacy-preserving methods',
      num_sentences: 3
    },
    summary: {
      query: 'What are the main contributions?'
    }
  }
);

fullResults.forEach(result => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Title: ${result.title}`);
  console.log(`URL: ${result.url}`);
  console.log(`Score: ${result.score}`);
  console.log(`\nSummary: ${result.summary}`);
  console.log('\nKey Points:');
  result.highlights?.forEach(h => console.log(`  • ${h}`));
});
```

### Domain-Specific Search

**Python Example:**
```python
def exa_github_search(query, language=None, min_stars=None):
    """
    Search GitHub repositories with optional filters
    """
    # Use category='github' for better results
    results = exa_search(
        query,
        num_results=20,
        search_type='neural',
        category='github'
    )

    repos = []
    for result in results['results']:
        repo = {
            'name': result['title'],
            'url': result['url'],
            'score': result['score']
        }

        # Extract content to get more details
        content = exa_get_contents([result['id']], text=True)
        if content['results']:
            repo['description'] = content['results'][0]['text'][:200]

        repos.append(repo)

    return repos

# Find Rust web frameworks
rust_frameworks = exa_github_search('Rust web framework high performance')
for repo in rust_frameworks[:10]:
    print(f"{repo['name']}: {repo['url']}")
    print(f"Score: {repo['score']:.3f}\n")
```

### News and Article Discovery

```javascript
async function exaNewsSearch(topic, options = {}) {
  const now = new Date();
  const defaultStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const results = await exaSearch(topic, {
    numResults: options.numResults || 20,
    type: 'neural',
    category: 'news',
    startDate: options.startDate || defaultStartDate.toISOString(),
    endDate: options.endDate || now.toISOString(),
    includeDomains: options.includeDomains,
    excludeDomains: options.excludeDomains
  });

  // Get summaries for top articles
  const topIds = results.results.slice(0, 10).map(r => r.id);
  const contents = await exaGetContents(topIds, {
    summary: {
      query: options.summaryQuery || 'What are the key points of this article?'
    }
  });

  return results.results.map((result, i) => ({
    ...result,
    summary: contents.results[i]?.summary
  }));
}

// Track AI news from reputable sources
const aiNews = await exaNewsSearch('artificial intelligence breakthroughs', {
  numResults: 20,
  includeDomains: [
    'nature.com',
    'science.org',
    'technologyreview.com',
    'arxiv.org'
  ],
  summaryQuery: 'What is the key breakthrough or finding?'
});

console.log('Recent AI Breakthroughs:\n');
aiNews.forEach((article, i) => {
  console.log(`${i + 1}. ${article.title}`);
  console.log(`   ${article.url}`);
  console.log(`   ${article.summary}\n`);
});
```

## MCP Server Integration

Add to `.codebuddy/mcp.json`:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "@exa-labs/exa-mcp-server"
      ],
      "env": {
        "EXA_API_KEY": "${EXA_API_KEY}"
      }
    }
  }
}
```

### Available MCP Tools

1. **exa_search**
   - Neural/semantic search for finding relevant content
   - Parameters: `query` (string), `num_results` (number), `type` (neural/keyword), `category` (string)
   - Returns: Ranked search results with scores

2. **exa_find_similar**
   - Find content similar to a given URL
   - Parameters: `url` (string), `num_results` (number), `category` (string)
   - Returns: Similar pages ranked by relevance

3. **exa_get_contents**
   - Extract full text, highlights, or summaries from URLs
   - Parameters: `ids` (array), `text` (boolean), `highlights` (object), `summary` (object)
   - Returns: Extracted content with optional summaries

4. **exa_search_and_contents**
   - Combined search and content extraction
   - Parameters: `query` (string), `num_results` (number), `text` (boolean)
   - Returns: Search results with full content

Example MCP usage:
```
Ask Code Buddy: "Use exa_search to find neural network optimization papers from 2025"
Ask Code Buddy: "Find repositories similar to https://github.com/rust-lang/rust using exa_find_similar"
Ask Code Buddy: "Search for 'React Server Components tutorial' and extract full content using exa_search_and_contents"
```

## Common Workflows

### 1. Build Research Knowledge Base

**Goal:** Create a curated collection of high-quality sources on a topic

```javascript
async function buildKnowledgeBase(topic, options = {}) {
  console.log(`Building knowledge base for: ${topic}\n`);

  // Step 1: Find authoritative sources
  const researchPapers = await exaSearch(`${topic} research papers`, {
    numResults: 10,
    category: 'research paper',
    startDate: options.startDate || '2023-01-01'
  });

  // Step 2: Find practical guides and tutorials
  const tutorials = await exaSearch(`comprehensive ${topic} tutorial guide`, {
    numResults: 10,
    type: 'neural'
  });

  // Step 3: Find GitHub implementations
  const implementations = await exaSearch(`${topic} implementation`, {
    numResults: 10,
    category: 'github'
  });

  // Step 4: Extract content from top sources
  const allIds = [
    ...researchPapers.results.slice(0, 3).map(r => r.id),
    ...tutorials.results.slice(0, 3).map(r => r.id),
    ...implementations.results.slice(0, 2).map(r => r.id)
  ];

  const contents = await exaGetContents(allIds, {
    text: true,
    summary: {
      query: 'Provide a comprehensive summary of the key concepts and methods'
    },
    highlights: {
      query: topic,
      num_sentences: 5,
      highlights_per_url: 3
    }
  });

  // Step 5: Organize knowledge base
  const knowledgeBase = {
    topic,
    createdAt: new Date().toISOString(),
    sections: {
      research: researchPapers.results.slice(0, 5),
      tutorials: tutorials.results.slice(0, 5),
      implementations: implementations.results.slice(0, 5)
    },
    detailedContent: contents.results
  };

  // Step 6: Save to file
  const fs = require('fs');
  const filename = `knowledge-base-${topic.replace(/\s+/g, '-')}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(knowledgeBase, null, 2));

  console.log(`Knowledge base saved to: ${filename}`);
  console.log(`Total sources: ${Object.values(knowledgeBase.sections).flat().length}`);

  return knowledgeBase;
}

// Usage
const kb = await buildKnowledgeBase('differential privacy', {
  startDate: '2024-01-01'
});
```

### 2. Competitive Content Analysis

**Goal:** Analyze what competitors are publishing and find content gaps

```python
def competitive_content_analysis(competitors, topic):
    """
    Analyze content published by competitors on a specific topic
    competitors: list of domains
    """
    analysis = {
        'topic': topic,
        'competitors': {},
        'content_gaps': [],
        'unique_angles': {}
    }

    # Step 1: Search each competitor's content
    for competitor in competitors:
        results = exa_search(
            topic,
            num_results=20,
            search_type='neural',
            include_domains=[competitor]
        )

        # Step 2: Extract titles and get summaries
        if results['results']:
            ids = [r['id'] for r in results['results'][:5]]
            contents = exa_get_contents(
                ids,
                summary={'query': 'What is the main angle or unique value proposition?'}
            )

            analysis['competitors'][competitor] = {
                'article_count': len(results['results']),
                'top_articles': [
                    {
                        'title': r['title'],
                        'url': r['url'],
                        'summary': contents['results'][i].get('summary', '')
                    }
                    for i, r in enumerate(results['results'][:5])
                ]
            }

    # Step 3: Find similar high-performing content from other sources
    all_competitor_urls = []
    for comp_data in analysis['competitors'].values():
        all_competitor_urls.extend([a['url'] for a in comp_data['top_articles'][:2]])

    # Step 4: Find what others are doing differently
    for url in all_competitor_urls[:3]:
        similar = exa_find_similar(url, num_results=10, exclude_source=True)
        for result in similar['results']:
            if not any(comp in result['url'] for comp in competitors):
                analysis['unique_angles'][result['url']] = result['title']

    # Step 5: Identify content gaps
    broad_results = exa_search(
        f'{topic} comprehensive guide',
        num_results=30,
        exclude_domains=competitors
    )

    analysis['content_gaps'] = [
        {
            'title': r['title'],
            'url': r['url'],
            'score': r['score']
        }
        for r in broad_results['results'][:10]
        if r['score'] > 0.7  # High relevance but missing from competitors
    ]

    return analysis

# Analyze competitor content strategy
competitors = [
    'vercel.com',
    'netlify.com',
    'railway.app'
]

analysis = competitive_content_analysis(competitors, 'serverless deployment')

print(f"Content Analysis for: {analysis['topic']}\n")
for competitor, data in analysis['competitors'].items():
    print(f"{competitor}: {data['article_count']} articles")
    for article in data['top_articles']:
        print(f"  - {article['title']}")

print(f"\nContent Gaps ({len(analysis['content_gaps'])} opportunities):")
for gap in analysis['content_gaps'][:5]:
    print(f"  - {gap['title']} (score: {gap['score']:.2f})")
```

### 3. Trend Discovery and Monitoring

**Goal:** Discover emerging trends and track their evolution

```javascript
async function discoverTrends(baseTopic, timeWindow = 30) {
  // Step 1: Search recent content
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - timeWindow * 24 * 60 * 60 * 1000);

  const recentContent = await exaSearch(`latest developments in ${baseTopic}`, {
    numResults: 50,
    type: 'neural',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  // Step 2: Extract highlights to identify themes
  const ids = recentContent.results.map(r => r.id);
  const contents = await exaGetContents(ids, {
    highlights: {
      query: baseTopic,
      num_sentences: 2,
      highlights_per_url: 3
    }
  });

  // Step 3: Analyze title patterns to identify trends
  const titleWords = recentContent.results
    .map(r => r.title.toLowerCase())
    .join(' ')
    .split(/\s+/)
    .filter(word => word.length > 5);

  const wordFreq = {};
  titleWords.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  const trendingTerms = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }));

  // Step 4: For each trending term, find representative content
  const trendDetails = await Promise.all(
    trendingTerms.slice(0, 5).map(async ({ term }) => {
      const trendSearch = await exaSearch(`${baseTopic} ${term}`, {
        numResults: 5,
        type: 'neural',
        startDate: startDate.toISOString()
      });

      return {
        term,
        examples: trendSearch.results.slice(0, 3).map(r => ({
          title: r.title,
          url: r.url
        }))
      };
    })
  );

  // Step 5: Compare to older content to confirm novelty
  const oldStartDate = new Date(startDate.getTime() - timeWindow * 24 * 60 * 60 * 1000);
  const olderContent = await exaSearch(baseTopic, {
    numResults: 30,
    startDate: oldStartDate.toISOString(),
    endDate: startDate.toISOString()
  });

  const oldTitleWords = olderContent.results
    .map(r => r.title.toLowerCase())
    .join(' ')
    .split(/\s+/);

  const emergingTrends = trendDetails.filter(trend => {
    const oldFrequency = oldTitleWords.filter(w => w === trend.term).length;
    return oldFrequency < 3; // Term appeared less than 3 times in older content
  });

  return {
    baseTopic,
    timeWindow: `${timeWindow} days`,
    totalArticles: recentContent.results.length,
    trendingTerms,
    emergingTrends,
    detectedAt: new Date().toISOString()
  };
}

// Monitor AI trends
const trends = await discoverTrends('artificial intelligence', 30);

console.log(`Trend Analysis: ${trends.baseTopic}`);
console.log(`Time Window: ${trends.timeWindow}`);
console.log(`\nTop Trending Terms:`);
trends.trendingTerms.forEach(({ term, count }) => {
  console.log(`  ${term}: ${count} mentions`);
});

console.log(`\nEmerging Trends (${trends.emergingTrends.length}):`);
trends.emergingTrends.forEach(trend => {
  console.log(`\n  ${trend.term.toUpperCase()}`);
  trend.examples.forEach(ex => {
    console.log(`    - ${ex.title}`);
    console.log(`      ${ex.url}`);
  });
});
```

### 4. Academic Research Pipeline

**Goal:** Build comprehensive research reports with citations

```python
import json
from collections import defaultdict

def academic_research_pipeline(research_question, num_papers=20):
    """
    Comprehensive academic research workflow
    """
    print(f"Research Question: {research_question}\n")

    # Step 1: Find relevant research papers
    papers = exa_search(
        research_question,
        num_results=num_papers,
        search_type='neural',
        category='research paper',
        start_date='2020-01-01'
    )

    print(f"Found {len(papers['results'])} papers\n")

    # Step 2: Get full content and summaries
    paper_ids = [p['id'] for p in papers['results']]
    contents = exa_get_contents(
        paper_ids,
        text=True,
        summary={'query': 'What are the key contributions and methodology?'},
        highlights={
            'query': 'novel approach methodology results',
            'num_sentences': 5,
            'highlights_per_url': 5
        }
    )

    # Step 3: Categorize papers by approach/method
    categorized = defaultdict(list)

    for i, paper in enumerate(papers['results']):
        content = contents['results'][i]
        summary = content.get('summary', '')

        # Simple categorization (could use LLM for better results)
        category = 'other'
        if 'deep learning' in summary.lower():
            category = 'deep learning'
        elif 'statistical' in summary.lower() or 'bayesian' in summary.lower():
            category = 'statistical methods'
        elif 'survey' in summary.lower() or 'review' in summary.lower():
            category = 'surveys'

        categorized[category].append({
            'title': paper['title'],
            'url': paper['url'],
            'summary': summary,
            'score': paper['score'],
            'published_date': paper.get('published_date'),
            'highlights': content.get('highlights', [])
        })

    # Step 4: Find related work from top papers
    related_work = []
    for paper in papers['results'][:3]:
        similar = exa_find_similar(
            paper['url'],
            num_results=5,
            category='research paper'
        )
        related_work.extend(similar['results'])

    # Step 5: Build research report
    report = {
        'research_question': research_question,
        'generated_at': datetime.now().isoformat(),
        'paper_count': len(papers['results']),
        'categories': dict(categorized),
        'related_work': [
            {'title': r['title'], 'url': r['url']}
            for r in related_work[:10]
        ],
        'top_papers': []
    }

    # Add top 5 papers with full details
    for i in range(min(5, len(papers['results']))):
        paper = papers['results'][i]
        content = contents['results'][i]

        report['top_papers'].append({
            'rank': i + 1,
            'title': paper['title'],
            'url': paper['url'],
            'score': paper['score'],
            'published_date': paper.get('published_date'),
            'summary': content.get('summary'),
            'key_findings': content.get('highlights', [])
        })

    # Step 6: Save report
    filename = f"research-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(filename, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"Research report saved to: {filename}")

    # Print summary
    print(f"\nResearch Summary:")
    print(f"Categories found: {list(categorized.keys())}")
    for category, papers_list in categorized.items():
        print(f"  {category}: {len(papers_list)} papers")

    print(f"\nTop 3 Papers:")
    for paper in report['top_papers'][:3]:
        print(f"{paper['rank']}. {paper['title']}")
        print(f"   {paper['url']}")
        print(f"   Score: {paper['score']:.3f}")
        print()

    return report

# Usage
report = academic_research_pipeline(
    'attention mechanisms in graph neural networks',
    num_papers=30
)
```

### 5. Content Recommendation Engine

**Goal:** Build a personalized content recommendation system

```javascript
async function contentRecommendationEngine(userInterests, readHistory) {
  const recommendations = {
    personalized: [],
    trending: [],
    similar: [],
    diverse: []
  };

  // Step 1: Search based on user interests
  for (const interest of userInterests) {
    const results = await exaSearch(`in-depth ${interest} analysis`, {
      numResults: 10,
      type: 'neural'
    });

    recommendations.personalized.push(...results.results.slice(0, 3));
  }

  // Step 2: Find similar content to what user has read
  for (const readUrl of readHistory.slice(-5)) {
    try {
      const similar = await exaFindSimilar(readUrl, {
        numResults: 5,
        excludeSourceDomain: true
      });

      recommendations.similar.push(...similar.results.slice(0, 2));
    } catch (err) {
      console.error(`Failed to find similar for ${readUrl}`);
    }
  }

  // Step 3: Find trending content in user's domains
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const trending = await exaSearch(
    userInterests.join(' OR '),
    {
      numResults: 20,
      type: 'neural',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }
  );

  recommendations.trending.push(...trending.results.slice(0, 5));

  // Step 4: Diversify - find content in adjacent topics
  const adjacentTopics = await Promise.all(
    userInterests.slice(0, 2).map(async interest => {
      const results = await exaSearch(`${interest} applications`, {
        numResults: 5,
        type: 'neural'
      });
      return results.results;
    })
  );

  recommendations.diverse.push(...adjacentTopics.flat().slice(0, 5));

  // Step 5: Remove duplicates and rank
  const seen = new Set();
  const deduplicated = Object.keys(recommendations).reduce((acc, category) => {
    acc[category] = recommendations[category].filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
    return acc;
  }, {});

  // Step 6: Get summaries for top recommendations
  const topIds = [
    ...deduplicated.personalized.slice(0, 3),
    ...deduplicated.trending.slice(0, 2)
  ].map(r => r.id);

  const contents = await exaGetContents(topIds, {
    summary: { query: 'Summarize the main points and why this is valuable' }
  });

  // Step 7: Attach summaries
  let contentIndex = 0;
  ['personalized', 'trending'].forEach(category => {
    const limit = category === 'personalized' ? 3 : 2;
    deduplicated[category].slice(0, limit).forEach(rec => {
      rec.summary = contents.results[contentIndex++]?.summary;
    });
  });

  return deduplicated;
}

// Usage
const recommendations = await contentRecommendationEngine(
  ['machine learning', 'distributed systems', 'rust programming'],
  [
    'https://arxiv.org/abs/2106.09685',
    'https://jepsen.io/analyses',
    'https://blog.rust-lang.org/2024/12/05/Rust-2024.html'
  ]
);

console.log('=== PERSONALIZED RECOMMENDATIONS ===\n');
recommendations.personalized.slice(0, 5).forEach((rec, i) => {
  console.log(`${i + 1}. ${rec.title}`);
  console.log(`   ${rec.url}`);
  if (rec.summary) console.log(`   ${rec.summary}\n`);
});

console.log('\n=== TRENDING THIS WEEK ===\n');
recommendations.trending.slice(0, 5).forEach((rec, i) => {
  console.log(`${i + 1}. ${rec.title}`);
  console.log(`   ${rec.url}`);
  if (rec.summary) console.log(`   ${rec.summary}\n`);
});
```

## Best Practices

1. **Use Neural Search for Concepts:** Set `type: 'neural'` when searching by meaning/concept rather than exact keywords

2. **Category Filtering:** Use `category` parameter to narrow results (research paper, github, news, company, etc.)

3. **Autoprompt:** Enable `use_autoprompt: true` to let Exa optimize your query for better results

4. **Exclude Source Domain:** When finding similar content, set `exclude_source_domain: true` to avoid the original source

5. **Date Filtering:** Use `start_published_date` and `end_published_date` for time-sensitive searches

6. **Domain Control:**
   - Use `include_domains` to search only trusted sources
   - Use `exclude_domains` to filter out low-quality content

7. **Content Extraction:**
   - Use `highlights` with specific query for targeted extraction
   - Use `summary` with a question for AI-generated summaries
   - Set `num_sentences` to control highlight length

8. **Scoring:** Results include a `score` (0-1) indicating relevance - filter by score threshold for quality

## Troubleshooting

**API Key Issues:**
```bash
# Test API key
curl -s https://api.exa.ai/search \
  -H "x-api-key: ${EXA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","num_results":1}' | jq .
```

**Low Quality Results:**
- Enable `use_autoprompt: true` for query optimization
- Use more descriptive queries (Exa understands natural language)
- Add category filter to narrow scope
- Use `include_domains` to specify authoritative sources

**Rate Limiting:**
- Free tier: 1000 searches/month
- Implement caching for repeated queries
- Batch content extraction requests

**Empty Results:**
- Try neural search instead of keyword
- Broaden date range or remove date filters
- Remove overly restrictive domain filters
- Rephrase query to be more descriptive

**Content Extraction Fails:**
- Some sites block scraping - check `text` field for null
- Try different URLs from search results
- Use `highlights` instead of full `text` for preview
