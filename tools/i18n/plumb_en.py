"""One-time changes to the English pages so they work with the German version:
language switch in the nav, hreflang links, a language field in the two forms.
Safe to run twice (it checks before adding)."""
import re, sys, glob, os

site = sys.argv[1]
BASE = 'https://pathwayphilippines.com'
SWITCH_CSS = """  nav .lang-switch{display:flex;align-items:center;font-family:var(--sans);font-size:10px;font-weight:400;letter-spacing:0.12em;}
  nav .lang-switch a{color:var(--c3);text-decoration:none;padding:3px 8px;transition:color 0.2s;}
  nav .lang-switch a + a{border-left:0.5px solid var(--c4);}
  nav .lang-switch a:hover, nav .lang-switch a.active{color:var(--c6);}
  nav .lang-switch a.active{font-weight:500;}
"""
SWITCH_CSS_MOBILE = "    nav .lang-switch{margin-right:14px;}\n    nav .lang-switch a{display:inline-block !important;}\n"
SWITCH_JS = """<script>
/* language switch keeps the current listing or filter when changing language */
document.querySelectorAll('.lang-switch a').forEach(function (a) {
  a.addEventListener('click', function () {
    if (location.search || location.hash) a.href = a.getAttribute('href').split(/[?#]/)[0] + location.search + location.hash;
  });
});
</script>
"""

for path in sorted(glob.glob(os.path.join(site, '*.html'))):
    f = os.path.basename(path)
    s = open(path, encoding='utf-8').read()
    orig = s
    article = f == 'news-article.html'
    en = '/' if f == 'index.html' else '/' + f
    de = '/de/' + ('' if f == 'index.html' else f)
    if article:
        en, de = '{{PATH}}', '/de/news.html'

    # 1) hreflang (not for the article template: articles exist in English only)
    if not article and 'hreflang="de"' not in s:
        s = re.sub(r'(<link rel="canonical" href="[^"]*">)',
                   lambda m: m.group(1) + f'\n<link rel="alternate" hreflang="en" href="{BASE}{en}">'
                   f'\n<link rel="alternate" hreflang="de" href="{BASE}{de}">'
                   f'\n<link rel="alternate" hreflang="x-default" href="{BASE}{en}">', s, count=1)

    # 2) switch in the nav, before the menu button
    if 'class="lang-switch"' not in s:
        en_href = '#' if article else en
        sw = (f'<span class="lang-switch"><a href="{en_href}" data-lang="en" hreflang="en" lang="en" class="active" aria-current="true">EN</a>'
              f'<a href="{de}" data-lang="de" hreflang="de" lang="de">DE</a></span>\n    ')
        s = s.replace('<button class="hamburger"', sw + '<button class="hamburger"', 1)

    # 3) switch styles, inside the shared nav styles
    if 'nav .lang-switch' not in s:
        s = s.replace("  nav .nav-menu.open{display:block;}\n", "  nav .nav-menu.open{display:block;}\n" + SWITCH_CSS, 1)
        s = s.replace("    nav button.hamburger{display:flex;margin-left:0;}\n",
                      "    nav button.hamburger{display:flex;margin-left:0;}\n" + SWITCH_CSS_MOBILE, 1)

    # 4) small script so the switch keeps query strings
    if '.lang-switch a' not in s.split('</style>')[-1]:
        s = s.replace('</body>', SWITCH_JS + '</body>', 1)

    # 5) forms tell the team which language the visitor used
    for form in ('contact', 'calculator'):
        tag = f'<input type="hidden" name="form-name" value="{form}">'
        if tag in s and 'name="language"' not in s:
            s = s.replace(tag, tag + '\n          <input type="hidden" name="language" value="English">', 1)

    if s != orig:
        open(path, 'w', encoding='utf-8').write(s)
        print('updated', f)
    for need in ('class="lang-switch"', 'nav .lang-switch{'):
        if need not in s:
            print('  WARNING', f, 'missing', need)
