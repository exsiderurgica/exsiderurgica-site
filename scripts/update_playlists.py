#!/usr/bin/env python3
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "playlists.json"

PLAYLISTS = [
    {
        "id": "PL18hYON4DekjwdE7ua3AUlc9kEwFcg8Tw",
        "members": False,
        "label": "PLAYLIST",
        "display_title": None,
    },
    {
        "id": "PL18hYON4DekgFtzn_ob3hVcdqwYiH07TO",
        "members": False,
        "label": "PLAYLIST",
        "display_title": None,
    },
    {
        "id": "PL18hYON4DekgdGXbjT2x5kjYo2Pgeh9Te",
        "members": True,
        "label": "ABBONAMENTO",
        "display_title": "Abbonamento",
    },
]

def previous_catalog():
    if not OUT.exists():
        return {}
    try:
        data = json.loads(OUT.read_text(encoding="utf-8"))
        return {p.get("id"): p for p in data.get("playlists", [])}
    except Exception:
        return {}

def extract_playlist(pid):
    url = f"https://www.youtube.com/playlist?list={pid}"
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--dump-single-json",
        "--ignore-errors",
        "--no-warnings",
        "--extractor-args",
        "youtube:lang=it",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if result.returncode != 0 or not result.stdout.strip():
        raise RuntimeError((result.stderr or "yt-dlp returned no data").strip())
    return json.loads(result.stdout)

def normalize_entry(entry, members):
    vid = entry.get("id") or entry.get("url")
    if not vid or len(str(vid)) > 24:
        return None
    vid = str(vid)
    title = entry.get("title") or "Video YouTube"
    availability = entry.get("availability")
    return {
        "id": vid,
        "title": title,
        "url": f"https://www.youtube.com/watch?v={vid}",
        "thumbnail": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
        "duration": entry.get("duration"),
        "availability": availability,
        "members": bool(members),
    }

old = previous_catalog()
catalog = []

for spec in PLAYLISTS:
    pid = spec["id"]
    url = f"https://www.youtube.com/playlist?list={pid}"
    try:
        raw = extract_playlist(pid)
        videos = []
        seen = set()
        for entry in raw.get("entries") or []:
            if not entry:
                continue
            item = normalize_entry(entry, spec["members"])
            if not item or item["id"] in seen:
                continue
            seen.add(item["id"])
            videos.append(item)

        extracted_title = raw.get("title") or raw.get("playlist_title")
        title = spec["display_title"] or extracted_title or old.get(pid, {}).get("title") or "Playlist YouTube"
        catalog.append({
            "id": pid,
            "title": title,
            "label": spec["label"],
            "members": spec["members"],
            "url": url,
            "channel": raw.get("channel") or raw.get("uploader") or "Exsiderurgica",
            "videos": videos,
        })
        print(f"{pid}: {len(videos)} video")
    except Exception as exc:
        print(f"{pid}: errore: {exc}")
        fallback = old.get(pid)
        if fallback:
            catalog.append(fallback)
        else:
            catalog.append({
                "id": pid,
                "title": spec["display_title"] or "Playlist YouTube",
                "label": spec["label"],
                "members": spec["members"],
                "url": url,
                "videos": [],
                "error": str(exc)[:240],
            })

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({
    "updated": datetime.now(timezone.utc).isoformat(),
    "playlists": catalog,
}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"catalogo scritto in {OUT}")
