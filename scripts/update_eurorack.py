#!/usr/bin/env python3
import json, subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "eurorack.json"
PINNED = "D1vcKCcR45c"
VIDEO_IDS = [
    "D1vcKCcR45c",
    "ZWYdzsbL-xg",
    "oHYa_mMaobY",
    "JDyDPqJhlFg",
    "nzgbWgcIlr0",
    "QOxmYW5WWm8",
    "KpNw1A5Fhho",
    "u8nVp5G2GmM",
    "v8XPCrcu4XE",
    "1M8WjiWImYg",
    "tgF5oFYsyww",
    "044viHBGBVA",
    "jRqO4o9Shxo",
    "mZ5cQ7h1aTc",
    "KccBZ-W1nYM",
]

def old_map():
    if not OUT.exists():
        return {}
    try:
        data=json.loads(OUT.read_text(encoding="utf-8"))
        return {v.get("id"):v for v in data.get("videos",[])}
    except Exception:
        return {}

def fetch_video(vid):
    url=f"https://www.youtube.com/watch?v={vid}"
    cmd=[
        "yt-dlp",
        "--skip-download",
        "--dump-single-json",
        "--no-warnings",
        "--ignore-errors",
        "--extractor-args","youtube:lang=it",
        url
    ]
    p=subprocess.run(cmd,capture_output=True,text=True,timeout=120)
    if p.returncode!=0 or not p.stdout.strip():
        raise RuntimeError((p.stderr or "no metadata").strip())
    raw=json.loads(p.stdout)
    return {
        "id":vid,
        "title":raw.get("title") or "Video Eurorack",
        "url":url,
        "thumbnail":f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
        "duration":raw.get("duration"),
        "availability":raw.get("availability"),
        "channel":raw.get("channel") or "Exsiderurgica"
    }

old=old_map()
videos=[]
seen=set()
for vid in VIDEO_IDS:
    if vid in seen: continue
    seen.add(vid)
    try:
        item=fetch_video(vid)
        print(f"{vid}: {item['title']}")
    except Exception as exc:
        print(f"{vid}: fallback ({exc})")
        item=old.get(vid) or {
            "id":vid,
            "title":"Video Eurorack",
            "url":f"https://www.youtube.com/watch?v={vid}",
            "thumbnail":f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
            "duration":None,
            "availability":None,
            "channel":"Exsiderurgica"
        }
    videos.append(item)

OUT.write_text(json.dumps({
    "updated":datetime.now(timezone.utc).isoformat(),
    "pinned":PINNED,
    "videos":videos
},ensure_ascii=False,indent=2),encoding="utf-8")
