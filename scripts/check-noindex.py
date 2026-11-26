"""Require robots directives in every HTML page of the deployment artifact."""
from html.parser import HTMLParser
from pathlib import Path
import sys

REQUIRED = {"noindex", "nofollow", "noimageindex"}


class RobotsParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.rules = set()

    def handle_starttag(self, tag, attrs):
        if tag == "head":
            self.in_head = True
        attrs = dict(attrs)
        if self.in_head and tag == "meta" and attrs.get("name", "").lower() == "robots":
            self.rules.update(attrs.get("content", "").lower().replace(",", " ").split())

    def handle_endtag(self, tag):
        if tag == "head":
            self.in_head = False


pages = sorted(Path(sys.argv[1]).rglob("*.html"))
assert pages, "No HTML pages found in deployment artifact"
for page in pages:
    parser = RobotsParser()
    parser.feed(page.read_text(encoding="utf-8"))
    missing = REQUIRED - parser.rules
    assert not missing, f"{page}: missing robots directives: {sorted(missing)}"
print(f"Indexing disabled on all {len(pages)} HTML pages.")
