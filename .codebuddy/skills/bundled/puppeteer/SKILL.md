---
name: puppeteer
version: 1.0.0
description: Chrome/Chromium automation for headless browsing, web scraping, PDF generation, and screenshots
author: Code Buddy
tags: chrome, automation, scraping, headless, pdf, screenshots, debugging
env:
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: ""
  PUPPETEER_EXECUTABLE_PATH: ""
  PUPPETEER_CACHE_DIR: ""
---

# Puppeteer Chrome Automation

Puppeteer is a Node.js library that provides a high-level API to control Chrome or Chromium over the DevTools Protocol. It's excellent for web scraping, automated testing, screenshot capture, PDF generation, and debugging web applications.

## Direct Control (CLI / API / Scripting)

### Installation

```bash
# Install Puppeteer (includes Chromium)
npm install puppeteer

# Install puppeteer-core (no Chromium download)
npm install puppeteer-core

# Use system Chrome
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer-core

# Install with specific Chrome version
PUPPETEER_CHROMIUM_REVISION=1095492 npm install puppeteer
```

### Node.js API Examples

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs').promises;

// Basic page scraping
async function scrapePage(url) {
  const browser = await puppeteer.launch({
    headless: 'new', // Use new headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Extract data
  const data = await page.evaluate(() => {
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
        level: h.tagName,
        text: h.textContent.trim()
      })),
      links: Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent.trim(),
        href: a.href
      }))
    };
  });

  await browser.close();
  return data;
}

// Advanced scraping with infinite scroll
async function scrapeInfiniteScroll(url, scrollLimit = 10) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  let previousHeight;
  let scrollCount = 0;

  while (scrollCount < scrollLimit) {
    previousHeight = await page.evaluate('document.body.scrollHeight');

    // Scroll to bottom
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForTimeout(2000);

    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === previousHeight) break;
    scrollCount++;
  }

  // Extract all items
  const items = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.item')).map(item => ({
      title: item.querySelector('.title')?.textContent,
      image: item.querySelector('img')?.src,
      price: item.querySelector('.price')?.textContent
    }));
  });

  await browser.close();
  return items;
}

// Form automation with validation
async function fillAndSubmitForm(url, formData) {
  const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();
  await page.goto(url);

  // Wait for form to be ready
  await page.waitForSelector('form');

  // Fill text inputs
  await page.type('#name', formData.name, { delay: 100 });
  await page.type('#email', formData.email);
  await page.type('#phone', formData.phone);

  // Select dropdown
  await page.select('#country', formData.country);

  // Radio buttons
  await page.click(`input[name="gender"][value="${formData.gender}"]`);

  // Checkboxes
  if (formData.newsletter) {
    await page.click('#newsletter');
  }

  // File upload
  if (formData.resume) {
    const fileInput = await page.$('#resume');
    await fileInput.uploadFile(formData.resume);
  }

  // Submit and wait for response
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]')
  ]);

  // Check for validation errors
  const errors = await page.$$eval('.error', els => els.map(e => e.textContent));
  const success = await page.$('.success-message');

  await browser.close();
  return { success: !!success, errors };
}

// Screenshot with full page and element capture
async function captureScreenshots(url, outputDir) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set viewport for consistent screenshots
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Full page screenshot
  await page.screenshot({
    path: `${outputDir}/full-page.png`,
    fullPage: true
  });

  // Viewport screenshot
  await page.screenshot({
    path: `${outputDir}/viewport.png`
  });

  // Element screenshot
  const element = await page.$('.hero-section');
  if (element) {
    await element.screenshot({
      path: `${outputDir}/hero.png`
    });
  }

  // Screenshot with different device emulation
  await page.emulate(puppeteer.KnownDevices['iPhone 13 Pro']);
  await page.screenshot({
    path: `${outputDir}/mobile.png`,
    fullPage: true
  });

  await browser.close();
}

// PDF generation with custom options
async function generatePDF(url, outputPath, options = {}) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Remove unwanted elements before PDF
  await page.evaluate(() => {
    document.querySelectorAll('.no-print, .advertisement').forEach(el => el.remove());
  });

  await page.pdf({
    path: outputPath,
    format: options.format || 'A4',
    printBackground: true,
    margin: {
      top: options.marginTop || '1cm',
      right: options.marginRight || '1cm',
      bottom: options.marginBottom || '1cm',
      left: options.marginLeft || '1cm'
    },
    displayHeaderFooter: options.headerFooter || false,
    headerTemplate: options.header || '',
    footerTemplate: options.footer || '<div style="font-size:10px;text-align:center;width:100%;"><span class="pageNumber"></span></div>'
  });

  await browser.close();
}

