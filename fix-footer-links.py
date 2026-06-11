from pathlib import Path

root = Path("Wesbite")

css_block = """
/* Footer contact links */
.footer-contact a {
  color: inherit;
  text-decoration: none;
}

.footer-contact a:hover {
  color: inherit;
}
"""

targets = [
    "index.html",
    "about.html",
    "services.html",
    "why-palawan.html",
    "foreign-buyers.html",
    "contact.html",
    "properties.html",
]

for filename in targets:
    path = root / filename

    if not path.exists():
        print(f"Skipped missing file: {filename}")
        continue

    content = path.read_text(encoding="utf-8", errors="ignore")

    if ".footer-contact a" in content:
        print(f"Already has footer link CSS: {filename}")
        continue

    if "</style>" not in content:
        print(f"No style tag found in: {filename}")
        continue

    updated = content.replace("</style>", css_block + "\n</style>", 1)
    path.write_text(updated, encoding="utf-8")

    print(f"Added footer link CSS to: {filename}")

print("Done.")