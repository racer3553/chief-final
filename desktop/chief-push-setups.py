"""
CHIEF — push every parsed Coach Dave setup to chiefracing.com.

Combines:
    chief-parse-setups.parse_sto_file (extracts numeric setup params)
    chief-import-setups.parse_cda_filename (decodes CDA filename)

Then POSTs each file to /api/setups/auto-capture.

Usage:
    python chief-push-setups.py            # push only files not yet pushed
    python chief-push-setups.py --all      # re-push everything
    python chief-push-setups.py --dry-run  # parse + print what would be sent
"""
import argparse, datetime, json, os, sys
from pathlib import Path

# Load hyphenated sibling modules via importlib (Python's import statement
# can't handle hyphens in filenames).
import importlib.util
HERE = Path(__file__).parent
def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)  # type: ignore
    spec.loader.exec_module(mod)                  # type: ignore
    return mod
_parse = _load("chief_parse_setups",  HERE / "chief-parse-setups.py")
_imp   = _load("chief_import_setups", HERE / "chief-import-setups.py")
parse_sto_file     = _parse.parse_sto_file
SOURCE_DIRS        = _parse.SOURCE_DIRS
parse_cda_filename = _imp.parse_cda_filename
CAR_CODE_MAP       = _imp.CAR_CODE_MAP
TRACK_CODE_NAMES   = _imp.TRACK_CODE_NAMES

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "requests"])
    import requests

CHIEF_API = os.environ.get("CHIEF_API_SETUPS",       "https://chiefracing.com/api/setups/auto-capture")
CHIEF_API_LOCAL = os.environ.get("CHIEF_API_SETUPS_LOCAL", "http://localhost:3000/api/setups/auto-capture")
CHIEF_USER_EMAIL = os.environ.get("CHIEF_USER_EMAIL", "racer3553@gmail.com")
PUSH_LOG = Path.home() / "Desktop" / "chief-autocapture.log"
PUSHED_DIR = Path.home() / "Documents" / "ChiefAutoCapture" / ".pushed_setups"
PUSHED_DIR.mkdir(parents=True, exist_ok=True)


def plog(msg):
    line = f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    try:
        with open(PUSH_LOG, "a", encoding="utf-8") as fh: fh.write(line + "\n")
    except Exception: pass


def sanitize(obj):
    if isinstance(obj, str):
        return "".join(c for c in obj if c == "\t" or c == "\n" or c == "\r" or ord(c) >= 0x20)
    if isinstance(obj, dict): return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list): return [sanitize(v) for v in obj]
    return obj


def find_setups():
    out = []
    for d in SOURCE_DIRS:
        if d.exists():
            out.extend(d.rglob("*.sto"))
    return out


def already_pushed(p):
    return (PUSHED_DIR / (p.name + ".marker")).exists()


def mark_pushed(p):
    try: (PUSHED_DIR / (p.name + ".marker")).write_text(datetime.datetime.now().isoformat())
    except Exception: pass


def build_payload(path):
    parsed = parse_sto_file(path)
    meta = parse_cda_filename(path.name) or {}
    car_name = CAR_CODE_MAP.get(meta.get("car_code", ""), "")
    track_name = TRACK_CODE_NAMES.get(meta.get("track_code", ""), meta.get("track_code", ""))
    # Strip the private "_path/_size" debug fields out of params before upload
    params = {k: v for k, v in parsed.items() if not k.startswith("_")}
    return {
        "email":        CHIEF_USER_EMAIL,
        "daemon_email": CHIEF_USER_EMAIL,
        "filename":     path.name,
        "source":       "coach-dave",
        "season":       meta.get("season"),
        "car_code":     meta.get("car_code"),
        "car_name":     car_name,
        "track_code":   meta.get("track_code"),
        "track_name":   track_name,
        "session_type": meta.get("type"),
        "version":      meta.get("version"),
        "params":       params,
        "parse_score":  parsed.get("_parse_score", 0.0),
        "ts":           datetime.datetime.now().isoformat(),
    }


def push_one(payload, urls):
    clean = sanitize(payload)
    attempts = []
    for url in urls:
        try:
            r = requests.post(url, json=clean, timeout=20)
            snippet = (r.text or "")[:200].replace("\n", " ")
            attempts.append(f"{url} → HTTP {r.status_code} {snippet}")
            if r.status_code in (200, 201): return True, attempts
        except Exception as e:
            attempts.append(f"{url} → {type(e).__name__}: {e}")
    return False, attempts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    urls = [CHIEF_API, CHIEF_API_LOCAL]
    plog("=== CHIEF push-setups starting ===")
    plog(f"  endpoints: {urls}")

    files = find_setups()
    if not files:
        plog("No .sto files found. Install Coach Dave Delta or check folder paths.")
        return

    pushed = 0; skipped = 0; failed = 0
    for f in files:
        if not args.all and already_pushed(f):
            skipped += 1; continue
        payload = build_payload(f)
        if args.dry_run:
            plog(f"  DRY  {f.name}  ({len(payload['params'])} params, parse_score={payload['parse_score']})")
            continue
        ok, attempts = push_one(payload, urls)
        if ok:
            mark_pushed(f); pushed += 1
            plog(f"  PUSH OK  {f.name}  car={payload.get('car_name')}  parse_score={payload.get('parse_score')}")
        else:
            failed += 1
            plog(f"  PUSH FAIL {f.name}")
            for a in attempts: plog(f"    {a}")

    plog(f"=== Done. pushed={pushed} skipped={skipped} failed={failed} ===")


if __name__ == "__main__":
    main()
