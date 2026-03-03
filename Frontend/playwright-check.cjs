const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/signin', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Email"]', 'admin@sahaayasetu.com');
  await page.fill('input[placeholder="Password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { waitUntil: 'networkidle' });
  await page.goto('http://127.0.0.1:5173/signup', { waitUntil: 'networkidle' });
  const select = await page.$('select');
  const options = await select.evaluate((el) => {
    return Array.from(el.options).map((opt) => ({ value: opt.value, text: opt.textContent }));
  });
  console.log('select html:', await select.evaluate((el) => el.outerHTML));
  console.log('options length:', options.length);
  console.log('options:', options);
  await page.screenshot({ path: 'signup-admin.png', fullPage: true });
  await browser.close();
})();
