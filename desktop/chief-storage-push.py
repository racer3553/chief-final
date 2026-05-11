"""
CHIEF — upload raw .sto BYTES to Supabase Storage for permanent cloud backup.

Companion to chief-push-setups.py:
    chief-push-setups.py  → parsed values (camber, toe, etc.)  → sim_setups_parsed table
    chief-storage-push.py → raw file bytes                     → setup-files bucket

Why: even if you cancel Coach Dave AND your local PC dies, this lets you re-
download every .sto file you ever owned from chiefracing.com/dashboard/setups.

Reads:  Documents\\ChiefSetupLibrary\\**\\*.sto  (built by chief-archive-setups.py)
Posts:  POST /api/setups/upload-blob (multipart)

Usage:
    python chief-storage-push.py            # only files not yet uploaded
    python chief-storage-push.py --all      # re-upload everything
    python chief-storage-push.py --dry-run  # show what would be uploaded
"""
import argparse, datetime, hashlib, os, sys
from pathlib import Path

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "requests"])
    import requests

CHIEF_API       = os.environ.get("CHIEF_API_STORAGE",       "https://chiefracing.com/api/setups/upload-blob")
CHIEF_API_LOCAL = os.environ.get("CHIEF_API_STORAGE_LOCAL", "http://localhost:3000/api/setups/upload-blob")
CHIEF_USER_EMAIL = os.environ.get("CHIEF_USER_EMAIL", "racer3553@gmail.com")
ARCHIVE_ROOT     = Path.home() / "Documents" / "ChiefSetupLibrary"
PUSHED_DIR       = Path.home() / "Documents" / "ChiefAutoCapture" / ".uploaded_blobs"
PUSH_LOG         = Path.home() / "Desktop" / "chief-autocapture.log"
PUSHED_DIR.mkdir(parents=True, exist_ok=True)


def plog(msg):
    line = f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    try:
        with open(PUSH_LOG, "a", encoding="utf-8") as fh: fh.write(line + "\n")
    except Exception: pass


def sha1_of(path: Path) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def already_uploaded(p: Path) -> bool:
    marker = PUSHED_DIR / (p.name + ".marker")
    if not marker.exists(): return False
    try:
        # Marker stores the sha1 at time of upload. If file changed, re-upload.
        return marker.read_text().strip() == sha1_of(p)
    except Exception:
        return marker.exists()


def mark_uploaded(p: Path):
    try:
        (PUSHED_DIR / (p.name + ".marker")).write_text(sha1_of(p))
    except Exception: pass


def upload_one(path: Path, urls) -> tuple[bool, list[str]]:
    attempts = []
    sha = sha1_of(path)
    for url in urls:
        try:
            with open(path, "rb") as f:
                files = {"file": (path.name, f, "application/octet-stream")}
                data  = {"filename": path.name, "email": CHIEF_USER_EMAIL, "sha1": sha}
                r = requests.post(url, files=files, data=data, timeout=30)
            snippet = (r.text or "")[:200].replace("\n", " ")
            attempts.append(f"{url} → HTTP {r.status_code} {snippet}")
            if r.status_code in (200, 201):
                return True, attempts
        except Exception as e:
            attempts.append(f"{url} → {type(e).__name__}: {e}")
    return False, attempts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="Re-upload even files marked as already uploaded")
    ap.add_argument("--dry-run", action="store_true", help="Show what would be uploaded, send nothing")
    ap.add_argument("--archive", default=str(ARCHIVE_ROOT), help="Override archive root")
    ap.add_argument("--limit", type=int, default=0, help="Max files to upload this run (0=no limit)")
    args = ap.parse_args()

    archive = Path(args.archive)
    plog("=== CHIEF storage push starting ===")
    plog(f"  archive:   {archive}")
    plog(f"  endpoints: [{CHIEF_API}, {CHIEF_API_LOCAL}]")
    plog(f"  email:     {CHIEF_USER_EMAIL}")

    if not archive.exists():
        plog(f"Archive not found. Run CHIEF-ARCHIVE-SETUPS.bat first.")
        return

    files = sorted(archive.rglob("*.sto"))
    if not files:
        plog("No .sto files in archive. Nothing to upload.")
        return
    plog(f"  found {len(files)} .sto files in archive")

    urls = [CHIEF_API, CHIEF_API_LOCAL]
    uploaded = 0; skipped = 0; failed = 0
    for f in files:
        if args.limit and uploaded >= args.limit:
            plog(f"  hit --limit {args.limit}, stopping")
            break
        if not args.all and already_uploaded(f):
            skipped += 1
            continue
        if args.dry_run:
            plog(f"  DRY  {f.name}  ({f.stat().st_size} bytes)")
            continue
        ok, attempts = upload_one(f, urls)
        if ok:
            mark_uploaded(f)
            uploaded += 1
            if uploaded % 25 == 0:
                plog(f"  ... {uploaded} uploaded so far")
            else:
                plog(f"  UP {f.name}")
        else:
            failed += 1
            plog(f"  FAIL {f.name}")
            for a in attempts: plog(f"    {a}")

    plog(f"=== Done. uploaded={uploaded} skipped(already)={skipped} failed={failed} ===")


if __name__ == "__main__":
    main()