// Performance monitoring and metrics
async function measurePerformance(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Enable performance metrics
  await page.setCacheEnabled(false);

  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const loadTime = Date.now() - startTime;

  // Get performance metrics
  const metrics = await page.metrics();
  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );

  // Get resource timings
  const resourceTimings = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map(r => ({
      name: r.name,
      duration: r.duration,
      size: r.transferSize
    }));
  });

  // Get Core Web Vitals
  const vitals = await page.evaluate(() => {
    return new Promise(resolve => {
      const vitals = {};
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            vitals.FCP = entry.startTime;
          }
        }
      }).observe({ entryTypes: ['paint'] });

      setTimeout(() => resolve(vitals), 3000);
    });
  });

  await browser.close();

  return {
    loadTime,
    metrics,
    performanceTiming,
    resourceTimings,
    vitals
  };
}

// Request interception and modification
async function interceptRequests(url, rules) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on('request', request => {
    const url = request.url();
    const resourceType = request.resourceType();

    // Block certain resources
    if (rules.blockTypes?.includes(resourceType)) {
      request.abort();
      return;
    }

    // Block specific domains
    if (rules.blockDomains?.some(domain => url.includes(domain))) {
      request.abort();
      return;
    }

    // Modify headers
    if (rules.modifyHeaders) {
      request.continue({
        headers: { ...request.headers(), ...rules.modifyHeaders }
      });
      return;
    }

    request.continue();
  });

  // Collect responses
  const responses = [];
  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      headers: response.headers()
    });
  });

  await page.goto(url);
  await page.waitForTimeout(3000);

  await browser.close();
  return responses;
}

// Authentication and session management
async function authenticateAndScrape(loginUrl, targetUrl, credentials) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Login
  await page.goto(loginUrl);
  await page.type('#username', credentials.username);
  await page.type('#password', credentials.password);
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]')
  ]);

  // Save cookies
  const cookies = await page.cookies();
  await fs.writeFile('cookies.json', JSON.stringify(cookies));

  // Navigate to target page with auth
  await page.goto(targetUrl);
  const data = await page.evaluate(() => document.body.textContent);

  await browser.close();
  return data;
}

// Reuse saved session
async function reuseSession(url, cookiesPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Load saved cookies
  const cookiesString = await fs.readFile(cookiesPath);
  const cookies = JSON.parse(cookiesString);
  await page.setCookie(...cookies);

  await page.goto(url);
  const isAuthenticated = await page.$('.user-profile');

  await browser.close();
  return isAuthenticated;
}

// Browser debugging and Chrome DevTools
async function debugPage(url) {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true, // Open DevTools automatically
    slowMo: 100     // Slow down by 100ms
  });

  const page = await browser.newPage();

  // Listen to console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Listen to errors
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  // Listen to request failures
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  await page.goto(url);

  // Keep browser open for debugging
  await new Promise(() => {});
}
```

### Python API (Pyppeteer) Examples

```python
import asyncio
from pyppeteer import launch

async def scrape_page(url):
    browser = await launch(headless=True)
    page = await browser.newPage()
    await page.goto(url)

    title = await page.title()
    content = await page.evaluate('() => document.body.textContent')

    await browser.close()
    return {'title': title, 'content': content}

async def take_screenshot(url, output):
    browser = await launch()
    page = await browser.newPage()
    await page.setViewport({'width': 1920, 'height': 1080})
    await page.goto(url)
    await page.screenshot({'path': output, 'fullPage': True})
    await browser.close()

# Run async function
asyncio.run(scrape_page('https://example.com'))
```

### CLI Usage

```bash
# Launch Puppeteer with specific Chrome
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome node script.js

# Set custom cache directory
PUPPETEER_CACHE_DIR=~/.cache/puppeteer npm install puppeteer

# Use system Chrome (skip download)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer-core

# Debug script with verbose logging
DEBUG=puppeteer:* node script.js
```

## MCP Server Integration

Add to `.codebuddy/mcp.json`:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "@nicholasoxford/puppeteer-mcp"
      ],
      "env": {
        "PUPPETEER_EXECUTABLE_PATH": "/usr/bin/google-chrome"
      }
    }
  }
}
```

Or use Anthropic's official server:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropics/puppeteer-mcp"
      ]
    }
  }
}
```

### Available MCP Tools

**From @nicholasoxford/puppeteer-mcp:**
- `puppeteer_navigate` - Navigate to URL
- `puppeteer_screenshot` - Capture screenshot (full page or element)
- `puppeteer_click` - Click element by selector
- `puppeteer_fill` - Fill input field
- `puppeteer_select` - Select dropdown option
- `puppeteer_evaluate` - Execute JavaScript in page
- `puppeteer_pdf` - Generate PDF from page

**From @anthropics/puppeteer-mcp:**
- `puppeteer_launch` - Launch browser instance
- `puppeteer_goto` - Navigate to URL with options
- `puppeteer_click_element` - Click with wait and retry
- `puppeteer_type_text` - Type text with delay
- `puppeteer_get_content` - Extract page content
- `puppeteer_screenshot_full` - Full page screenshot
- `puppeteer_close_browser` - Close browser instance

## Common Workflows

### 1. E-Commerce Price Monitoring

```javascript
// Step 1: Launch browser and navigate to product page
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.goto('https://shop.example.com/product/12345');

// Step 2: Wait for price element to load
await page.waitForSelector('.product-price', { timeout: 10000 });

