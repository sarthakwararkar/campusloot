const fs = require('fs');
let html = fs.readFileSync('stitch_temp/stitch_profile.html', 'utf8');

// Nav replacements
html = html.replace(/<nav class="sticky top-0 z-50 w-full bg-white\/80 dark:bg-slate-900\/80 backdrop-blur-xl shadow-sm shadow-indigo-500\/5">[\s\S]*?<\/nav>/, 
    `<nav class="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm shadow-indigo-500/5">
<div class="flex justify-between items-center max-w-7xl mx-auto px-6 h-20">
<div class="flex items-center gap-8">
<span class="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-['Plus_Jakarta_Sans'] tracking-tight" style="">CampusLoot</span>
<div class="hidden md:flex gap-6">
<a class="text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors font-bold" href="deals.html" style="">Explore</a>
<a class="text-slate-600 dark:text-slate-400 hover:text-indigo-500 transition-colors font-bold" href="submit.html" style="">Submit</a>
</div>
</div>
<div class="flex items-center gap-4">
<button id="nav-logout-btn" onclick="signOut()" class="bg-surface-container-high text-on-surface-variant px-6 py-2.5 rounded-full font-bold scale-95 active:scale-90 duration-200 transition-all hover:bg-surface-container-highest" style="">Logout</button>
</div>
</div>
</nav>`
);

// Sidebar IDs
html = html.replace('<!-- Dashboard Active -->', '');
html = html.replace(/<nav class="flex flex-col gap-1">\s*<a[\s\S]*?<\/nav>/, 
`<nav class="flex flex-col gap-1">
<button data-tab="dashboard" class="profile-tab flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm rounded-xl transition-transform tap-highlight-none">
<span class="material-symbols-outlined" data-icon="dashboard">dashboard</span><span>Dashboard</span>
</button>
<button data-tab="saved" class="profile-tab flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 rounded-xl transition-transform tap-highlight-none">
<span class="material-symbols-outlined" data-icon="bookmark">bookmark</span><span>Saved Deals</span>
</button>
<button data-tab="submissions" class="profile-tab flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 rounded-xl transition-transform tap-highlight-none">
<span class="material-symbols-outlined" data-icon="add_circle">add_circle</span><span>My Submissions</span>
</button>
<button data-tab="settings" class="profile-tab flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 rounded-xl transition-transform tap-highlight-none">
<span class="material-symbols-outlined" data-icon="settings">settings</span><span>Settings</span>
</button>
</nav>`);

// Profile Info IDs
html = html.replace('<h1 class="text-4xl font-black font-headline tracking-tighter text-on-surface" style="">Arjun Malhotra</h1>', '<h1 id="profile-name" class="text-4xl font-black font-headline tracking-tighter text-on-surface" style="">Loading...</h1>');
html = html.replace('<p class="text-lg text-on-surface-variant font-medium mb-6" style="">Indian Institute of Technology, Delhi</p>', '<p id="profile-college-city" class="text-lg text-on-surface-variant font-medium mb-6" style=""></p>');
html = html.replace(/<span class="font-headline font-bold text-primary text-xl" style="">12<\/span>/, '<span id="profile-stats-saved" class="font-headline font-bold text-primary text-xl" style="">0</span>');
html = html.replace(/<span class="font-headline font-bold text-primary text-xl" style="">3<\/span>/, '<span id="profile-stats-subs" class="font-headline font-bold text-primary text-xl" style="">0</span>');
html = html.replace(/<span class="font-headline font-bold text-primary text-xl" style="">₹4\.2k<\/span>/, '<span class="font-headline font-bold text-primary text-xl" style="">--</span>');

html = html.replace('<button class="flex items-center gap-2 px-6 py-3 bg-primary text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all scale-100 hover:scale-105 active:scale-95"', '<button onclick="document.querySelector(\'[data-tab=settings]\').click()" class="flex items-center gap-2 px-6 py-3 bg-primary text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all scale-100 hover:scale-105 active:scale-95"');

// Sections
let savedSectionRegex = /<!-- Saved Deals Section -->\s*<section class="flex flex-col gap-8">([\s\S]*?)<\/section>/;

