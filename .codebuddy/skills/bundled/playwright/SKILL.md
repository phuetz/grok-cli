---
name: playwright
version: 1.0.0
description: Browser automation, end-to-end testing, web scraping, form filling, screenshots, and PDF generation
author: Code Buddy
tags: browser, automation, testing, scraping, e2e, screenshots, pdf
env:
  PLAYWRIGHT_BROWSERS_PATH: ""
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: ""
---

# Playwright Browser Automation

Playwright is a powerful browser automation framework that supports Chromium, Firefox, and WebKit. It enables reliable end-to-end testing, web scraping, form automation, screenshot capture, and PDF generation with a modern async API.

## Direct Control (CLI / API / Scripting)

### Installation

```bash
# Install Playwright
npm install -D @playwright/test playwright

# Install browsers (Chromium, Firefox, WebKit)
npx playwright install

# Install specific browser only
npx playwright install chromium

# Install with system dependencies
npx playwright install --with-deps
```

### Node.js API Examples

```javascript
const { chromium, firefox, webkit } = require('playwright');

// Basic page navigation and scraping
async function scrapePage(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Extract data
  const title = await page.title();
  const content = await page.textContent('body');
  const links = await page.$$eval('a', anchors =>
    anchors.map(a => ({ text: a.textContent, href: a.href }))
  );

  await browser.close();
  return { title, content, links };
}

// Form filling and submission
async function fillForm(url, formData) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(url);

  // Fill form fields
  await page.fill('input[name="username"]', formData.username);
  await page.fill('input[name="email"]', formData.email);
  await page.fill('textarea[name="message"]', formData.message);

  // Select dropdown
  await page.selectOption('select[name="country"]', formData.country);

  // Check checkbox
  await page.check('input[type="checkbox"][name="terms"]');

  // Click submit and wait for navigation
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]')
  ]);

  // Verify success
  const successMessage = await page.textContent('.success-message');
  await browser.close();
  return successMessage;
}

// Screenshot capture
async function captureScreenshot(url, outputPath, options = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Full page screenshot
  await page.screenshot({
    path: outputPath,
    fullPage: options.fullPage || false,
    type: options.type || 'png'
  });

  // Element screenshot
  if (options.selector) {
    const element = await page.$(options.selector);
    await element.screenshot({ path: outputPath });
  }

  await browser.close();
}

// PDF generation
async function generatePDF(url, outputPath, options = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForLoadState('networkidle');

  await page.pdf({
    path: outputPath,
    format: options.format || 'A4',
    printBackground: true,
    margin: options.margin || { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
  });

  await browser.close();
}

// Handle authentication
async function loginAndNavigate(loginUrl, targetUrl, credentials) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto(loginUrl);
  await page.fill('#username', credentials.username);
  await page.fill('#password', credentials.password);
  await page.click('button[type="submit"]');

  // Wait for login to complete
  await page.waitForURL(/dashboard|home/);

  // Save authentication state
  await context.storageState({ path: 'auth.json' });

  // Navigate to target with auth
  await page.goto(targetUrl);
  const data = await page.evaluate(() => document.body.innerText);

  await browser.close();
  return data;
}

// Advanced: Intercept network requests
async function interceptRequests(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Block images and stylesheets for faster loading
  await page.route('**/*', route => {
    const type = route.request().resourceType();
    if (type === 'image' || type === 'stylesheet') {
      route.abort();
    } else {
      route.continue();
    }
  });

  // Listen to API responses
  const apiData = [];
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      apiData.push({
        url: response.url(),
        status: response.status(),
        body: await response.json().catch(() => null)
      });
    }
  });

  await page.goto(url);
  await page.waitForTimeout(3000);

  await browser.close();
  return apiData;
}

// Multi-browser testing
async function testAcrossBrowsers(url, testFn) {
  const browsers = [chromium, firefox, webkit];
  const results = {};

  for (const browserType of browsers) {
    const browser = await browserType.launch();
    const page = await browser.newPage();

    try {
      await page.goto(url);
      results[browserType.name()] = await testFn(page);
    } catch (error) {
      results[browserType.name()] = { error: error.message };
    }

    await browser.close();
  }

  return results;
}
```

### Python API Examples

```python
from playwright.sync_api import sync_playwright
import json

# Basic scraping
def scrape_page(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)

        title = page.title()
        content = page.inner_text('body')

        browser.close()
        return {'title': title, 'content': content}

# Form automation
def automate_form(url, form_data):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto(url)

        page.fill('input[name="email"]', form_data['email'])
        page.fill('input[name="password"]', form_data['password'])
        page.click('button[type="submit"]')

        page.wait_for_load_state('networkidle')
        result = page.text_content('.result')

        browser.close()
        return result

# Screenshot with mobile viewport
def mobile_screenshot(url, output):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(
            viewport={'width': 375, 'height': 667},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
        )
        page = context.new_page()
        page.goto(url)
        page.screenshot(path=output, full_page=True)
        browser.close()
```

### CLI Commands

```bash
# Run Playwright tests
npx playwright test

# Run specific test file
npx playwright test tests/login.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=firefox

# Debug tests with Playwright Inspector
npx playwright test --debug

# Generate code from browser interactions (codegen)
npx playwright codegen https://example.com

# Generate code with custom viewport
npx playwright codegen --viewport-size=1280,720 https://example.com

# Show trace viewer
npx playwright show-trace trace.zip

# Show HTML report
npx playwright show-report

# Install system dependencies
npx playwright install-deps

# Clear browser cache
rm -rf ~/.cache/ms-playwright
```

## MCP Server Integration

