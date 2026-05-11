"""
CHIEF — build a permanent .sto setup archive YOU own forever.

WHY: Coach Dave Delta deletes/rotates setup packs each season. If you cancel
your subscription or the season expires, the in-app library evaporates. This
script extracts every .sto file from every source on your machine (Coach Dave
folders, your downloads, zip archives in Desktop\\Seteps, loose files anywhere)
and copies them into a permanent library at:

    %USERPROFILE%\\Documents\\ChiefSetupLibrary\\

organised by car code so they're easy to find. From there CHIEF can:
    - Copy them into iRacing's setups folder for use in-game
    - Parse + push the values to chiefracing.com for AI tuning
    - Back up the raw bytes to the cloud (separate script)

Run:
    python chief-archive-setups.py               # dry-run: see what would happen
    python chief-archive-setups.py --copy        # build the archive
    python chief-archive-setups.py --copy --add C:\\Path\\To\\More\\Setups
                                                   # include a custom extra folder
"""
import argparse
import datetime
import hashlib
import os
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path


HOME          = Path.home()
DOCS          = HOME / "Documents"
DESKTOP       = HOME / "Desktop"
APPDATA       = Path(os.environ.get("APPDATA",      HOME / "AppData" / "Roaming"))
LOCAL_APPDATA = Path(os.environ.get("LOCALAPPDATA", HOME / "AppData" / "Local"))
ARCHIVE_ROOT  = DOCS / "ChiefSetupLibrary"

# Same wide net used by vendors.py + the user's Seteps downloads folder.
DEFAULT_SOURCES = [
    DOCS / "Coach Dave Academy",
    DOCS / "CoachDaveDelta",
    DOCS / "Coach Dave Delta",
    DOCS / "Delta",
    APPDATA / "Coach Dave Delta",
    APPDATA / "coach-dave-delta",
    APPDATA / "CoachDaveDelta",
    APPDATA / "Coach Dave Academy",
    APPDATA / "delta",
    APPDATA / "Delta",
    LOCAL_APPDATA / "Coach Dave Delta",
    LOCAL_APPDATA / "CoachDaveDelta",
    DESKTOP / "Seteps",       # user's manual downloads
    DESKTOP / "Setups",
    DESKTOP / "Setups Backup",
    DOCS / "iRacing" / "setups",
]
# Dynamic discovery of any AppData/Documents folder with coach/delta in the name
for parent in (APPDATA, LOCAL_APPDATA, DOCS, DESKTOP):
    if parent.exists():
        try:
            for sub in parent.iterdir():
                if sub.is_dir():
                    n = sub.name.lower()
                    if "coach" in n or "delta" in n or "setup" in n:
                        if sub not in DEFAULT_SOURCES:
                            DEFAULT_SOURCES.append(sub)
        except Exception: pass


# ---- car-code → folder mapping (kept in sync with chief-import-setups.py) ----
CAR_CODE_MAP = {
    "LMST": "latemodelstock", "LMSC": "latemodelstock", "LMS": "latemodelstock",
    "LMODS": "latemodelstock",
    "GT3": "gt3-generic", "GT4": "gt4-generic", "LMP1": "lmp1", "LMP2": "lmp2",
    "LMP3": "ligierjsp320", "TCR": "tcr-generic", "MX5": "mx5-2016",
    "BMWM4": "bmwm4gt3", "F4": "formula4", "F3": "fr20", "INDY": "dallarair18",
    "F1": "rb18", "NSC": "nascar-cup", "TRUCK": "stockcars-silverado",
    "USAC": "usac-silvercrown",
}
# Many community packs prefix with NASCAR series / track codes — try to coax a car-ish name
TRACK_CODES = {
    "KERN", "FIFL", "FFS", "HICKORY", "NWS", "KERN", "LANIER", "MART", "MARTINSVILLE",
    "NASH", "NASHVILLE", "SNMP", "SOBO", "AUTOCLUB", "BRISTOL", "COPEN", "LAGN",
    "LIME", "ATLM", "WGI", "SEBR", "DAY", "SOUTHERNNAT", "5FLAGS",
}


def slug(s):
    s = (s or "").strip()
    s = re.sub(r"[^a-zA-Z0-9 _-]", "", s)
    return s.replace(" ", "-").lower() or "misc"


def guess_car_from_filename(name):
    """Try to extract a car code from various pack naming conventions.

    Recognises:
        CDA 26S1 LMST KERN R01.sto           → LMST
        PRS_LMS_5Flags_Q_202S1_V4.sto        → LMS
        RKM-LMSC-SouthernNat-26S2-Q.sto      → LMSC
        LMSC FFS 25S4.zip                    → LMSC (zip archive name)
    """
    tokens = re.split(r"[\s_\-.]+", name)
    for t in tokens:
        T = t.upper().strip()
        if T in CAR_CODE_MAP: return T
    return None