let tabsContainer = `
<div id="tab-dashboard" class="tab-content block">
    <section class="flex flex-col gap-8">
        <div class="flex justify-between items-end">
        <div class="flex flex-col gap-1">
        <h2 class="text-3xl font-black font-headline tracking-tighter text-on-surface">Your Collections</h2>
        <p class="text-on-surface-variant font-medium">Curated deals ready for your next checkout.</p>
        </div>
        </div>
        <div id="saved-deals-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div>
    </section>
</div>
<div id="tab-submissions" class="tab-content hidden">
    <section class="flex flex-col gap-8">
        <div class="flex justify-between items-end">
        <div class="flex flex-col gap-1">
        <h2 class="text-3xl font-black font-headline tracking-tighter text-on-surface">My Submissions</h2>
        <p class="text-on-surface-variant font-medium">Deals you've contributed to CampusLoot.</p>
        </div>
        </div>
        <div id="submissions-container" class="bg-surface-container-lowest rounded-[2rem] p-8 editorial-shadow"></div>
    </section>
</div>
<div id="tab-settings" class="tab-content hidden">
    <section class="flex flex-col gap-8">
        <div class="flex justify-between items-end">
        <div class="flex flex-col gap-1">
        <h2 class="text-3xl font-black font-headline tracking-tighter text-on-surface">Settings</h2>
        <p class="text-on-surface-variant font-medium">Manage your personal details and preferences.</p>
        </div>
        </div>
        <div class="bg-surface-container-lowest rounded-[2rem] p-8 md:p-12 editorial-shadow border border-white/50 space-y-12">
            
            <form id="profile-form" class="space-y-6">
                <h3 class="text-xl font-bold">Edit Profile</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="block text-sm font-semibold tracking-wide text-on-surface-variant uppercase">Full Name</label>
                        <input type="text" id="edit-name" class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface font-medium">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="block text-sm font-semibold tracking-wide text-on-surface-variant uppercase">College Name</label>
                        <input type="text" id="edit-college" class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface font-medium">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-sm font-semibold tracking-wide text-on-surface-variant uppercase">City</label>
                        <input type="text" id="edit-city" class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface font-medium">
                    </div>
                </div>
                <button type="submit" id="save-profile-btn" class="px-8 h-14 rounded-full bg-primary text-white font-bold hover:translate-y-[-2px] hover:shadow-lg transition-all">Save Changes</button>
            </form>

            <hr class="border-outline-variant/20">

            <form id="password-form" class="space-y-6">
                <h3 class="text-xl font-bold">Change Password</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="block text-sm font-semibold tracking-wide text-on-surface-variant uppercase">New Password</label>
                        <input type="password" id="new-password" class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface font-medium">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-sm font-semibold tracking-wide text-on-surface-variant uppercase">Confirm Password</label>
                        <input type="password" id="confirm-password" class="w-full h-14 bg-surface-container-highest px-6 rounded-xl border-none focus:ring-2 focus:ring-primary/20 text-on-surface font-medium">
                    </div>
                </div>
                <div id="password-error" class="text-error font-medium text-sm hidden"></div>
                <button type="submit" id="change-password-btn" class="px-8 h-14 rounded-full bg-surface-container-high text-on-surface-variant font-bold hover:bg-surface-container-highest transition-all">Change Password</button>
            </form>

        </div>
    </section>
</div>
`;

html = html.replace(savedSectionRegex, tabsContainer);

