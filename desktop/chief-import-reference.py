"""
CHIEF Reference Pack Importer.

Promotes a captured lap (or your fastest auto-capture lap) into a reusable
reference pack stored at:
    ~/Documents/ChiefAutoCapture/references/<car>__<track>__<tag>.json

Usage examples:

    # Interactive: list every captured lap, pick one to promote
    python chief-import-reference.py

    # Promote a specific trace file with a driver name + source tag
    python chief-import-reference.py --file lap_1715300000_l5.json --driver "Ben" --source "personal-best"

    # Promote the FASTEST captured lap for each car/track combo (bulk seed)
    python chief-import-reference.py --auto-seed

The viewer (chief-viewer.html) will auto-pick these up; live-chief.py will use
them as the reference for in-ear coaching when CHIEF_USE_PRO_REFERENCE=1.
"""
import argparse
import json
import re
import sys
from pathlib import Path

HOME = Path.home()
TRACE_DIR = HOME / "Documents" / "ChiefAutoCapture" / "traces"
SESSION_DIR = HOME / "Documents" / "ChiefAutoCapture"
REFERENCE_DIR = HOME / "Documents" / "ChiefAutoCapture" / "references"


def slug(s):
    s = (s or "").strip()
    s = re.sub(r"[^a-zA-Z0-9 _-]", "", s)
    s = s.replace(" ", "-").replace("_", "-")
    return s.lower() or "unknown"


def load_trace(file_path):
    return json.loads(file_path.read_text(encoding="utf-8"))


def find_session_for_trace(trace_payload):
    """Try to match a captured session that overlaps this trace by timestamp/lap."""
    if not SESSION_DIR.exists():
        return None
    ts = trace_payload.get("ts", "")
    if not ts:
        return None
    candidates = []
    for f in SESSION_DIR.glob("sess_*.json"):
        try:
            s = json.loads(f.read_text(encoding="utf-8"))
            started = s.get("started_at", "")
            ended   = s.get("ended_at", "")
            if started <= ts <= (ended or "9999"):
                candidates.append(s)
        except Exception:
            continue
    return candidates[0] if candidates else None


def list_traces_with_meta():
    """Return [(trace_file, payload, lap_time, car, track)] sorted by lap_time."""
    if not TRACE_DIR.exists():
        return []
    out = []
    for f in TRACE_DIR.glob("lap_*.json"):
        try:
            p = load_trace(f)
        except Exception:
            continue
        car, track, track_config = "", "", ""
        # Trace itself may have track now (added in latest live-chief.py)
        track = p.get("track") or ""
        track_config = p.get("track_config") or ""
        # Look up car from the matching session
        sess = find_session_for_trace(p)
        if sess:
            car = sess.get("car", "") or car
            track = track or sess.get("track", "")
            track_config = track_config or sess.get("track_layout", "")
        out.append({
            "file": f.name, "path": f, "payload": p,
            "lap_time": p.get("lap_time"),
            "car": car, "track": track, "track_config": track_config,
            "samples": len(p.get("samples") or []),
        })
    out.sort(key=lambda r: (r["lap_time"] or 1e9))
    return out


def promote(trace_meta, driver, source, tag=None, force=False):
    """Write a reference pack from a lap trace."""
    REFERENCE_DIR.mkdir(parents=True, exist_ok=True)
    p = trace_meta["payload"]
    car = trace_meta["car"] or "unknown-car"
    track = trace_meta["track"] or "unknown-track"
    config = trace_meta["track_config"] or ""
    file_tag = tag or slug(driver) or "ref"
    filename = f"{slug(car)}__{slug(track)}{('-' + slug(config)) if config else ''}__{file_tag}.json"
    out_path = REFERENCE_DIR / filename
    if out_path.exists() and not force:
        print(f"  [skip] {filename} already exists (use --force to overwrite)")
        return None
    pack = {
        "car": car,
        "track": track,
        "track_config": config,
        "lap_time": p.get("lap_time"),
        "driver": driver or "",
        "source": source or "personal-best",
        "imported_from": trace_meta["file"],
        "samples": p.get("samples") or [],
    }
    out_path.write_text(json.dumps(pack, indent=2))
    print(f"  [ok]   {filename}  ({len(pack['samples'])} samples, {pack['lap_time']:.3f}s)" if pack['lap_time'] else f"  [ok]   {filename}")
    return out_path


def auto_seed(driver, force=False):
    """Promote the fastest lap for every (car, track) combination."""
    traces = list_traces_with_meta()
    best_per_combo = {}
    for t in traces:
        if not t["lap_time"] or t["lap_time"] <= 0:
            continue
        key = (t["car"], t["track"], t["track_config"])
        cur = best_per_combo.get(key)
        if cur is None or t["lap_time"] < cur["lap_time"]:
            best_per_combo[key] = t
    if not best_per_combo:
        print("No usable traces found in", TRACE_DIR)
        return
    print(f"Auto-seeding {len(best_per_combo)} reference pack(s) into {REFERENCE_DIR}")
    for t in best_per_combo.values():
        promote(t, driver=driver, source="personal-best", tag="my-best", force=force)


def interactive_pick():
    traces = list_traces_with_meta()
    if not traces:
        print("No captured laps found in", TRACE_DIR)
        return
    print("Captured laps (fastest first):\n")
    for i, t in enumerate(traces[:30]):
        lt = f"{t['lap_time']:.3f}s" if t["lap_time"] else "—"
        meta = f"{t['car'] or '?'} @ {t['track'] or '?'}{(' / ' + t['track_config']) if t['track_config'] else ''}"
        print(f"  [{i:2}] {lt:>10}  {meta:<60}  {t['file']}")
    print()
    raw = input("Pick a number to promote (or press Enter to cancel): ").strip()
    if not raw:
        print("Cancelled.")
        return
    try:
        idx = int(raw)
        chosen = traces[idx]
    except Exception:
        print("Invalid selection.")
        return
    driver = input(f"Driver name [Ben]: ").strip() or "Ben"
    source = input(f"Source (personal-best / pro-pack / shared) [personal-best]: ").strip() or "personal-best"
    tag = input(f"File tag (optional, e.g. 'qualifying-banker'): ").strip() or None
    promote(chosen, driver=driver, source=source, tag=tag, force=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", help="Promote a specific trace by filename (under traces/)")
    ap.add_argument("--driver", default="Ben")
    ap.add_argument("--source", default="personal-best")
    ap.add_argument("--tag", default=None, help="Filename tag (defaults to driver slug)")
    ap.add_argument("--auto-seed", action="store_true",
                    help="Promote fastest lap for each car/track combo")
    ap.add_argument("--force", action="store_true", help="Overwrite existing reference packs")
    args = ap.parse_args()

    if args.auto_seed:
        auto_seed(driver=args.driver, force=args.force)
        return

    if args.file:
        traces = {t["file"]: t for t in list_traces_with_meta()}
        t = traces.get(args.file)
        if not t:
            print(f"Trace not found: {args.file}")
            sys.exit(1)
        promote(t, driver=args.driver, source=args.source, tag=args.tag, force=args.force)
        return

    interactive_pick()


if __name__ == "__main__":
    main()
