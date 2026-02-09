---
name: perplexity
version: 1.0.0
description: Perplexity AI sonar API for AI-powered search with citations and real-time information
author: Code Buddy
tags: search, ai, perplexity, citations, real-time, llm, research, sonar
env:
  PERPLEXITY_API_KEY: ""
---

# Perplexity AI

Perplexity AI provides an AI-powered search API (Sonar) that combines large language models with real-time web search to deliver accurate, cited answers. Unlike traditional search engines that return links, Perplexity synthesizes information and provides inline citations.

## Direct Control (CLI / API / Scripting)

### API Authentication

Perplexity uses OpenAI-compatible API with bearer token authentication. Get your API key at https://www.perplexity.ai/settings/api

### Sonar Search Models

- **sonar** - Fast, balanced model for general queries
- **sonar-pro** - Advanced reasoning with deeper analysis
- **sonar-reasoning** - Chain-of-thought reasoning for complex queries

### Basic Search Query

**cURL Example:**
```bash
curl -s https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer ${PERPLEXITY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar",
    "messages": [
      {
        "role": "user",
        "content": "What are the latest developments in quantum computing as of 2026?"
      }
    ],
    "temperature": 0.2,
    "max_tokens": 1024,
    "return_citations": true,
    "return_images": false
  }' | jq .
```

**Node.js Example:**
```javascript
import fetch from 'node-fetch';

async function perplexitySearch(query, options = {}) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'sonar',
      messages: [
        {
          role: 'system',
          content: options.systemPrompt || 'Be precise and concise. Provide sources for claims.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      temperature: options.temperature || 0.2,
      max_tokens: options.maxTokens || 1024,
      return_citations: options.returnCitations !== false,
      return_images: options.returnImages || false,
      search_recency_filter: options.recencyFilter || 'month' // hour, day, week, month, year
    })
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Usage
const result = await perplexitySearch('Explain the latest TypeScript 5.6 features', {
  model: 'sonar',
  recencyFilter: 'month',
  returnCitations: true
});

console.log('Answer:', result.choices[0].message.content);
console.log('\nCitations:', result.citations);
```

**Python Example:**
```python
import requests
import os

def perplexity_search(query, model='sonar', recency_filter='month', return_citations=True):
    """
    Query Perplexity AI with search augmentation
    recency_filter: 'hour', 'day', 'week', 'month', 'year'
    """
    response = requests.post(
        'https://api.perplexity.ai/chat/completions',
        headers={
            'Authorization': f'Bearer {os.environ["PERPLEXITY_API_KEY"]}',
            'Content-Type': 'application/json'
        },
        json={
            'model': model,
            'messages': [
                {
                    'role': 'user',
                    'content': query
                }
            ],
            'temperature': 0.2,
            'max_tokens': 1024,
            'return_citations': return_citations,
            'return_images': False,
            'search_recency_filter': recency_filter
        }
    )

    response.raise_for_status()
    return response.json()

# Usage
result = perplexity_search(
    'What are the main differences between Rust and Go for systems programming?',
    model='sonar',
    recency_filter='month'
)

print(result['choices'][0]['message']['content'])
print('\nSources:')
for i, citation in enumerate(result.get('citations', []), 1):
    print(f"{i}. {citation}")
```

### Multi-Turn Conversations

```javascript
async function perplexityConversation(messages, options = {}) {
  const formattedMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'sonar',
      messages: formattedMessages,
      temperature: 0.3,
      max_tokens: 2048,
      return_citations: true,
      search_recency_filter: 'week'
    })
  });

  return await response.json();
}

// Usage - Build context across queries
const conversation = [
  { role: 'user', content: 'What is WebAssembly?' },
  { role: 'assistant', content: 'WebAssembly (Wasm) is a binary instruction format...' },
  { role: 'user', content: 'What languages can compile to it?' }
];

const result = await perplexityConversation(conversation);
console.log(result.choices[0].message.content);
```

### Streaming Responses

```javascript
async function perplexityStreamingSearch(query) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: query }],
      temperature: 0.2,
      max_tokens: 1024,
      stream: true,
      return_citations: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const data = JSON.parse(line.slice(6));
        const content = data.choices[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
        }
      }
    }
  }
  console.log('\n');
}

// Usage
await perplexityStreamingSearch('Summarize the latest AI safety research papers from 2026');
```

### Advanced Search with Domain Filtering