Add to `.codebuddy/mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/playwright-mcp-server"
      ],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "~/.cache/ms-playwright"
      }
    }
  }
}
```

### Available MCP Tools

**From microsoft/playwright-mcp:**
- `playwright_navigate` - Navigate to URL
- `playwright_click` - Click element by selector
- `playwright_fill` - Fill input field
- `playwright_screenshot` - Capture screenshot
- `playwright_evaluate` - Execute JavaScript in page context
- `playwright_close` - Close browser/page

**From executeautomation/playwright-mcp-server:**
- `playwright_launch_browser` - Launch browser instance
- `playwright_goto` - Navigate to URL
- `playwright_click_element` - Click element with wait
- `playwright_fill_form` - Fill form fields
- `playwright_get_text` - Extract text content
- `playwright_wait_for_selector` - Wait for element
- `playwright_screenshot_element` - Screenshot specific element
- `playwright_pdf` - Generate PDF
- `playwright_execute_script` - Run JavaScript

## Common Workflows

### 1. Web Scraping: Extract Product Information

```javascript
// Step 1: Launch browser and navigate
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://example-shop.com/products');

// Step 2: Wait for products to load
await page.waitForSelector('.product-card', { timeout: 10000 });

// Step 3: Extract product data
const products = await page.$$eval('.product-card', cards => {
  return cards.map(card => ({
    name: card.querySelector('.product-name')?.textContent,
    price: card.querySelector('.product-price')?.textContent,
    image: card.querySelector('img')?.src,
    url: card.querySelector('a')?.href
  }));
});

// Step 4: Paginate through results
let allProducts = [...products];
while (await page.$('.next-page')) {
  await page.click('.next-page');
  await page.waitForLoadState('networkidle');
  const moreProducts = await page.$$eval('.product-card', /* ... */);
  allProducts = [...allProducts, ...moreProducts];
}

// Step 5: Save results and cleanup
await fs.writeFile('products.json', JSON.stringify(allProducts, null, 2));
await browser.close();
```

### 2. E2E Testing: Login Flow Verification

```javascript
// Step 1: Setup test with authentication state
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Step 2: Navigate to login page
await page.goto('https://app.example.com/login');
await page.fill('#email', 'test@example.com');
await page.fill('#password', 'SecurePassword123');

// Step 3: Submit and verify redirect
await Promise.all([
  page.waitForNavigation({ url: /dashboard/ }),
  page.click('button[type="submit"]')
]);

// Step 4: Verify authenticated state
await expect(page.locator('.user-profile')).toBeVisible();
const username = await page.textContent('.user-name');
expect(username).toBe('Test User');

// Step 5: Test logout
await page.click('.logout-button');
await page.waitForURL(/login/);
await browser.close();
```

### 3. Form Automation: Multi-Step Checkout

```javascript
// Step 1: Navigate to checkout
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://shop.example.com/checkout');

// Step 2: Fill shipping information
await page.fill('#firstName', 'John');
await page.fill('#lastName', 'Doe');
await page.fill('#address', '123 Main St');
await page.fill('#city', 'San Francisco');
await page.selectOption('#state', 'CA');
await page.fill('#zip', '94105');
await page.click('button.continue-to-payment');

// Step 3: Fill payment details
await page.waitForSelector('#card-number');
await page.fill('#card-number', '4111111111111111');
await page.fill('#card-expiry', '12/25');
await page.fill('#card-cvc', '123');

// Step 4: Review and submit order
await page.click('button.continue-to-review');
await page.waitForSelector('.order-summary');
const total = await page.textContent('.total-amount');
console.log(`Order total: ${total}`);

// Step 5: Complete purchase
await page.click('button.place-order');
await page.waitForSelector('.confirmation-number');
const confirmationNumber = await page.textContent('.confirmation-number');
await browser.close();
return confirmationNumber;
```

### 4. Visual Testing: Screenshot Comparison

```javascript
// Step 1: Setup baseline screenshot
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('https://example.com');
await page.screenshot({ path: 'baseline.png', fullPage: true });

// Step 2: Make changes (e.g., deploy new version)
// ... deployment happens ...

// Step 3: Capture new screenshot
await page.goto('https://example.com');
await page.screenshot({ path: 'current.png', fullPage: true });

// Step 4: Compare screenshots (using pixelmatch or similar)
const baseline = await fs.readFile('baseline.png');
const current = await fs.readFile('current.png');
const diff = compareImages(baseline, current);

// Step 5: Report differences
if (diff.pixelsDifferent > 100) {
  console.error(`Visual regression detected: ${diff.pixelsDifferent} pixels differ`);
  await fs.writeFile('diff.png', diff.image);
}
await browser.close();
```

### 5. Monitoring: Check Website Availability

```javascript
// Step 1: Setup monitoring function
async function monitorWebsite(url, checks) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = { url, timestamp: new Date(), checks: {} };

  // Step 2: Navigate and measure load time
  const startTime = Date.now();
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  results.loadTime = Date.now() - startTime;
  results.statusCode = response.status();

  // Step 3: Verify expected elements
  for (const check of checks) {
    const element = await page.$(check.selector);
    results.checks[check.name] = {
      found: !!element,
      text: element ? await element.textContent() : null
    };
  }

  // Step 4: Check for errors in console
  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  await page.waitForTimeout(2000);
  results.consoleLogs = logs.filter(l => l.type === 'error');

  // Step 5: Cleanup and return results
  await browser.close();
  return results;
}

// Usage
const checks = [
  { name: 'header', selector: 'header.main-nav' },
  { name: 'content', selector: 'main.content' },
  { name: 'footer', selector: 'footer' }
];
const status = await monitorWebsite('https://example.com', checks);
```
