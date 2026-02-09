---
name: web-fetch
version: 1.0.0
description: HTTP requests, REST API testing, fetch API, axios, curl, webhook testing, and API integration
author: Code Buddy
tags: http, rest, api, fetch, axios, curl, webhooks, testing
env:
  HTTP_PROXY: ""
  HTTPS_PROXY: ""
  NO_PROXY: ""
---

# Web Fetch & HTTP Client

Web Fetch provides powerful tools for making HTTP requests, testing REST APIs, consuming webhooks, and integrating with external services. Includes native fetch API, axios library, curl commands, and specialized testing utilities.

## Direct Control (CLI / API / Scripting)

### Native Fetch API (Node.js 18+)

```javascript
// Basic GET request
async function fetchData(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error.message);
    throw error;
  }
}

// POST request with JSON body
async function createResource(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.API_TOKEN}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create resource: ${error}`);
  }

  return await response.json();
}

// Multipart form data (file upload)
async function uploadFile(url, filePath) {
  const fs = require('fs');
  const FormData = require('form-data');

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('metadata', JSON.stringify({ name: 'test.pdf' }));

  const response = await fetch(url, {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  });

  return await response.json();
}

// Request with timeout
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    clearTimeout(id);
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Streaming response
async function streamResponse(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    process.stdout.write(chunk);
  }
}

// Retry logic with exponential backoff
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();

      // Retry on 5xx errors
      if (response.status >= 500 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### Axios Library

```javascript
const axios = require('axios');

// Basic requests
async function axiosExamples() {
  // GET request
  const response = await axios.get('https://api.example.com/users');
  console.log(response.data);

  // POST with data
  const created = await axios.post('https://api.example.com/users', {
    name: 'John Doe',
    email: 'john@example.com'
  });

  // PUT update
  await axios.put('https://api.example.com/users/123', {
    name: 'Jane Doe'
  });

  // DELETE
  await axios.delete('https://api.example.com/users/123');

  // PATCH partial update
  await axios.patch('https://api.example.com/users/123', {
    email: 'newemail@example.com'
  });
}

// Configure axios instance
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.API_TOKEN}`
  }
});

// Request interceptor (add auth token)
api.interceptors.request.use(
  config => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor (refresh token on 401)
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// File upload with progress
async function uploadWithProgress(url, filePath) {
  const fs = require('fs');
  const FormData = require('form-data');

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const response = await axios.post(url, form, {
    headers: form.getHeaders(),
    onUploadProgress: progressEvent => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`Upload progress: ${percentCompleted}%`);
    }
  });

  return response.data;
}

// Concurrent requests
async function parallelRequests(urls) {
  try {
    const responses = await Promise.all(
      urls.map(url => axios.get(url))
    );
    return responses.map(r => r.data);
  } catch (error) {
    console.error('One or more requests failed:', error.message);
    throw error;
  }
}

// Rate-limited requests
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.queue = [];
    this.pending = 0;
  }

  async request(fn) {
    while (this.pending >= this.maxRequests) {
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.pending++;
    setTimeout(() => {
      this.pending--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }, this.timeWindow);

    return await fn();
  }
}

const limiter = new RateLimiter(5, 1000); // 5 requests per second

async function fetchRateLimited(url) {
  return await limiter.request(() => axios.get(url));
}
```

### cURL Commands

```bash
# Basic GET request
curl https://api.example.com/users

# GET with headers
curl -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     https://api.example.com/users

# POST with JSON data
curl -X POST https://api.example.com/users \
     -H "Content-Type: application/json" \
     -d '{"name":"John Doe","email":"john@example.com"}'

# POST from file
curl -X POST https://api.example.com/users \
     -H "Content-Type: application/json" \
     -d @data.json

# PUT request
curl -X PUT https://api.example.com/users/123 \
     -H "Content-Type: application/json" \
     -d '{"name":"Jane Doe"}'

# DELETE request
curl -X DELETE https://api.example.com/users/123 \
     -H "Authorization: Bearer TOKEN"

# File upload
curl -X POST https://api.example.com/upload \
     -F "file=@document.pdf" \
     -F "metadata=@meta.json;type=application/json"

# Follow redirects
curl -L https://example.com/redirect

# Save response to file
curl -o output.json https://api.example.com/data

# Include response headers
curl -i https://api.example.com/users

# Verbose output (debugging)
curl -v https://api.example.com/users

