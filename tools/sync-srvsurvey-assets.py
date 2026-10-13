"""Keep the SrvSurvey page's inline assets synchronized with their source files."""

import argparse
from pathlib import Path
import re
import subprocess
from textwrap import indent

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--check", action="store_true", help="Fail if generated blocks are stale")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / "srvsurvey"
for page in sorted(root.glob("*.html")):
    html = page.read_text(encoding="utf-8")
    updated = html
    assets = [("navigation", "script", "navigation.js")]
    if page.name == "index.html":
        assets.append(("styles", "style", "site.css"))
    for name, tag, filename in assets:
        source = (root / filename).read_text(encoding="utf-8").rstrip()
        if tag == "style":
            source = subprocess.run(
                ["node", str(Path(__file__).with_name("minify-css.cjs")), str(root / filename)],
                check=True, capture_output=True, text=True,
            ).stdout
        start = f"    <!-- srvsurvey-{name}:start (generated from {filename}) -->"
        end = f"    <!-- srvsurvey-{name}:end -->"
        pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.DOTALL)
        if len(pattern.findall(updated)) != 1:
            raise SystemExit(f"Expected one {name} block in {page.name}")
        if tag == "style":
            block = f'{start}\n    <style>{source}</style>\n{end}'
        else:
            block = f'{start}\n    <{tag}>\n{indent(source, "      ")}\n    </{tag}>\n{end}'
        updated = pattern.sub(lambda _: block, updated)
    if args.check:
        if html != updated:
            raise SystemExit(f"Run python3 tools/sync-srvsurvey-assets.py to refresh {page.name}")
    else:
        page.write_text(updated, encoding="utf-8")
print("SrvSurvey inline assets verified." if args.check else "Updated SrvSurvey inline assets.")