```python
def perplexity_domain_search(query, domains=None, exclude_domains=None):
    """
    Search with domain filtering
    domains: list of domains to include (e.g., ['github.com', 'stackoverflow.com'])
    exclude_domains: list of domains to exclude
    """
    # Add domain filters to query
    domain_query = query
    if domains:
        domain_query += ' ' + ' OR '.join([f'site:{d}' for d in domains])
    if exclude_domains:
        domain_query += ' ' + ' '.join([f'-site:{d}' for d in exclude_domains])

    return perplexity_search(domain_query, model='sonar-pro')

# Search only official documentation
result = perplexity_domain_search(
    'React Server Components tutorial',
    domains=['react.dev', 'nextjs.org'],
    exclude_domains=['medium.com']
)

print(result['choices'][0]['message']['content'])
```

### Fact-Checking with Citations

```javascript
async function factCheckWithPerplexity(claim) {
  const query = `Fact check this claim with recent sources: "${claim}". Provide evidence for or against, with citations.`;

  const result = await perplexitySearch(query, {
    model: 'sonar-pro',
    recencyFilter: 'month',
    returnCitations: true,
    systemPrompt: 'You are a fact-checker. Analyze claims objectively using recent, credible sources. Clearly state if a claim is true, false, or unverifiable.'
  });

  const answer = result.choices[0].message.content;
  const citations = result.citations || [];

  return {
    claim,
    verdict: answer,
    sources: citations,
    timestamp: new Date().toISOString()
  };
}

// Usage
const check = await factCheckWithPerplexity(
  'GPT-5 was released in January 2026'
);

console.log('Claim:', check.claim);
console.log('Verdict:', check.verdict);
console.log('\nSources:');
check.sources.forEach((source, i) => {
  console.log(`${i + 1}. ${source}`);
});
```

### Research Synthesis

```python
import json

def research_topic(topic, num_queries=3):
    """
    Multi-angle research with progressive refinement
    """
    queries = [
        f"What is {topic}? Provide a comprehensive overview.",
        f"What are the latest developments in {topic} as of 2026?",
        f"What are the main challenges and future directions for {topic}?"
    ]

    results = []
    all_citations = set()

    for query in queries[:num_queries]:
        result = perplexity_search(query, model='sonar-pro', recency_filter='month')
        content = result['choices'][0]['message']['content']
        citations = result.get('citations', [])

        results.append({
            'query': query,
            'answer': content,
            'citations': citations
        })

        all_citations.update(citations)

    # Synthesize findings
    synthesis_query = f"Based on recent information, provide a synthesis of: {topic}. Include key points, recent developments, and future outlook."
    synthesis = perplexity_search(synthesis_query, model='sonar-reasoning')

    return {
        'topic': topic,
        'detailed_research': results,
        'synthesis': synthesis['choices'][0]['message']['content'],
        'all_sources': list(all_citations),
        'source_count': len(all_citations)
    }

# Usage
research = research_topic('neuromorphic computing')
print(json.dumps(research, indent=2))
```

## MCP Server Integration

Add to `.codebuddy/mcp.json`:

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "node",
      "args": [
        "/path/to/perplexity-mcp-server/index.js"
      ],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      }
    }
  }
}
```

Alternative using ppl-ai/modelcontextprotocol:

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": [
        "-y",
        "@ppl-ai/mcp-server-perplexity"
      ],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      }
    }
  }
}
```

### Available MCP Tools

1. **perplexity_search**
   - AI-powered search with real-time information
   - Parameters: `query` (string), `model` (string), `recency_filter` (string)
   - Returns: Synthesized answer with inline citations

2. **perplexity_chat**
   - Multi-turn conversation with search augmentation
   - Parameters: `messages` (array), `model` (string)
   - Returns: Contextual response with sources

3. **perplexity_fact_check**
   - Verify claims with recent sources
   - Parameters: `claim` (string), `recency` (string)
   - Returns: Fact-check verdict with evidence

Example MCP usage:
```
Ask Code Buddy: "Use perplexity_search to explain quantum error correction with recent sources"
Ask Code Buddy: "Fact check this claim using perplexity_fact_check: AGI was achieved in 2025"
```

## Common Workflows

### 1. Research Paper Summary with Citations

**Goal:** Get comprehensive summary of a research topic with verifiable sources

