const fs = require('fs');
const https = require('https');
const path = require('path');

const urls = {
    'stitch_deals.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY0ZGZmZjAwNTRhZjAwNjM5NTYwMGI0MDY5YmNmEgsSBxCR-NH27RYYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDQ4ODE1ODczNjk3MzY0MTk5OA&filename=&opi=89354086',
    'stitch_deal.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY0ZGZmZjFhMzVjNjYwMDMwM2UzNmNiMGFhNmJkEgsSBxCR-NH27RYYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDQ4ODE1ODczNjk3MzY0MTk5OA&filename=&opi=89354086',
    'stitch_submit.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY0ZGZmZjRkOTBhMWQwMDMwM2UzNmNiMGFhNmJkEgsSBxCR-NH27RYYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDQ4ODE1ODczNjk3MzY0MTk5OA&filename=&opi=89354086',
    'stitch_login.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzc1NTYyNDhmNzUwZDQzOGNhNTcwYjk2NTRjZDVmY2I4EgsSBxCR-NH27RYYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDQ4ODE1ODczNjk3MzY0MTk5OA&filename=&opi=89354086',
    'stitch_index.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY0ZGZmZWU2MjgyZTgwOTI1Yzc4ZTdjMTQ0Y2YzEgsSBxCR-NH27RYYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDQ4ODE1ODczNjk3MzY0MTk5OA&filename=&opi=89354086',
    'stitch_profile.html': 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY0ZGZmZjVlYWFhZjEwOTI1YzJkMDc5MGNkMjRhEgsSBxCR-NH27RYYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDQ4ODE1ODczNjk3MzY0MTk5OA&filename=&opi=89354086'
};

const dir = path.join(__dirname, 'stitch_temp');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        let file = fs.createWriteStream(dest);
        https.get(url, function(response) {
            // Check for redirect
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                fs.unlink(dest, () => {}); // Delete the original file
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }

            response.pipe(file);
            file.on('finish', function() {
                file.close(() => resolve(dest));
            });
        }).on('error', function(err) {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function start() {
    for (const [filename, url] of Object.entries(urls)) {
        console.log(`Downloading ${filename}...`);
        await downloadFile(url, path.join(dir, filename));
        console.log(`Saved ${filename}`);
    }
}
start();
