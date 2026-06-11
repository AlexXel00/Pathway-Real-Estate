from pathlib import Path
import re

root = Path("Wesbite")
source_file = root / "properties.html"

source = source_file.read_text(encoding="utf-8", errors="ignore")

footer_match = re.search(r"<footer[\s\S]*?</footer>", source)

if not footer_match:
    raise SystemExit("No footer block found in properties.html")

footer_block = footer_match.group(0)

targets = [
    "index.html",
    "about.html",
    "services.html",
    "why-palawan.html",
    "foreign-buyers.html",
    "contact.html",
]

for filename in targets:
    path = root / filename

    if not path.exists():
        print(f"Skipped missing file: {filename}")
        continue

    content = path.read_text(encoding="utf-8", errors="ignore")

    if not re.search(r"<footer[\s\S]*?</footer>", content):
        print(f"No footer found in: {filename}")
        continue

    updated = re.sub(r"<footer[\s\S]*?</footer>", footer_block, content, count=1)

    if updated != content:
        path.write_text(updated, encoding="utf-8")
        print(f"Updated footer in: {filename}")
    else:
        print(f"No change needed in: {filename}")

print("Done.")