# Send cookies
curl -b "session=abc123" https://api.example.com/profile

# Save cookies
curl -c cookies.txt https://api.example.com/login

# Use saved cookies
curl -b cookies.txt https://api.example.com/profile

# Basic authentication
curl -u username:password https://api.example.com/secure

# Custom request method
curl -X PATCH https://api.example.com/users/123 \
     -d '{"email":"new@example.com"}'

# Timeout settings
curl --connect-timeout 5 --max-time 10 https://api.example.com

# Proxy
curl -x http://proxy:8080 https://api.example.com

# Ignore SSL certificate
curl -k https://self-signed.example.com

# Multiple requests
curl -Z https://api.example.com/endpoint1 https://api.example.com/endpoint2

# Rate limit (1 request per second)
for url in $(cat urls.txt); do
  curl "$url"
  sleep 1
done
```

### REST API Testing

```javascript
const assert = require('assert');

class APITester {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.results = [];
  }

  async test(name, testFn) {
    try {
      await testFn();
      this.results.push({ name, status: 'PASS' });
      console.log(`✓ ${name}`);
    } catch (error) {
      this.results.push({ name, status: 'FAIL', error: error.message });
      console.error(`✗ ${name}: ${error.message}`);
    }
  }

  async get(path, expectedStatus = 200) {
    const response = await fetch(`${this.baseURL}${path}`);
    assert.strictEqual(response.status, expectedStatus,
      `Expected status ${expectedStatus}, got ${response.status}`);
    return response;
  }

  async post(path, data, expectedStatus = 201) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    assert.strictEqual(response.status, expectedStatus);
    return response;
  }

  assertSchema(data, schema) {
    for (const [key, type] of Object.entries(schema)) {
      assert(key in data, `Missing key: ${key}`);
      assert.strictEqual(typeof data[key], type,
        `Expected ${key} to be ${type}, got ${typeof data[key]}`);
    }
  }

  async report() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    return { passed, failed, results: this.results };
  }
}

// Usage
async function runTests() {
  const tester = new APITester('https://api.example.com');

  await tester.test('GET /users returns 200', async () => {
    const response = await tester.get('/users');
    const data = await response.json();
    assert(Array.isArray(data), 'Response should be an array');
  });

  await tester.test('POST /users creates user', async () => {
    const userData = { name: 'Test User', email: 'test@example.com' };
    const response = await tester.post('/users', userData);
    const created = await response.json();
    tester.assertSchema(created, { id: 'number', name: 'string', email: 'string' });
  });

  await tester.test('GET /users/:id returns user', async () => {
    const response = await tester.get('/users/1');
    const user = await response.json();
    assert(user.id === 1, 'User ID should match');
  });

  await tester.report();
}
```

### Webhook Testing

```javascript
const express = require('express');
const crypto = require('crypto');