// Step 3: Extract product details
const productData = await page.evaluate(() => {
  return {
    name: document.querySelector('.product-title')?.textContent.trim(),
    price: document.querySelector('.product-price')?.textContent.trim(),
    availability: document.querySelector('.stock-status')?.textContent.trim(),
    rating: document.querySelector('.rating')?.textContent.trim(),
    reviews: document.querySelector('.review-count')?.textContent.trim()
  };
});

// Step 4: Take screenshot for record
await page.screenshot({ path: `price-${Date.now()}.png` });

// Step 5: Store data and alert if price changed
await fs.writeFile('price-history.json', JSON.stringify({
  timestamp: new Date(),
  ...productData
}));
await browser.close();
```

### 2. Automated Testing: Multi-Page Flow

```javascript
// Step 1: Setup browser and login
const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://app.example.com/login');
await page.type('#email', 'test@example.com');
await page.type('#password', 'TestPass123');
await page.click('button[type="submit"]');
await page.waitForNavigation();

// Step 2: Navigate through application
await page.click('a[href="/dashboard"]');
await page.waitForSelector('.dashboard-content');

// Step 3: Verify dashboard elements
const dashboardStats = await page.$$eval('.stat-card', cards => {
  return cards.map(card => ({
    label: card.querySelector('.stat-label')?.textContent,
    value: card.querySelector('.stat-value')?.textContent
  }));
});
console.log('Dashboard stats:', dashboardStats);

// Step 4: Test form submission
await page.click('button.new-item');
await page.waitForSelector('form.item-form');
await page.type('#item-name', 'Test Item');
await page.type('#item-description', 'This is a test');
await page.click('button.submit-item');

// Step 5: Verify success and cleanup
await page.waitForSelector('.success-notification');
const successMessage = await page.$eval('.success-notification', el => el.textContent);
console.log('Success:', successMessage);
await browser.close();
```

### 3. Data Extraction: Table Scraping

```javascript
// Step 1: Navigate to page with data table
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com/data-table');

// Step 2: Wait for table to load
await page.waitForSelector('table.data-table');

// Step 3: Extract all table data
const tableData = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('table.data-table tbody tr'));
  return rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    return {
      id: cells[0]?.textContent.trim(),
      name: cells[1]?.textContent.trim(),
      value: cells[2]?.textContent.trim(),
      status: cells[3]?.textContent.trim(),
      date: cells[4]?.textContent.trim()
    };
  });
});

// Step 4: Handle pagination
let allData = [...tableData];
let hasNextPage = await page.$('button.next-page:not([disabled])');
while (hasNextPage) {
  await page.click('button.next-page');
  await page.waitForTimeout(1000);
  const pageData = await page.evaluate(/* same as step 3 */);
  allData = [...allData, ...pageData];
  hasNextPage = await page.$('button.next-page:not([disabled])');
}

// Step 5: Export data
await fs.writeFile('table-data.json', JSON.stringify(allData, null, 2));
await browser.close();
```

### 4. Report Generation: Automated PDFs

```javascript
// Step 1: Navigate to report page
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://analytics.example.com/report?id=123');

// Step 2: Wait for all charts to render
await page.waitForSelector('.chart-container canvas');
await page.waitForTimeout(2000); // Extra wait for animations

// Step 3: Hide unwanted elements
await page.addStyleTag({
  content: '.no-print { display: none !important; }'
});

// Step 4: Generate PDF with custom styling
await page.pdf({
  path: 'report.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  displayHeaderFooter: true,
  headerTemplate: `
    <div style="font-size:10px;width:100%;text-align:center;">
      <span>Monthly Analytics Report</span>
    </div>
  `,
  footerTemplate: `
    <div style="font-size:10px;width:100%;text-align:center;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  `
});

// Step 5: Cleanup
await browser.close();
console.log('PDF generated: report.pdf');
```

### 5. API Testing via Browser

```javascript
// Step 1: Setup request interception
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setRequestInterception(true);

const apiCalls = [];
page.on('request', request => {
  if (request.url().includes('/api/')) {
    apiCalls.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData()
    });
  }
  request.continue();
});

const apiResponses = [];
page.on('response', async response => {
  if (response.url().includes('/api/')) {
    apiResponses.push({
      url: response.url(),
      status: response.status(),
      headers: response.headers(),
      body: await response.text().catch(() => null)
    });
  }
});

// Step 2: Trigger API calls through UI
await page.goto('https://app.example.com');
await page.click('button.load-data');
await page.waitForTimeout(3000);

// Step 3: Verify API responses
const errors = apiResponses.filter(r => r.status >= 400);
console.log(`Total API calls: ${apiCalls.length}`);
console.log(`Failed requests: ${errors.length}`);

// Step 4: Analyze response times
const timings = apiResponses.map(r => ({
  url: r.url,
  time: r.timing?.responseEnd - r.timing?.requestStart
}));

// Step 5: Cleanup and report
await fs.writeFile('api-report.json', JSON.stringify({
  calls: apiCalls,
  responses: apiResponses,
  errors
}, null, 2));
await browser.close();
```
