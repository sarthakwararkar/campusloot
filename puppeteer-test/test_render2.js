const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const utilsPath = path.join(__dirname, '../js/utils.js');
const componentsPath = path.join(__dirname, '../js/components.js');

const utilsStr = fs.readFileSync(utilsPath, 'utf8');
const compStr = fs.readFileSync(componentsPath, 'utf8');

const html = `
<!DOCTYPE html>
<html>
<head>
  <script>${utilsStr}</script>
  <script>${compStr}</script>
</head>
<body>
  <div id="test"></div>
  <script>
     window.testRender = function(deal) {
        const grid = document.getElementById('test');
        // mock formatPrice since it depends on DOM / globals
        const card = renderDealCard(deal, { savedDeals: new Set(), showSave: true });
        grid.appendChild(card);
     };
  </script>
</body>
</html>
`;

const dom = new JSDOM(html, { runScripts: "dangerously" });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://thevyutzufzxiorplvya.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXZ5dXR6dWZ6eGlvcnBsdnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODAyMzYsImV4cCI6MjA4OTc1NjIzNn0.3NGjr107BGKPwlOmyJk3YRo76KnZ5HgTFq1L46aBuuM');

async function testRender() {
  const { data: deals } = await supabase.from('deals').select('*').eq('is_active', true);
  console.log(`Checking ${deals.length} deals...`);
  
  let successCount = 0;
  for (const deal of deals) {
    try {
      dom.window.testRender(deal);
      successCount++;
    } catch(e) {
      console.log(`Crash on deal ${deal.id}: ${deal.title}`, e);
    }
  }
  console.log(`Successfully rendered ${successCount}/${deals.length} deals`);
}

testRender();