// Webhook receiver server
function createWebhookServer(port = 3000) {
  const app = express();
  app.use(express.json());

  const receivedWebhooks = [];

  // Verify HMAC signature
  function verifySignature(payload, signature, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  }

  app.post('/webhook', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);

    // Verify signature if present
    if (signature) {
      const secret = process.env.WEBHOOK_SECRET;
      if (!verifySignature(payload, signature.replace('sha256=', ''), secret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Store webhook
    receivedWebhooks.push({
      timestamp: new Date(),
      headers: req.headers,
      body: req.body
    });

    console.log('Webhook received:', req.body);
    res.status(200).json({ received: true });
  });

  app.get('/webhooks', (req, res) => {
    res.json(receivedWebhooks);
  });

  return app.listen(port, () => {
    console.log(`Webhook server listening on port ${port}`);
  });
}

// Webhook sender/tester
async function sendWebhook(url, data, secret) {
  const payload = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', secret);
  const signature = hmac.update(payload).digest('hex');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': `sha256=${signature}`,
      'X-Webhook-Event': data.event
    },
    body: payload
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

// Test webhook delivery
async function testWebhookDelivery(webhookUrl, testData) {
  const results = [];

  for (const test of testData) {
    try {
      const result = await sendWebhook(webhookUrl, test.payload, test.secret);
      results.push({
        test: test.name,
        success: result.status === 200,
        status: result.status,
        response: result.body
      });
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}
```

### GraphQL Queries

```javascript
async function graphqlQuery(endpoint, query, variables = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GRAPHQL_TOKEN}`
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

// Example queries
const GET_USER = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      posts {
        id
        title
      }
    }
  }
`;

const CREATE_POST = `
  mutation CreatePost($input: PostInput!) {
    createPost(input: $input) {
      id
      title
      content
      author {
        name
      }
    }
  }
`;

// Usage
const user = await graphqlQuery('https://api.example.com/graphql', GET_USER, {
  id: '123'
});

const post = await graphqlQuery('https://api.example.com/graphql', CREATE_POST, {
  input: {
    title: 'New Post',
    content: 'Content here',
    authorId: '123'
  }
});
```

## MCP Server Integration

Add to `.codebuddy/mcp.json`:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch"
      ]
    }
  }
}
```

Or with custom configuration:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "node",
      "args": [
        "/path/to/fetch-mcp-server/index.js"
      ],
      "env": {
        "HTTP_TIMEOUT": "30000",
        "MAX_REDIRECTS": "5",
        "USER_AGENT": "Code-Buddy-MCP/1.0"
      }
    }
  }
}
```

### Available MCP Tools

**From @modelcontextprotocol/server-fetch:**
- `fetch` - Make HTTP request with full control
- `get` - Simple GET request
- `post` - POST request with JSON body
- `put` - PUT request for updates
- `delete` - DELETE request
- `head` - HEAD request (headers only)
- `options` - OPTIONS request (CORS preflight)

**Tool Parameters:**
```javascript
{
  "url": "https://api.example.com/endpoint",
  "method": "GET|POST|PUT|DELETE|PATCH",
  "headers": {
    "Authorization": "Bearer TOKEN",
    "Content-Type": "application/json"
  },
  "body": "string or JSON",
  "timeout": 30000,
  "follow_redirects": true,
  "max_redirects": 5
}
```

## Common Workflows

### 1. API Integration: Complete CRUD Operations

```javascript
// Step 1: Setup API client with authentication
const API_BASE = 'https://api.example.com';
const API_KEY = process.env.API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
};

// Step 2: Create new resource
async function createUser(userData) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    throw new Error(`Create failed: ${response.statusText}`);
  }

  return await response.json();
}

// Step 3: Read and verify
async function getUser(userId) {
  const response = await fetch(`${API_BASE}/users/${userId}`, { headers });
  return await response.json();
}

// Step 4: Update resource
async function updateUser(userId, updates) {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  });
  return await response.json();
}

// Step 5: Delete and verify
async function deleteUser(userId) {
  const response = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'DELETE',
    headers
  });
  return response.ok;
}

// Execute workflow
const user = await createUser({ name: 'John', email: 'john@example.com' });
const fetched = await getUser(user.id);
await updateUser(user.id, { email: 'newemail@example.com' });
await deleteUser(user.id);
```

### 2. REST API Testing Suite

```javascript
// Step 1: Define test suite
const tests = [
  {
    name: 'Authentication works',
    run: async () => {
      const response = await fetch('https://api.example.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'test123' })
      });
      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert(data.token, 'Token should be present');
      return data.token;
    }
  },
  {
    name: 'Protected endpoint requires auth',
    run: async () => {
      const response = await fetch('https://api.example.com/protected');
      assert.strictEqual(response.status, 401);
    }
  },
  {
    name: 'Pagination works correctly',
    run: async () => {
      const response = await fetch('https://api.example.com/users?page=1&limit=10');
      const data = await response.json();
      assert(data.items.length <= 10, 'Should respect limit');
      assert(data.pagination, 'Should include pagination info');
    }
  }
];

// Step 2: Run all tests
let passed = 0;
let failed = 0;
const results = [];

for (const test of tests) {
  try {
    await test.run();
    console.log(`✓ ${test.name}`);
    passed++;
    results.push({ name: test.name, status: 'PASS' });
  } catch (error) {
    console.error(`✗ ${test.name}: ${error.message}`);
    failed++;
    results.push({ name: test.name, status: 'FAIL', error: error.message });
  }
}

// Step 3: Generate test report
const report = {
  timestamp: new Date(),
  summary: { passed, failed, total: tests.length },
  results
};

// Step 4: Save results
await fs.writeFile('test-results.json', JSON.stringify(report, null, 2));

// Step 5: Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
```

### 3. Webhook Listener and Processor

```javascript
// Step 1: Create webhook server
const express = require('express');
const app = express();
app.use(express.json());

const webhookQueue = [];

