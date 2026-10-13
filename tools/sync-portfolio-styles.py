"""Inline the small portfolio stylesheet so first paint needs no CSS request."""

import argparse
from pathlib import Path
import re
from textwrap import indent

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--check", action="store_true", help="Fail if index.html needs updating")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
page = root / "index.html"
html = page.read_text(encoding="utf-8")
css = (root / "styles.css").read_text(encoding="utf-8").rstrip()
start = "    <!-- portfolio-styles:start (generated from styles.css) -->"
end = "    <!-- portfolio-styles:end -->"
pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.DOTALL)
if len(pattern.findall(html)) != 1:
    raise SystemExit("Expected one portfolio stylesheet block in index.html")
block = f'{start}\n    <style>\n{indent(css, "      ")}\n    </style>\n{end}'
updated = pattern.sub(lambda _: block, html)
if args.check:
    if html != updated:
        raise SystemExit("Run python3 tools/sync-portfolio-styles.py to refresh index.html")
    print("Portfolio inline stylesheet matches styles.css.")
else:
    page.write_text(updated, encoding="utf-8")
    print("Updated portfolio inline stylesheet.")
