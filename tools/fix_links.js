const path = require('path');
const files = ['index.html', 'login.html', 'deals.html', 'deal.html', 'submit.html', 'profile.html'];

for (const file of files) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix CampusLoot logo to link to index.html
    // The logo is mostly structured as:
    // <div class="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-['Plus_Jakarta_Sans'] tracking-tight" style="">CampusLoot</div>
    // or inside a span. Let's make the text itself an a-tag if it's not already.
    if (!content.includes('href="index.html">CampusLoot')) {
        content = content.replace(
          />CampusLoot<\/div>/g, 
          '><a href="index.html" class="hover:opacity-80 transition-opacity">CampusLoot</a></div>'
        );
        content = content.replace(
          />CampusLoot<\/span>/g, 
          '><a href="index.html" class="hover:opacity-80 transition-opacity">CampusLoot</a></span>'
        );
    }

    // Replace the exact nav links
    content = content.replace(/href="[^"]*"([^>]*)>Categories<\/a>/g, 'href="categories.html"$1>Categories</a>');
    content = content.replace(/href="[^"]*"([^>]*)>Trending<\/a>/g, 'href="trending.html"$1>Trending</a>');
    // Ensure Explore points to deals.html
    content = content.replace(/href="[^"]*"([^>]*)>Explore<\/a>/g, 'href="deals.html"$1>Explore</a>');
    // Ensure Submit points to submit.html
    content = content.replace(/href="[^"]*"([^>]*)>Submit<\/a>/g, 'href="submit.html"$1>Submit</a>');

    fs.writeFileSync(filePath, content);
}
console.log('Fixed navigation links');
