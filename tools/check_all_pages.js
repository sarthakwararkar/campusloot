const puppeteer = require('puppeteer');

const pagesToCheck = [
  '/',
  '/deals.html',
  '/categories.html',
  '/trending.html',
  '/login.html',
  '/submit.html',
  '/profile.html'
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  for (const p of pagesToCheck) {
    console.log(`\n--- Checking ${p} ---`);
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`PAGE LOG [${p}]:`, msg.text());
    });
    page.on('pageerror', error => console.error(`PAGE ERROR [${p}]:`, error.message));
    page.on('requestfailed', request => {
      if (!request.url().includes('favicon.ico')) {
          console.error(`REQUEST FAILED [${p}]:`, request.url(), request.failure()?.errorText);
      }
    });

    try {
      await page.goto(`http://localhost:3000${p}`, { waitUntil: 'networkidle0' });
      console.log(`Navigation to ${p} successful!`);
    } catch (err) {
      console.error(`NAVIGATION ERROR [${p}]:`, err.message);
    }
    
    // Give some time for any async JS to run
    await new Promise(r => setTimeout(r, 1000));
    
    // Remove listeners for next page
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.removeAllListeners('requestfailed');
  }

  await browser.close();
  console.log('\nAll checks done.');
})();
