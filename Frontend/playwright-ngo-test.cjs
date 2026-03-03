const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PLAYWRIGHT CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PLAYWRIGHT PAGE ERROR:', err.stack || err.message));
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('PLAYWRIGHT RESPONSE ERROR:', res.status(), res.url());
    }
  });
  const timestamp = Date.now();
  const ngoEmail = `test-ngo-${timestamp}@example.com`;
  const ngoPassword = 'ngoPass123!';

  await page.goto('http://127.0.0.1:5173/signin', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Email"]', 'admin@sahaayasetu.com');
  await page.fill('input[placeholder="Password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { waitUntil: 'networkidle' });

  await page.goto('http://127.0.0.1:5173/signup', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Name"]', 'Playwright NGO');
  await page.fill('input[placeholder="Email"]', ngoEmail);
  await page.fill('input[placeholder="Password"]', ngoPassword);
  await page.waitForFunction(() => {
    const select = document.querySelector('select');
    return select && Array.from(select.options).some((option) => option.value === 'ngo');
  });
  await page.selectOption('select', 'ngo');
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(2000);

  await page.click('button:has-text("Logout")');
  await page.waitForURL('**/signin', { waitUntil: 'networkidle' });

  await page.fill('input[placeholder="Email"]', ngoEmail);
  await page.fill('input[placeholder="Password"]', ngoPassword);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { waitUntil: 'networkidle' });

  await page.goto('http://127.0.0.1:5173/ngo', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=NGO Operations Suite', { timeout: 10000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'ngo-logged-in.png', fullPage: true });

  await browser.close();
  console.log('Playwright script finished, created NGO user:', ngoEmail);
})();
