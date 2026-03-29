const fs = require('fs');
let html = fs.readFileSync('stitch_temp/stitch_submit.html', 'utf8');

// Nav bar modifications
html = html.replace(/<nav class="flex justify-between items-center max-w-7xl mx-auto px-6 h-20">[\s\S]*?<\/nav>/, 
    `<nav class="flex justify-between items-center max-w-7xl mx-auto px-6 h-20">
<div class="flex items-center gap-8">
<span class="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-['Plus_Jakarta_Sans'] tracking-tight" style="">CampusLoot</span>
<div class="hidden md:flex gap-6">
<a class="text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors font-bold" href="deals.html" style="">Explore</a>
<a class="text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors font-bold" href="#" style="">Categories</a>
<a class="text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors font-bold" href="#" style="">Trending</a>
<a class="text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 pb-1 font-bold" href="submit.html" style="">Submit</a>
</div>
</div>
<div class="flex items-center gap-4">
<button id="nav-login-btn" onclick="window.location.href='login.html'" class="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold scale-95 active:scale-90 duration-200 transition-all hover:shadow-lg hover:shadow-primary/20" style="">Login</button>
</div>
</nav>`
);

// Form bindings
html = html.replace('<form action="#" class="space-y-8">', '<form id="submit-form" class="space-y-8">');

// Deal Title Add
const formGridStart = '<div class="grid grid-cols-1 md:grid-cols-2 gap-8">';
const dealTitleHtml = `
<div class="space-y-3 md:col-span-2">
<label class="block text-sm font-semibold tracking-wide text-on-surface-variant px-1 uppercase">Deal Title *</label>
<input id="deal-title" class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant font-medium transition-all" placeholder="e.g. GitHub Student Pack — Free for students" type="text" required>
</div>`;
html = html.replace(formGridStart, formGridStart + dealTitleHtml);

// Fields
html = html.replace('<input class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant font-medium transition-all" placeholder="e.g. Nike, Apple, Zomato" type="text">', '<input id="deal-brand" class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant font-medium transition-all" placeholder="e.g. Nike, Apple, Zomato" type="text" required>');

html = html.replace('<select class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface font-medium appearance-none cursor-pointer">', '<select id="deal-category" class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface font-medium appearance-none cursor-pointer" required>');
html = html.replace('<option disabled="" selected="" value="">Select category</option>\n<option>Tech &amp; Gadgets</option>\n<option>Fashion &amp; Apparel</option>\n<option>Food &amp; Dining</option>\n<option>Travel &amp; Leisure</option>\n<option>Education Tools</option>', '<option disabled="" selected="" value="">Select category</option>\n<option value="software">💻 Software</option>\n<option value="food">🍕 Food</option>\n<option value="courses">📚 Courses</option>\n<option value="ott">🎬 OTT</option>\n<option value="local">📍 Local</option>\n<option value="other">🎁 Other</option>');


html = html.replace('<input class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant font-medium transition-all" placeholder="https://brand.com/deal" type="url">', '<input id="deal-url" class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant font-medium transition-all" placeholder="https://brand.com/deal" type="url" required>');

html = html.replace('<textarea class="w-full bg-surface-container-highest p-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant font-medium transition-all resize-none" placeholder="Briefly explain the terms, eligibility, and what\'s included in this offer..." rows="4"></textarea>', '<textarea id="deal-description" class="w-full bg-surface-container-highest p-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant font-medium transition-all resize-none" placeholder="Briefly explain the terms, eligibility, and what\'s included in this offer..." rows="4" required></textarea>');

html = html.replace('<button class="w-full md:w-auto px-12 h-16 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3" type="submit">\n                                Publish Deal\n                                <span class="material-symbols-outlined">send</span>\n</button>', '<button id="submit-btn" class="w-full md:w-auto px-12 h-16 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3" type="submit">\n                                Publish Deal\n                                <span class="material-symbols-outlined" id="submit-spinner">send</span>\n</button>');

// Success overlay
html = html.replace('<div class="hidden fixed inset-0 z-[60] flex items-center justify-center p-6 bg-surface/90 backdrop-blur-md">', '<div id="submit-success-overlay" class="hidden fixed inset-0 z-[60] flex items-center justify-center p-6 bg-surface/90 backdrop-blur-md">');
html = html.replace(`<a class="px-8 h-14 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary-dim transition-colors" href="#">\n                        Go Back to Home\n                    </a>`, `<a class="px-8 h-14 rounded-full bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary-dim transition-colors" href="profile.html">\n                        Go to Dashboard\n                    </a>`);
html = html.replace(`<button class="px-8 h-14 rounded-full text-primary font-bold hover:bg-primary/5 transition-colors">\n                        Submit Another Deal\n                    </button>`, `<button id="submit-another-btn" class="px-8 h-14 rounded-full text-primary font-bold hover:bg-primary/5 transition-colors" onclick="document.getElementById('submit-success-overlay').classList.add('hidden'); document.getElementById('submit-form').reset();">\n                        Submit Another Deal\n                    </button>`);

let scripts = `
<script src="js/supabase.js"></script>
<script src="js/utils.js"></script>
<script src="js/auth.js"></script>
<script src="js/deals.js"></script>
<script src="js/components.js"></script>
<script>
    (async function initSubmitPage() {
        const user = await requireAuth();
        if (!user) return;

        const loginBtn = document.getElementById('nav-login-btn');
        if (loginBtn) {
            loginBtn.textContent = 'Dashboard';
            loginBtn.onclick = () => window.location.href = 'profile.html';
        }

        const form = document.getElementById('submit-form');
        const successOverlay = document.getElementById('submit-success-overlay');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const title = document.getElementById('deal-title').value.trim();
            const brand = document.getElementById('deal-brand').value.trim();
            const category = document.getElementById('deal-category').value;
            const description = document.getElementById('deal-description').value.trim();
            const url = document.getElementById('deal-url').value.trim();

            if (!title || !brand || !category || !description || !url) {
                alert('Please fill in all required fields');
                return;
            }

            const btn = document.getElementById('submit-btn');
            const spinner = document.getElementById('submit-spinner');
            const originalHtml = btn.innerHTML;
            
            btn.innerHTML = 'Submitting... <span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span>';
            btn.disabled = true;

            const result = await submitDeal({
                title,
                brand_name: brand,
                category,
                description,
                deal_url: url
            });

            btn.innerHTML = originalHtml;
            btn.disabled = false;

            if (!result.success) {
                alert(result.error || 'Failed to submit deal. Please try again.');
                return;
            }

            // Show success overlay
            successOverlay.classList.remove('hidden');
        });
    })();
</script>
<style>
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
</body></html>`;

html = html.replace('</body></html>', scripts);

fs.writeFileSync('submit.html', html);
console.log('Successfully written to submit.html');
