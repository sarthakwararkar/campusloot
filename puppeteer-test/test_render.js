const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: "http://localhost" });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = { getItem: () => null, setItem: () => null };

// Execute scripts in context
const utilsContent = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
const compContent = fs.readFileSync(path.join(__dirname, '../js/components.js'), 'utf8');

dom.window.eval(utilsContent);
dom.window.eval(compContent);

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://thevyutzufzxiorplvya.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZXZ5dXR6dWZ6eGlvcnBsdnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODAyMzYsImV4cCI6MjA4OTc1NjIzNn0.3NGjr107BGKPwlOmyJk3YRo76KnZ5HgTFq1L46aBuuM');

async function testRender() {
  const { data: deals } = await supabase.from('deals').select('*').eq('is_active', true);
  console.log(`Testing render for ${deals.length} deals...`);
  
  let successCount = 0;
  for (const deal of deals) {
    try {
      const card = dom.window.renderDealCard(deal);
      if (!card) throw new Error("Card returned null");
      successCount++;
    } catch (e) {
      console.error(`Crash on deal ${deal.id}:`, e);
      return;
    }
  }
  console.log(`Successfully rendered ${successCount} deals out of ${deals.length}`);
}

testRender();