// Step 2: Setup webhook endpoint with validation
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  // Verify signature
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(req.body)).digest('hex');

  if (signature !== digest) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Queue webhook for processing
  webhookQueue.push({
    id: crypto.randomUUID(),
    timestamp: new Date(),
    event: req.headers['x-webhook-event'],
    data: req.body
  });

  res.status(200).json({ received: true });
});

// Step 3: Process webhooks asynchronously
async function processWebhooks() {
  while (true) {
    if (webhookQueue.length > 0) {
      const webhook = webhookQueue.shift();
      try {
        await handleWebhook(webhook);
        console.log(`Processed webhook ${webhook.id}`);
      } catch (error) {
        console.error(`Failed to process webhook ${webhook.id}:`, error);
        // Retry logic here
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Step 4: Handle different webhook types
async function handleWebhook(webhook) {
  switch (webhook.event) {
    case 'user.created':
      await onUserCreated(webhook.data);
      break;
    case 'order.completed':
      await onOrderCompleted(webhook.data);
      break;
    default:
      console.log(`Unknown event: ${webhook.event}`);
  }
}

// Step 5: Start server and processor
app.listen(3000, () => console.log('Webhook server running on port 3000'));
processWebhooks();
```

### 4. API Performance Monitoring

```javascript
// Step 1: Define monitoring targets
const endpoints = [
  { name: 'Homepage', url: 'https://api.example.com/', method: 'GET' },
  { name: 'Users API', url: 'https://api.example.com/users', method: 'GET' },
  { name: 'Search API', url: 'https://api.example.com/search?q=test', method: 'GET' }
];

// Step 2: Measure response times
async function measureEndpoint(endpoint) {
  const startTime = Date.now();
  try {
    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      signal: AbortSignal.timeout(10000)
    });

    const responseTime = Date.now() - startTime;

    return {
      name: endpoint.name,
      status: response.status,
      responseTime,
      success: response.ok,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      name: endpoint.name,
      error: error.message,
      success: false,
      timestamp: new Date()
    };
  }
}

// Step 3: Run monitoring loop
const results = [];
for (const endpoint of endpoints) {
  const result = await measureEndpoint(endpoint);
  results.push(result);
  console.log(`${result.name}: ${result.responseTime}ms (${result.status})`);
}

// Step 4: Calculate statistics
const stats = {
  avgResponseTime: results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length,
  successRate: (results.filter(r => r.success).length / results.length) * 100,
  slowest: results.sort((a, b) => (b.responseTime || 0) - (a.responseTime || 0))[0]
};

// Step 5: Alert if thresholds exceeded
if (stats.avgResponseTime > 1000) {
  console.warn(`⚠️ Average response time high: ${stats.avgResponseTime}ms`);
}
if (stats.successRate < 95) {
  console.error(`❌ Success rate low: ${stats.successRate}%`);
}

await fs.writeFile('monitoring-results.json', JSON.stringify({ stats, results }, null, 2));
```

### 5. Bulk Data Import via API

```javascript
// Step 1: Load data from CSV
const fs = require('fs').promises;
const csv = require('csv-parser');
const { createReadStream } = require('fs');

async function loadCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath)
      .pipe(csv())
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// Step 2: Batch upload function
async function uploadBatch(records, batchSize = 100) {
  const API_URL = 'https://api.example.com/users/bulk';
  const results = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_KEY}`
        },
        body: JSON.stringify({ records: batch })
      });

      if (response.ok) {
        results.success += batch.length;
        console.log(`Uploaded batch ${i / batchSize + 1}: ${batch.length} records`);
      } else {
        results.failed += batch.length;
        const error = await response.text();
        results.errors.push({ batch: i / batchSize + 1, error });
      }
    } catch (error) {
      results.failed += batch.length;
      results.errors.push({ batch: i / batchSize + 1, error: error.message });
    }

    // Rate limiting: wait between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

// Step 3: Load and validate data
const records = await loadCSV('users.csv');
console.log(`Loaded ${records.length} records`);

// Step 4: Upload in batches
const results = await uploadBatch(records, 100);

// Step 5: Report results
console.log(`\nUpload complete:`);
console.log(`Success: ${results.success}`);
console.log(`Failed: ${results.failed}`);
if (results.errors.length > 0) {
  console.error('Errors:', results.errors);
}

await fs.writeFile('import-results.json', JSON.stringify(results, null, 2));
```