```javascript
async function researchPaperSummary(topic, year = '2026') {
  // Step 1: Get overview with recent filter
  const overview = await perplexitySearch(
    `Summarize the key research papers on ${topic} published in ${year}`,
    {
      model: 'sonar-pro',
      recencyFilter: 'month',
      returnCitations: true,
      systemPrompt: 'Focus on peer-reviewed research. Include paper titles, authors, and key findings.'
    }
  );

  const summary = overview.choices[0].message.content;
  const citations = overview.citations || [];

  // Step 2: Extract methodology insights
  const methods = await perplexitySearch(
    `What methodologies are used in recent ${topic} research?`,
    {
      model: 'sonar',
      recencyFilter: 'month'
    }
  );

  // Step 3: Identify future directions
  const future = await perplexitySearch(
    `What are the open problems and future research directions in ${topic}?`,
    {
      model: 'sonar-reasoning',
      recencyFilter: 'week'
    }
  );

  // Step 4: Compile research report
  return {
    topic,
    summary,
    methodologies: methods.choices[0].message.content,
    futureDirections: future.choices[0].message.content,
    sources: citations,
    generatedAt: new Date().toISOString()
  };
}

// Usage
const report = await researchPaperSummary('federated learning privacy');
console.log(JSON.stringify(report, null, 2));
```

### 2. Real-Time News Monitoring

**Goal:** Track breaking news and developments on specific topics

```python
import time
from datetime import datetime

def monitor_topic_news(topic, check_interval=1800):
    """
    Monitor topic for new developments every 30 minutes
    """
    previous_summary = None

    while True:
        query = f"What are the latest news and developments about {topic} in the past hour?"

        result = perplexity_search(
            query,
            model='sonar',
            recency_filter='hour'
        )

        current_summary = result['choices'][0]['message']['content']

        # Detect if there's new information
        if current_summary != previous_summary:
            print(f"\n[{datetime.now()}] UPDATE on {topic}:")
            print(current_summary)
            print("\nSources:")
            for citation in result.get('citations', []):
                print(f"  - {citation}")

            previous_summary = current_summary
        else:
            print(f"[{datetime.now()}] No new updates")

        time.sleep(check_interval)

# Monitor AI regulation news
monitor_topic_news('AI regulation United States', check_interval=1800)
```

### 3. Comparative Analysis

**Goal:** Compare multiple topics or approaches with AI-synthesized insights

```javascript
async function compareTopics(topicA, topicB, aspect) {
  // Step 1: Get individual summaries
  const [resultA, resultB] = await Promise.all([
    perplexitySearch(
      `Explain ${topicA} focusing on ${aspect}`,
      { model: 'sonar-pro', recencyFilter: 'month' }
    ),
    perplexitySearch(
      `Explain ${topicB} focusing on ${aspect}`,
      { model: 'sonar-pro', recencyFilter: 'month' }
    )
  ]);

  // Step 2: Direct comparison
  const comparison = await perplexitySearch(
    `Compare and contrast ${topicA} vs ${topicB} in terms of ${aspect}. Provide a balanced analysis with pros and cons of each.`,
    {
      model: 'sonar-reasoning',
      recencyFilter: 'month',
      returnCitations: true
    }
  );

  // Step 3: Get expert recommendations
  const recommendation = await perplexitySearch(
    `When should someone choose ${topicA} over ${topicB} for ${aspect}?`,
    { model: 'sonar-pro' }
  );

  return {
    topicA: {
      description: resultA.choices[0].message.content,
      sources: resultA.citations
    },
    topicB: {
      description: resultB.choices[0].message.content,
      sources: resultB.citations
    },
    comparison: comparison.choices[0].message.content,
    recommendation: recommendation.choices[0].message.content,
    allSources: [
      ...resultA.citations || [],
      ...resultB.citations || [],
      ...comparison.citations || []
    ]
  };
}

// Usage
const analysis = await compareTopics(
  'PostgreSQL',
  'MongoDB',
  'performance and scalability for high-traffic applications'
);

console.log('=== COMPARISON ANALYSIS ===\n');
console.log('Topic A:', analysis.topicA.description);
console.log('\nTopic B:', analysis.topicB.description);
console.log('\nDirect Comparison:', analysis.comparison);
console.log('\nRecommendation:', analysis.recommendation);
```

### 4. Technical Documentation Explorer

**Goal:** Find and synthesize information from official documentation

