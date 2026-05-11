"""
CHIEF — push every local lap trace (lap_*.json) up to chiefracing.com.

Companion to chief-push-cached.py:
    chief-push-cached.py  → sessions       (sess_*.json)
    chief-push-traces.py  → lap telemetry  (lap_*.json)

Reads:  ~/Documents/ChiefAutoCapture/traces/lap_*.json
Posts:  POST CHIEF_API_TRACE  (default https://chiefracing.com/api/sessions/auto-capture-trace)
"""
import argparse, datetime, json, os, sys
from pathlib import Path

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "requests"])
    import requests

CHIEF_API_TRACE = os.environ.get("CHIEF_API_TRACE", "https://chiefracing.com/api/sessions/auto-capture-trace")
CHIEF_API_TRACE_LOCAL = os.environ.get("CHIEF_API_TRACE_LOCAL", "http://localhost:3000/api/sessions/auto-capture-trace")
CHIEF_USER_EMAIL = os.environ.get("CHIEF_USER_EMAIL", "racer3553@gmail.com")
TRACE_DIR = Path.home() / "Documents" / "ChiefAutoCapture" / "traces"
PUSHED_DIR = Path.home() / "Documents" / "ChiefAutoCapture" / ".pushed_traces"
PUSH_LOG = Path.home() / "Desktop" / "chief-autocapture.log"
PUSHED_DIR.mkdir(parents=True, exist_ok=True)


def plog(msg):
    line = f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    try:
        with open(PUSH_LOG, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


def sanitize(obj):
    """Strip null bytes / control chars that Postgres jsonb rejects."""
    if isinstance(obj, str):
        return "".join(c for c in obj if c == "\t" or c == "\n" or c == "\r" or ord(c) >= 0x20)
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj


def already_pushed(trace_file):
    return (PUSHED_DIR / trace_file.name).exists()


def mark_pushed(trace_file):
    try:
        (PUSHED_DIR / trace_file.name).write_text(datetime.datetime.now().isoformat())
    except Exception:
        pass


def push_one(trace_file, urls):
    try:
        payload = json.loads(trace_file.read_text(encoding="utf-8"))
    except Exception as e:
        return False, [f"unreadable: {e}"]
    # Add identity fields the API uses to resolve the user
    payload.setdefault("email", CHIEF_USER_EMAIL)
    payload.setdefault("daemon_email", CHIEF_USER_EMAIL)
    payload = sanitize(payload)

    attempts = []
    for url in urls:
        try:
            r = requests.post(url, json=payload, timeout=20)
            snippet = (r.text or "")[:240].replace("\n", " ")
            attempts.append(f"{url} → HTTP {r.status_code} {snippet}")
            if r.status_code in (200, 201):
                return True, attempts
        except Exception as e:
            attempts.append(f"{url} → {type(e).__name__}: {e}")
    return False, attempts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="Re-push every cached trace, even already-pushed ones")
    ap.add_argument("--api", default=None, help="Override CHIEF_API_TRACE URL")
    args = ap.parse_args()

    urls = [args.api] if args.api else [CHIEF_API_TRACE, CHIEF_API_TRACE_LOCAL]
    plog(f"=== CHIEF push-traces starting ===")
    plog(f"  trace dir: {TRACE_DIR}")
    plog(f"  endpoints: {urls}")

    if not TRACE_DIR.exists():
        plog("Trace directory not found — nothing to push.")
        return

    files = sorted(TRACE_DIR.glob("lap_*.json"))
    if not files:
        plog("No lap traces found. (Drive a lap with CHIEF live-coach running.)")
        return

    pushed = 0; skipped = 0; failed = 0
    for f in files:
        if not args.all and already_pushed(f):
            skipped += 1
            continue
        ok, attempts = push_one(f, urls)
        if ok:
            mark_pushed(f)
            pushed += 1
            plog(f"  PUSH OK  {f.name}")
        else:
            failed += 1
            plog(f"  PUSH FAIL {f.name}")
            for a in attempts:
                plog(f"    {a}")

    plog(f"=== Done. pushed={pushed}  skipped(already)={skipped}  failed={failed} ===")


if __name__ == "__main__":
    main()
