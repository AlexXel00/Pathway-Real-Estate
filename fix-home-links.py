from pathlib import Path
import re

root = Path("Wesbite")

targets = [
    "index.html",
    "about.html",
    "services.html",
    "why-palawan.html",
    "foreign-buyers.html",
    "contact.html",
    "properties.html",
]

patterns = [
    r'href="index#"',
    r"href='index#'",
    r'href="index"',
    r"href='index'",
    r'href="index.html#"',
    r"href='index.html#'",
    r'href="#home"',
    r"href='#home'",
]

for filename in targets:
    path = root / filename

    if not path.exists():
        print(f"Skipped missing file: {filename}")
        continue

    content = path.read_text(encoding="utf-8", errors="ignore")
    original = content

    for pattern in patterns:
        content = re.sub(pattern, 'href="/index.html"', content)

    if content != original:
        path.write_text(content, encoding="utf-8")
        print(f"Fixed home links in: {filename}")
    else:
        print(f"No home link changes needed in: {filename}")

print("Done.")