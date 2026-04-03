import os
import subprocess
import sys
import re

def main():
    # 1. Install Pillow if missing
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("Installing Pillow...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
        from PIL import Image, ImageDraw, ImageFont

    # 2. Generate Favicon
    fav = Image.new('RGB', (256, 256), color='#4a40e0')
    d = ImageDraw.Draw(fav)
    try:
        font = ImageFont.truetype("arial.ttf", 120)
    except:
        font = ImageFont.load_default()
        
    d.text((45, 60), "CL", fill="white", font=font)
    fav.save("favicon.ico")

    # 3. Generate OG Image
    og = Image.new('RGB', (1200, 630), color='#f5f6f7')
    d_og = ImageDraw.Draw(og)
    try:
        font_og = ImageFont.truetype("arial.ttf", 150)
    except:
        font_og = ImageFont.load_default()
        
    d_og.text((250, 230), "CampusLoot", fill="#4a40e0", font=font_og)
    og.save("og-image.png")

    # 4. Update HTML files
    files = [
        "404.html", "admin.html", "categories.html", "deal.html", 
        "deals.html", "forgot-password.html", "index.html", 
        "login.html", "profile.html", "submit.html", "trending.html", 
        "verify-email.html", "privacy.html", "terms.html"
    ]

    cookie_script = """
  <!-- Cookie Consent Banner -->
  <script>
    (function() {
      if (!localStorage.getItem('cookieConsent')) {
        var banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a1a1a;color:#fff;padding:15px;text-align:center;font-family:sans-serif;z-index:9999;display:flex;justify-content:center;align-items:center;gap:15px;flex-wrap:wrap;border-top:1px solid #333;box-shadow:0 -5px 15px rgba(0,0,0,0.2);';
        banner.innerHTML = '<span style="font-size:14px;">We use cookies to improve your experience. See our <a href="privacy.html" style="color:#4a40e0;text-decoration:underline;">Privacy Policy</a>.</span> ' +
          '<div style="display:flex;gap:10px;"><button id="acceptCookies" style="background:#4a40e0;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:14px;">Accept</button> ' +
          '<button id="declineCookies" style="background:transparent;color:#ccc;border:1px solid #ccc;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Decline</button></div>';
        document.body.appendChild(banner);
        document.getElementById('acceptCookies').onclick = function() {
          localStorage.setItem('cookieConsent', 'accepted');
          banner.style.display = 'none';
        };
        document.getElementById('declineCookies').onclick = function() {
          localStorage.setItem('cookieConsent', 'declined');
          banner.style.display = 'none';
        };
      }
    })();
  </script>
"""

    for fname in files:
        if not os.path.exists(fname): continue
        
        with open(fname, 'r', encoding='utf-8') as f:
            content = f.read()

        title_text = fname.replace('.html', '').replace('-', ' ').title()
        if fname == "index.html":
            title_text = "CampusLoot | Student Deals India"
        elif fname == "404.html":
            title_text = "Page Not Found | CampusLoot"
        else:
            title_text += " | CampusLoot"

        description = f"Exclusive {title_text.replace(' | CampusLoot', '')} on CampusLoot. Find the best student discounts and deals in India."

        seo_tags = f'''
  <meta name="description" content="{description}" />
  <meta property="og:title" content="{title_text}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="/og-image.png" />
  <meta property="og:url" content="https://campusloot.com/{fname}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title_text}" />
  <meta name="twitter:description" content="{description}" />
  <meta name="twitter:image" content="/og-image.png" />
  <link rel="icon" href="/favicon.ico" />
'''
        if fname == "index.html":
            seo_tags += '  <!-- Google Search Console: get token from search.google.com/search-console -->\n  <meta name="google-site-verification" content="PLACEHOLDER_TOKEN_HERE" />\n'
            seo_tags += '  <!-- Bing Webmaster Tools: get token from bing.com/webmasters -->\n  <meta name="msvalidate.01" content="PLACEHOLDER_TOKEN_HERE" />\n'

        # Safely remove existing title/desc to avoid duplicates
        content = re.sub(r'<title>.*?</title>', '', content, flags=re.IGNORECASE | re.DOTALL)
        content = re.sub(r'<meta[^>]*name="description"[^>]*>', '', content, flags=re.IGNORECASE)
        # also check for viewport missing, but most have it.
        
        full_head_addition = f'  <title>{title_text}</title>\n{seo_tags}'

        if '</head>' in content:
            if 'name="viewport"' not in content:
                full_head_addition = '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' + full_head_addition

            content = content.replace('</head>', full_head_addition + '\n</head>')
        
        if 'id="acceptCookies"' not in content and '</body>' in content:
            content = content.replace('</body>', cookie_script + '\n</body>')
            
        with open(fname, 'w', encoding='utf-8') as f:
            f.write(content)
            print(f"Updated {fname}")

if __name__ == "__main__":
    main()
