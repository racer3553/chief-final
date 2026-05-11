"""
CHIEF — import Coach Dave Delta .sto setups into iRacing without Delta running.

Scans Delta's known folders for .sto files and copies each into the matching
iRacing setup folder (Documents\\iRacing\\setups\\<car>\\) so they show up in
the in-game garage like any other setup. The Coach Dave subscription you paid
for stays useful even with Delta autostart disabled.

Smart filename detection:
    CDA 26S1 LMST KERN R01.sto
      └─┬─┘ └┬┘ └─┬┘ └─┬┘ └┬┘
        |    |   |   |   └ R = race, Q = qualifying, P = practice
        |    |   |   └ track code (KERN, FIFL, LIME, etc.)
        |    |   └ car code (LMST, GT3, LMP3, etc.)
        |    └ season (26S1 = 2026 Season 1)
        └ Coach Dave Academy prefix

Run:
    python chief-import-setups.py           # dry-run report only
    python chief-import-setups.py --copy    # actually copy files
    python chief-import-setups.py --copy --flat   # all files in one bucket folder

Bucket mode (--flat) is the safest if you're not sure your car-code mapping
is correct — drops everything into Documents\\iRacing\\setups\\_chief-imports\\
which you can browse in-game.
"""
import argparse
import os
import re
import shutil
import sys
from pathlib import Path


HOME = Path.home()
DOCUMENTS = HOME / "Documents"
APPDATA       = Path(os.environ.get("APPDATA",      HOME / "AppData" / "Roaming"))
LOCAL_APPDATA = Path(os.environ.get("LOCALAPPDATA", HOME / "AppData" / "Local"))
IRACING_SETUPS_ROOT = DOCUMENTS / "iRacing" / "setups"
FALLBACK_BUCKET = IRACING_SETUPS_ROOT / "_chief-imports"

# Mirrors vendors.py (the chief-autocapture daemon's scanner). Coach Dave Delta
# v5+ stores files in AppData\Roaming\Coach Dave Delta (Electron app pattern).
DESKTOP = HOME / "Desktop"
SOURCE_DIRS = [
    # Permanent archive built by chief-archive-setups.py (always check first)
    DOCUMENTS / "ChiefSetupLibrary",
    DOCUMENTS / "Coach Dave Academy",
    DOCUMENTS / "CoachDaveDelta",
    DOCUMENTS / "Coach Dave Delta",
    DOCUMENTS / "Delta",
    APPDATA / "Coach Dave Delta",
    APPDATA / "coach-dave-delta",
    APPDATA / "CoachDaveDelta",
    APPDATA / "Coach Dave Academy",
    APPDATA / "delta",
    APPDATA / "@coachdaveacademy",
    APPDATA / "Delta",
    APPDATA / "delta-app",
    LOCAL_APPDATA / "Coach Dave Delta",
    LOCAL_APPDATA / "coach-dave-delta",
    LOCAL_APPDATA / "CoachDaveDelta",
    LOCAL_APPDATA / "Coach Dave Academy",
    LOCAL_APPDATA / "Programs" / "Coach Dave Delta",
    LOCAL_APPDATA / "Programs" / "coach-dave-delta",
    # User's manual downloads of CDA / other packs
    DESKTOP / "Seteps",
    DESKTOP / "Setups",
    DESKTOP / "Setups Backup",
]
# Dynamic discovery: any AppData subfolder with "coach" or "delta" in the name
for _parent in (APPDATA, LOCAL_APPDATA):
    if _parent.exists():
        try:
            for _sub in _parent.iterdir():
                if _sub.is_dir() and ("coach" in _sub.name.lower() or "delta" in _sub.name.lower()):
                    if _sub not in SOURCE_DIRS:
                        SOURCE_DIRS.append(_sub)
        except Exception:
            pass

# Map Coach Dave car codes to iRacing's `setups/<carfolder>/` directory names.
# Expand this as you buy more car packs — comments next to each one show the
# CDA package name so you can verify.
CAR_CODE_MAP = {
    # Stock / Oval
    "LMST":  "latemodelstock",         # Late Model Stock
    "LMODS": "latemodelstock",         # Some packs label modified late models the same
    "USAC":  "usacsilvercrownmodified",
    "NSC":   "stockcars_chevyss",      # NASCAR Cup Chevy SS placeholder
    "TRUCK": "stockcars_silverado",
    # Road
    "GT3":   "ferrari296gt3",          # GT3 fallback — many GT3 cars; user edits per-pack
    "GT4":   "mercedesamggt4",
    "LMP1":  "porscherhyperhybrid",
    "LMP2":  "dallarap217",
    "LMP3":  "ligierjsp320",
    "TCR":   "audirslmstcr",
    "MX5":   "mx52016",
    "BMWM4": "bmwm4gt3",
    # Open wheel
    "F4":    "formula4",
    "F3":    "fr20",
    "INDY":  "dallarair18",
    "F1":    "rb18",
}