def find_sources_for_sto_extraction(extra_dirs):
    out = list(DEFAULT_SOURCES) + [Path(d) for d in (extra_dirs or [])]
    return [d for d in out if d.exists()]


def gather_files(sources):
    """Yield (path_to_sto, source_context) — including .sto inside .zip archives.

    For zipped packs we extract to a temp dir and yield each .sto path therein.
    """
    tempdir = Path(tempfile.mkdtemp(prefix="chief-archive-"))
    extracted = 0
    for root in sources:
        # Direct .sto files
        for f in root.rglob("*.sto"):
            yield f, root, False  # not from a zip
        # .zip archives that may contain .sto files
        for z in root.rglob("*.zip"):
            try:
                with zipfile.ZipFile(z) as zf:
                    sto_members = [m for m in zf.namelist() if m.lower().endswith(".sto")]
                    if not sto_members: continue
                    # Extract just the .sto members under tempdir/<zipname>/
                    target = tempdir / z.stem
                    target.mkdir(parents=True, exist_ok=True)
                    for m in sto_members:
                        # Sanitize the inner path so we don't blow up the temp tree
                        outname = Path(m).name
                        with zf.open(m) as src, open(target / outname, "wb") as dst:
                            shutil.copyfileobj(src, dst)
                        extracted += 1
                        yield (target / outname), z, True
            except Exception as e:
                print(f"  [warn] zip {z.name} unreadable: {e}")
    if extracted:
        print(f"  [info] extracted {extracted} .sto files from zip archives into {tempdir}")


def sha1(path: Path) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def archive_one(src: Path, archive_root: Path, copy: bool, overwrite: bool):
    """Copy/link a single .sto into the archive. Returns (action, target_path)."""
    car_code = guess_car_from_filename(src.name) or "unknown-car"
    car_dir  = archive_root / car_code
    target   = car_dir / src.name

    if target.exists() and not overwrite:
        # If files differ by hash, store a numbered variant
        try:
            if sha1(target) == sha1(src):
                return ("identical-already", target)
        except Exception:
            pass
        # Different content — keep both
        i = 2
        while True:
            alt = car_dir / (target.stem + f"__v{i}" + target.suffix)
            if not alt.exists():
                target = alt
                break
            i += 1

    if not copy:
        return ("would-copy", target)
    car_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, target)
    return ("copied", target)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--copy", action="store_true", help="Actually build the archive (default: dry-run)")
    ap.add_argument("--overwrite", action="store_true", help="Replace existing files (default: keep both)")
    ap.add_argument("--add", action="append", default=[], help="Extra source folder to scan (can repeat)")
    ap.add_argument("--archive", default=str(ARCHIVE_ROOT), help="Override archive location")
    args = ap.parse_args()

    archive_root = Path(args.archive)
    sources = find_sources_for_sto_extraction(args.add)
    print(f"=== CHIEF Setup Archive ===")
    print(f"  Archive location: {archive_root}")
    print(f"  Scanning {len(sources)} source folders:")
    for s in sources:
        print(f"    - {s}")
    print()

    seen = []
    for src, ctx, from_zip in gather_files(sources):
        seen.append((src, ctx, from_zip))
    if not seen:
        print("  No .sto files found in any source. Nothing to archive.")
        return

    print(f"  Found {len(seen)} .sto candidates")
    if not args.copy:
        print("  (Dry-run only — re-run with --copy to actually build the archive)\n")

    summary = {"copied": 0, "would-copy": 0, "identical-already": 0}
    by_car = {}
    for src, ctx, from_zip in seen:
        action, tgt = archive_one(src, archive_root, args.copy, args.overwrite)
        summary[action] = summary.get(action, 0) + 1
        by_car.setdefault(tgt.parent.name, 0)
        by_car[tgt.parent.name] += 1
        zip_label = f"  [from {ctx.name}]" if from_zip else ""
        if args.copy or action != "would-copy":
            print(f"  [{action:<18}] {src.name:<50} → {tgt}{zip_label}")

    print()
    print("=== Summary ===")
    for k, v in summary.items():
        print(f"  {k:<18}  {v}")
    print()
    print("Archive contents by car folder:")
    for car, count in sorted(by_car.items(), key=lambda x: -x[1]):
        print(f"  {car:<20}  {count}")

    if args.copy:
        # Write a manifest with dates so future runs can audit
        manifest = archive_root / "manifest.txt"
        archive_root.mkdir(parents=True, exist_ok=True)
        with open(manifest, "a", encoding="utf-8") as fh:
            fh.write(f"--- Run {datetime.datetime.now().isoformat()} ---\n")
            for src, ctx, from_zip in seen:
                fh.write(f"  {src.name}  (from {ctx})\n")
        print(f"\nManifest appended to: {manifest}")
        print(f"\nNext: run chief-import-setups.py to copy these into iRacing's setups folder,")
        print(f"      or chief-push-setups.py to parse + push the values to chiefracing.com.")


if __name__ == "__main__":
    main()