let scripts = `
<script src="js/supabase.js"></script>
<script src="js/utils.js"></script>
<script src="js/auth.js"></script>
<script src="js/deals.js"></script>
<script src="js/components.js"></script>
<script>
    (async function initProfilePage() {
        const user = await requireAuth();
        if (!user) return;

        const profile = await getCurrentProfile();
        
        document.getElementById('profile-name').textContent = profile?.full_name || user.email;
        document.getElementById('profile-college-city').textContent = [profile?.college_name, profile?.city].filter(Boolean).join(' • ') || 'Update your profile to see info here.';
        
        // Tab switching logic
        const tabs = document.querySelectorAll('.profile-tab');
        const contents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                
                // Active styling
                tabs.forEach(b => {
                    b.classList.remove('bg-white', 'dark:bg-slate-800', 'text-indigo-600', 'dark:text-indigo-300', 'shadow-sm');
                    b.classList.add('text-slate-500', 'dark:text-slate-400');
                });
                btn.classList.add('bg-white', 'dark:bg-slate-800', 'text-indigo-600', 'dark:text-indigo-300', 'shadow-sm');
                btn.classList.remove('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-200/50');
                
                // For 'saved' vs 'dashboard', both map to tab-dashboard
                let targetId = target === 'saved' ? 'dashboard' : target;
                
                contents.forEach(c => c.classList.add('hidden'));
                const targetContent = document.getElementById('tab-' + targetId);
                if (targetContent) {
                   targetContent.classList.remove('hidden');
                   targetContent.classList.add('block');
                }
            });
        });

        // Load Saved Deals
        const savedGrid = document.getElementById('saved-deals-grid');
        savedGrid.innerHTML = '<div class="col-span-1 md:col-span-2 xl:col-span-3 text-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>';
        
        const savedDeals = await getSavedDeals(user.id);
        savedGrid.innerHTML = '';
        if (savedDeals.length === 0) {
            savedGrid.innerHTML = \`<div class="col-span-1 md:col-span-3 mt-8 flex flex-col items-center justify-center py-20 px-6 bg-surface-container-lowest rounded-[3rem] editorial-shadow text-center">
                <div class="w-24 h-24 mb-6 bg-gradient-to-tr from-primary/10 to-secondary/10 rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-5xl text-primary/40">folder_open</span>
                </div>
                <h3 class="text-2xl font-black font-headline text-on-surface mb-3 tracking-tight">No saved deals yet</h3>
                <p class="text-on-surface-variant max-w-sm mb-8">Start exploring thousands of student-only discounts across your favorite brands.</p>
                <button onclick="window.location.href='deals.html'" class="px-8 py-4 bg-primary text-white font-headline font-bold rounded-full shadow-xl shadow-primary/20 transition-all hover:scale-105">Explore Trending Deals</button>
            </div>\`;
            document.getElementById('profile-stats-saved').textContent = '0';
        } else {
            const savedIds = new Set(savedDeals.map(d => d.id));
            savedDeals.forEach(deal => {
                savedGrid.appendChild(renderDealCard(deal, { savedDeals: savedIds }));
            });
            document.getElementById('profile-stats-saved').textContent = savedDeals.length;
        }

        // Load Submissions
        const subContainer = document.getElementById('submissions-container');
        subContainer.innerHTML = '<div class="text-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>';
        
        const submissions = await getUserSubmissions(user.id);
        if (!submissions || submissions.length === 0) {
            subContainer.innerHTML = \`<div class="text-center py-12">
                <p class="text-on-surface-variant mb-4 font-medium">You haven't submitted any deals yet.</p>
                <button onclick="window.location.href='submit.html'" class="px-8 h-12 bg-primary/10 text-primary font-bold rounded-full hover:bg-primary/20 transition-colors">Submit a Deal</button>
            </div>\`;
            document.getElementById('profile-stats-subs').textContent = '0';
        } else {
            document.getElementById('profile-stats-subs').textContent = submissions.length;
            let tableHTML = \`<div class="overflow-x-auto"><table class="w-full text-left border-collapse min-w-[600px]">
                <thead><tr class="border-b border-outline-variant/20 text-on-surface-variant font-bold text-sm uppercase tracking-wider">
                    <th class="py-4 px-4">Title</th>
                    <th class="py-4 px-4">Brand</th>
                    <th class="py-4 px-4">Status</th>
                    <th class="py-4 px-4">Date</th>
                </tr></thead><tbody>\`;
            
            submissions.forEach(sub => {
                let statusColor = sub.status === 'approved' ? 'text-green-600 bg-green-100 dark:bg-green-900/40' : 
                                sub.status === 'rejected' ? 'text-error bg-error-container dark:bg-error-container/40' : 
                                'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40';
                
                tableHTML += \`<tr class="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors font-medium">
                    <td class="py-4 px-4">\${escapeHTML(sub.title || '')}</td>
                    <td class="py-4 px-4">\${escapeHTML(sub.brand_name || '—')}</td>
                    <td class="py-4 px-4"><span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest \${statusColor}">\${escapeHTML(sub.status || '')}</span></td>
                    <td class="py-4 px-4 text-on-surface-variant text-sm">\${formatDate(sub.created_at)}</td>
                </tr>\`;
            });
            tableHTML += \`</tbody></table></div>\`;
            subContainer.innerHTML = tableHTML;
        }

        // Settings Forms
        document.getElementById('edit-name').value = profile?.full_name || '';
        document.getElementById('edit-college').value = profile?.college_name || '';
        document.getElementById('edit-city').value = profile?.city || '';

        // Save Profile
        document.getElementById('profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-profile-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Saving...';
            btn.disabled = true;

            const { error } = await updateProfile(user.id, {
                full_name: sanitizeInput(document.getElementById('edit-name').value),
                college_name: sanitizeInput(document.getElementById('edit-college').value),
                city: sanitizeInput(document.getElementById('edit-city').value)
            });

            btn.innerHTML = originalText;
            btn.disabled = false;

            if (error) {
                alert('Failed to update profile.');
            } else {
                alert('Profile updated successfully!');
                document.getElementById('profile-name').textContent = document.getElementById('edit-name').value;
                document.getElementById('profile-college-city').textContent = [document.getElementById('edit-college').value, document.getElementById('edit-city').value].filter(Boolean).join(' • ');
            }
        });

        // Change Password
        document.getElementById('password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPw = document.getElementById('new-password').value;
            const confirmPw = document.getElementById('confirm-password').value;
            const errorEl = document.getElementById('password-error');
            errorEl.classList.add('hidden');

            if (newPw !== confirmPw) {
                errorEl.textContent = 'Passwords do not match';
                errorEl.classList.remove('hidden');
                return;
            }

            const pwCheck = validatePassword(newPw);
            if (!pwCheck.valid) {
                errorEl.textContent = pwCheck.message;
                errorEl.classList.remove('hidden');
                return;
            }

            const btn = document.getElementById('change-password-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Changing...';
            btn.disabled = true;

            const { error } = await updatePassword(newPw);

            btn.innerHTML = originalText;
            btn.disabled = false;

            if (error) {
                errorEl.textContent = error;
                errorEl.classList.remove('hidden');
            } else {
                alert('Password changed successfully!');
                document.getElementById('password-form').reset();
            }
        });
    })();
</script>
</body></html>`;

html = html.replace('</body></html>', scripts);

fs.writeFileSync('profile.html', html);
console.log('Successfully written to profile.html');
