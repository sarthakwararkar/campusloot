const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log('PAGE LOG:', msg.text());
    }
  });
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  // page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  const targetPath = `file:///${path.resolve(__dirname, '../deals.html').replace(/\\/g, '/')}`;
  console.log('Navigating to:', targetPath);
  
  await page.goto(targetPath, { waitUntil: 'networkidle0' });
  
  // Wait a second for async fetch 
  await new Promise(r => setTimeout(r, 2000));
  
  // Check the deals grid content
  const dealsHTML = await page.evaluate(() => {
     return document.getElementById('deals-grid')?.innerHTML.substring(0, 500);
  });
  console.log("Deals Grid HTML Content (first 500 chars):", dealsHTML);
  
  await browser.close();
})();
