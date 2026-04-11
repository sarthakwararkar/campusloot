const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const htmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));
const allFiles = fs.readdirSync(rootDir, { recursive: true }).map(f => f.replace(/\\/g, '/'));

let brokenLinks = [];

for (const file of htmlFiles) {
    const filePath = path.join(rootDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const hrefs = content.match(/href="([^"]*)"/g);
    if (!hrefs) continue;

    for (const match of hrefs) {
        let href = match.match(/href="([^"]*)"/)[1];
        if (!href || href === '#' || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;

        // Clean up fragment identifiers
        const cleanHref = href.split('#')[0];
        if (!cleanHref) continue;

        if (!allFiles.includes(cleanHref) && !allFiles.includes(cleanHref.replace(/^\//, ''))) {
            brokenLinks.push({ file, href });
        }
    }
}

if (brokenLinks.length > 0) {
    console.log('Broken links found:');
    console.table(brokenLinks);
} else {
    console.log('No broken internal links found!');
}