# Map Coach Dave track codes → iRacing folder names (if the car folder is sub-
# split by track). iRacing actually splits setups by CAR only, so this is just
# kept as metadata for the report.
TRACK_CODE_NAMES = {
    "KERN":  "Kern County",
    "FIFL":  "Five Flags",
    "LIME":  "Lime Rock",
    "ATLM":  "Atlanta Motor Speedway",
    "WGI":   "Watkins Glen",
    "SEBR":  "Sebring",
    "DAY":   "Daytona",
    "LAGN":  "Laguna Seca",
    "LMNR":  "Lemont",
}


CDA_FILENAME_RE = re.compile(
    r"^CDA\s+(\d\d)S(\d)\s+([A-Z0-9]+)\s+([A-Z0-9]+)\s+([PQR])(\d+)",
    re.IGNORECASE,
)


def parse_cda_filename(name):
    """Return dict with season, car_code, track_code, type, version — or None."""
    m = CDA_FILENAME_RE.match(name)
    if not m:
        return None
    yr, season, car_code, track_code, type_letter, version = m.groups()
    return {
        "season":     f"20{yr} Season {season}",
        "car_code":   car_code.upper(),
        "track_code": track_code.upper(),
        "type":       {"P": "Practice", "Q": "Qualifying", "R": "Race"}[type_letter.upper()],
        "version":    int(version),
    }


def find_sto_files():
    """Return list of (path, parsed_meta_or_None) for every .sto we find."""
    out = []
    for d in SOURCE_DIRS:
        if not d.exists(): continue
        for f in d.rglob("*.sto"):
            meta = parse_cda_filename(f.name)
            out.append((f, meta))
    return out


def target_for(meta, flat):
    """Decide which iRacing folder this .sto should land in."""
    if flat or not meta:
        return FALLBACK_BUCKET
    car_folder = CAR_CODE_MAP.get(meta["car_code"])
    if not car_folder:
        return FALLBACK_BUCKET   # unknown car code → bucket
    return IRACING_SETUPS_ROOT / car_folder


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--copy", action="store_true", help="Actually copy files (otherwise dry-run)")
    ap.add_argument("--flat", action="store_true", help="Drop everything into _chief-imports bucket folder instead of mapped car folders")
    ap.add_argument("--overwrite", action="store_true", help="Replace existing target file if it already exists")
    args = ap.parse_args()

    if not IRACING_SETUPS_ROOT.exists():
        print(f"WARN: iRacing setups root does not exist: {IRACING_SETUPS_ROOT}")
        print(f"      iRacing creates this on first install. If you're sure iRacing")
        print(f"      is installed, edit IRACING_SETUPS_ROOT at the top of this script.")
        # Continue anyway — we'll create folders on copy

    files = find_sto_files()
    if not files:
        print("No .sto files found in any known Coach Dave folder. Folders checked:")
        for d in SOURCE_DIRS:
            print(f"  - {d}  ({'exists' if d.exists() else 'missing'})")
        return

    print(f"Found {len(files)} .sto files. Plan:")
    print("=" * 76)
    plans = []
    for src, meta in files:
        tgt_dir = target_for(meta, args.flat)
        tgt = tgt_dir / src.name
        car_label = f"{meta['car_code']}→{CAR_CODE_MAP.get(meta['car_code']) or '?'}" if meta else "unknown"
        track_label = TRACK_CODE_NAMES.get(meta["track_code"], meta["track_code"]) if meta else "?"
        print(f"  {src.name:<40}  [{car_label}]  track={track_label}")
        print(f"      → {tgt}")
        plans.append((src, tgt))

    print("=" * 76)
    print(f"Total: {len(plans)} files.")

    if not args.copy:
        print("\nDry-run only. Re-run with --copy to actually import.")
        print("Tip: add --flat to dump everything in _chief-imports (easier to find in-game).")
        return

    copied = 0; skipped = 0; failed = 0
    for src, tgt in plans:
        try:
            tgt.parent.mkdir(parents=True, exist_ok=True)
            if tgt.exists() and not args.overwrite:
                print(f"  [skip] {tgt} already exists (use --overwrite to replace)")
                skipped += 1
                continue
            shutil.copy2(src, tgt)
            print(f"  [ok]   {src.name} → {tgt}")
            copied += 1
        except Exception as e:
            print(f"  [fail] {src.name}: {e}")
            failed += 1

    print(f"\nDone. copied={copied} skipped={skipped} failed={failed}")
    print(f"\nIn-game: open iRacing → Garage → it will see new setups in the matching car's folder")
    print(f"(or under _chief-imports for un-mapped ones — switch the car folder there manually).")


if __name__ == "__main__":
    main()
