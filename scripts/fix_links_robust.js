const fs = require('fs');
const path = require('fs');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const replacements = [
    { text: 'Explore', href: 'deals.html' },
    { text: 'Categories', href: 'categories.html' },
    { text: 'Trending', href: 'trending.html' },
    { text: 'Submit', href: 'submit.html' },
    { text: 'Home', href: 'index.html' }
];

for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix logo
    if (!content.includes('href="index.html">CampusLoot')) {
        const newLogo = '><a href="index.html" class="hover:opacity-80 transition-opacity">CampusLoot</a>';
        if (content.includes('>CampusLoot</div>')) {
            content = content.replace(/>CampusLoot<\/div>/g, newLogo + '</div>');
            changed = true;
        } else if (content.includes('>CampusLoot</span>')) {
            content = content.replace(/>CampusLoot<\/span>/g, newLogo + '</span>');
            changed = true;
        }
    }

    // Fix nav links
    for (const r of replacements) {
        // Match <a> tags with the specific text, possibly across lines
        const regex = new RegExp(`href="[^"]*"([^>]*?>\\s*?${r.text}\\s*?<\\/a>)`, 'gis');
        content = content.replace(regex, (match, suffix) => {
            changed = true;
            return `href="${r.href}"${suffix}`;
        });
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated links in ${file}`);
    }
}