```python
def explore_documentation(technology, question):
    """
    Query official docs and synthesize answers
    """
    # Step 1: Identify official documentation domains
    domains_query = f"What are the official documentation sites for {technology}?"
    domains_result = perplexity_search(domains_query, model='sonar')

    # Step 2: Search within documentation context
    doc_query = f"According to the official {technology} documentation: {question}"
    doc_result = perplexity_search(
        doc_query,
        model='sonar-pro',
        recency_filter='month'
    )

    # Step 3: Get practical examples
    examples_query = f"Provide code examples for {question} in {technology}"
    examples_result = perplexity_search(examples_query, model='sonar')

    # Step 4: Find common pitfalls
    pitfalls_query = f"What are common mistakes or pitfalls when {question} in {technology}?"
    pitfalls_result = perplexity_search(pitfalls_query, model='sonar')

    return {
        'technology': technology,
        'question': question,
        'official_answer': doc_result['choices'][0]['message']['content'],
        'examples': examples_result['choices'][0]['message']['content'],
        'pitfalls': pitfalls_result['choices'][0]['message']['content'],
        'sources': doc_result.get('citations', [])
    }

# Usage
guide = explore_documentation(
    'Kubernetes',
    'How do I configure horizontal pod autoscaling?'
)

print(f"Question: {guide['question']}")
print(f"\nOfficial Answer:\n{guide['official_answer']}")
print(f"\nExamples:\n{guide['examples']}")
print(f"\nCommon Pitfalls:\n{guide['pitfalls']}")
```

### 5. Market Research and Trend Analysis

**Goal:** Analyze market trends and competitive landscape with recent data

```javascript
async function marketResearch(industry, company, timeframe = 'month') {
  // Step 1: Industry overview
  const industryOverview = await perplexitySearch(
    `Provide an overview of the ${industry} industry in 2026, including market size, growth rate, and key trends`,
    {
      model: 'sonar-pro',
      recencyFilter: timeframe,
      returnCitations: true
    }
  );

  // Step 2: Competitive analysis
  const competitive = await perplexitySearch(
    `Who are the main competitors of ${company} in the ${industry} space? Compare their market positions.`,
    {
      model: 'sonar-pro',
      recencyFilter: timeframe
    }
  );

  // Step 3: Recent developments
  const developments = await perplexitySearch(
    `What are the latest developments, product launches, or strategic moves by ${company} and its competitors?`,
    {
      model: 'sonar',
      recencyFilter: 'week',
      returnCitations: true
    }
  );

  // Step 4: Future outlook
  const outlook = await perplexitySearch(
    `What is the future outlook for ${company} in the ${industry} market? What are the key opportunities and threats?`,
    {
      model: 'sonar-reasoning',
      recencyFilter: timeframe
    }
  );

  // Step 5: Compile all sources
  const allCitations = new Set([
    ...industryOverview.citations || [],
    ...developments.citations || []
  ]);

  return {
    industry,
    company,
    industryAnalysis: industryOverview.choices[0].message.content,
    competitivePosition: competitive.choices[0].message.content,
    recentDevelopments: developments.choices[0].message.content,
    futureOutlook: outlook.choices[0].message.content,
    sources: Array.from(allCitations),
    reportDate: new Date().toISOString()
  };
}

// Usage
const research = await marketResearch('cloud computing', 'AWS');
console.log(JSON.stringify(research, null, 2));

// Save to file for further analysis
const fs = require('fs');
fs.writeFileSync(
  `market-research-${Date.now()}.json`,
  JSON.stringify(research, null, 2)
);
```

## Best Practices

1. **Use Appropriate Models:**
   - `sonar` - Fast queries, general information
   - `sonar-pro` - Complex research, deeper analysis
   - `sonar-reasoning` - Multi-step reasoning, comparisons

2. **Set Recency Filters:** Always specify `search_recency_filter` for time-sensitive queries

3. **Request Citations:** Enable `return_citations: true` for verifiable information

4. **System Prompts:** Use system prompts to guide response style and focus

5. **Temperature Settings:**
   - 0.0-0.3: Factual, deterministic responses
   - 0.4-0.7: Balanced creativity and accuracy
   - 0.8-1.0: Creative, varied responses

6. **Cost Management:**
   - Sonar models are billed per token (input + output)
   - Use shorter queries when possible
   - Cache results for repeated queries

7. **Citation Validation:** Always verify critical information from citations

## Troubleshooting

**Invalid API Key:**
```bash
# Test API connectivity
curl -s https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer ${PERPLEXITY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"sonar","messages":[{"role":"user","content":"test"}]}'
```

**No Citations Returned:**
- Ensure `return_citations: true` is set
- Some queries may not have relevant web sources
- Try more specific queries or adjust recency filter

**Rate Limiting:**
- Implement exponential backoff
- Cache responses when possible
- Use batch processing for multiple queries

**Inconsistent Results:**
- Lower temperature for more deterministic output
- Use sonar-pro for better consistency
- Provide more context in system prompts
