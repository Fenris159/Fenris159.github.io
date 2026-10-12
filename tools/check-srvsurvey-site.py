"""Check the static SrvSurvey site for broken local links and basic document structure."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Document(HTMLParser):
    """Collect IDs, references and accessible image descriptions from a page."""

    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = set()
        self.refs = []
        self.h1_count = 0
        self.errors = []
        self.title_found = False

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if "id" in attrs:
            if attrs["id"] in self.ids:
                self.errors.append(f"duplicate ID: {attrs['id']}")
            self.ids.add(attrs["id"])
        if tag == "h1":
            self.h1_count += 1
        if tag == "title":
            self.title_found = True
        if tag == "img" and "alt" not in attrs:
            self.errors.append("image missing alt attribute")
        for key in ("href", "src"):
            if attrs.get(key):
                self.refs.append(attrs[key])


root = Path(__file__).resolve().parents[1]
paths = [root / "index.html", *sorted((root / "srvsurvey").glob("*.html"))]
documents = {}
for path in paths:
    document = Document(path)
    document.feed(path.read_text(encoding="utf-8"))
    documents[path] = document

errors = []
for path, document in documents.items():
    label = path.relative_to(root)
    if document.h1_count != 1:
        document.errors.append(f"expected one h1, found {document.h1_count}")
    if not document.title_found:
        document.errors.append("missing document title")
    for reference in document.refs:
        parts = urlsplit(reference)
        if parts.scheme or parts.netloc:
            continue
        target = (path.parent / unquote(parts.path)).resolve() if parts.path else path
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            document.errors.append(f"missing local target: {reference}")
        elif parts.fragment and target.suffix == ".html":
            linked = documents.get(target)
            if linked is None:
                linked = Document(target)
                linked.feed(target.read_text(encoding="utf-8"))
            if unquote(parts.fragment) not in linked.ids:
                document.errors.append(f"missing anchor: {reference}")
    errors.extend(f"{label}: {error}" for error in document.errors)

if errors:
    raise SystemExit("\n".join(errors))
print(f"Checked {len(documents)} pages: local links, anchors, IDs, titles and image alt attributes passed.")
