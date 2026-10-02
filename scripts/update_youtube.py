#!/usr/bin/env python3
import json, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_ID = "UC-U9OyJQftduEyKqn5mwlhw"
FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
OUT = Path(__file__).resolve().parents[1] / "data" / "videos.json"

ns = {
    "atom":"http://www.w3.org/2005/Atom",
    "yt":"http://www.youtube.com/xml/schemas/2015",
    "media":"http://search.yahoo.com/mrss/"
}

with urllib.request.urlopen(FEED, timeout=20) as r:
    root = ET.fromstring(r.read())

videos=[]
for entry in root.findall("atom:entry", ns)[:12]:
    vid = entry.findtext("yt:videoId", default="", namespaces=ns)
    title = entry.findtext("atom:title", default="", namespaces=ns)
    published = entry.findtext("atom:published", default="", namespaces=ns)
    desc = entry.findtext("media:group/media:description", default="", namespaces=ns)
    thumb = entry.find("media:group/media:thumbnail", ns)
    thumb_url = thumb.attrib.get("url") if thumb is not None else f"https://i.ytimg.com/vi/{vid}/maxresdefault.jpg"
    videos.append({
        "id": vid,
        "title": title,
        "description": (desc or "").strip()[:320],
        "published": published,
        "thumbnail": thumb_url,
        "url": f"https://www.youtube.com/watch?v={vid}"
    })

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({
    "updated": datetime.now(timezone.utc).isoformat(),
    "videos": videos
}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"updated {OUT} with {len(videos)} videos")
