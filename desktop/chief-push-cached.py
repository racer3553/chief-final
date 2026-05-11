"""
CHIEF — replay every locally cached session up to chiefracing.com.

Reads:  ~/Documents/ChiefAutoCapture/sess_*.json
Posts:  CHIEF_API   (default https://chiefracing.com/api/sessions/auto-capture)
        CHIEF_API_LOCAL (default http://localhost:3000/api/sessions/auto-capture)

Logs to ~/Desktop/chief-autocapture.log so you can see exactly what happened.

Usage:
    python chief-push-cached.py             # only pushes sessions not yet pushed
    python chief-push-cached.py --all       # re-pushes everything
    python chief-push-cached.py --probe     # just hits the endpoint with an empty payload to see if auth is the problem
"""
import argparse
import datetime
import json
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Installing requests...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "requests"])
    import requests

CHIEF_API = os.environ.get("CHIEF_API", "https://chiefracing.com/api/sessions/auto-capture")
CHIEF_API_LOCAL = os.environ.get("CHIEF_API_LOCAL", "http://localhost:3000/api/sessions/auto-capture")
CHIEF_USER_EMAIL = os.environ.get("CHIEF_USER_EMAIL", "racer3553@gmail.com")
LOCAL_CACHE_DIR = Path.home() / "Documents" / "ChiefAutoCapture"
PUSH_LOG = Path.home() / "Desktop" / "chief-autocapture.log"
PUSHED_MARKER_DIR = LOCAL_CACHE_DIR / ".pushed"
PUSHED_MARKER_DIR.mkdir(parents=True, exist_ok=True)


def plog(msg):
    line = f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    try:
        with open(PUSH_LOG, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


def sanitize_for_postgres(obj):
    """Recursively strip characters Postgres jsonb cannot store.

    Postgres rejects \\u0000 (null byte) inside jsonb columns with
    'unsupported Unicode escape sequence'. iRacing telemetry strings
    (driver/car names read from raw memory) often have trailing null
    padding. We also strip other ASCII control chars that confuse jsonb.
    """
    if isinstance(obj, str):
        # Remove null bytes and other problematic control chars except \t \n \r
        return "".join(c for c in obj if c == "\t" or c == "\n" or c == "\r" or ord(c) >= 0x20)
    if isinstance(obj, dict):
        return {k: sanitize_for_postgres(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_postgres(v) for v in obj]
    return obj


def already_pushed(session_file):
    return (PUSHED_MARKER_DIR / session_file.name).exists()


def mark_pushed(session_file):
    try:
        (PUSHED_MARKER_DIR / session_file.name).write_text(
            datetime.datetime.now().isoformat()
        )
    except Exception:
        pass


def push_one(session, urls):
    # Strip null bytes / control chars BEFORE serializing — Supabase jsonb
    # otherwise rejects with "unsupported Unicode escape sequence" 500.
    clean = sanitize_for_postgres(session)
    attempts = []
    for url in urls:
        try:
            r = requests.post(url, json=clean, timeout=15)
            snippet = (r.text or "")[:300].replace("\n", " ")
            attempts.append(f"{url} → HTTP {r.status_code} {snippet}")
            if r.status_code in (200, 201):
                return True, attempts
        except Exception as e:
            attempts.append(f"{url} → {type(e).__name__}: {e}")
    return False, attempts


def probe(urls):
    plog("=" * 60)
    plog("PROBE — sending empty/minimal payload to detect auth/server errors")
    plog(f"User email being sent: {CHIEF_USER_EMAIL}")
    payload = {"email": CHIEF_USER_EMAIL, "daemon_email": CHIEF_USER_EMAIL,
               "id": "probe_" + str(int(datetime.datetime.now().timestamp())),
               "started_at": datetime.datetime.utcnow().isoformat() + "Z",
               "ended_at":   datetime.datetime.utcnow().isoformat() + "Z",
               "car": "PROBE", "track": "PROBE", "track_layout": "",
               "session_type": "Probe", "weather": {}, "user": "probe",
               "laps": [], "incidents": 0, "hardware_scan": {}}
    ok, attempts = push_one(payload, urls)
    for a in attempts:
        plog("  " + a)
    plog(f"Probe result: {'OK' if ok else 'FAIL'}")
    plog("=" * 60)
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="Re-push every cached session, not just new ones")
    ap.add_argument("--probe", action="store_true", help="Just hit the endpoint with a tiny payload and show the response")
    ap.add_argument("--api", default=None, help="Override CHIEF_API URL")
    args = ap.parse_args()

    urls = [args.api] if args.api else [CHIEF_API, CHIEF_API_LOCAL]
    plog(f"=== CHIEF push-cached starting ===")
    plog(f"  cache:    {LOCAL_CACHE_DIR}")
    plog(f"  endpoints: {urls}")
    plog(f"  email:    {CHIEF_USER_EMAIL}")

    if args.probe:
        probe(urls)
        return

    files = sorted(LOCAL_CACHE_DIR.glob("sess_*.json"))
    if not files:
        plog("No cached sessions found. (Drive a session with iRacing + CHIEF running first.)")
        return

    pushed = 0
    skipped = 0
    failed = 0
    for f in files:
        if not args.all and already_pushed(f):
            skipped += 1
            continue
        try:
            session = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:
            plog(f"  [skip] {f.name} unreadable: {e}")
            failed += 1
            continue
        # Make sure email is set so server-side lookup works
        session.setdefault("email", CHIEF_USER_EMAIL)
        session.setdefault("daemon_email", CHIEF_USER_EMAIL)
        ok, attempts = push_one(session, urls)
        if ok:
            mark_pushed(f)
            pushed += 1
            plog(f"  PUSH OK  {f.name}  car={session.get('car')}  track={session.get('track')}")
        else:
            failed += 1
            plog(f"  PUSH FAIL {f.name}")
            for a in attempts:
                plog(f"    {a}")

    plog(f"=== Done. pushed={pushed}  skipped(already)={skipped}  failed={failed} ===")
    if failed and pushed == 0:
        plog("\nALL pushes failed. Most common causes:")
        plog("  1. chiefracing.com is offline / returning 5xx")
        plog("  2. Profile for racer3553@gmail.com isn't in Supabase yet")
        plog("  3. SUPABASE_SERVICE_ROLE_KEY env var not set on Vercel")
        plog("  4. NEXT_PUBLIC_SUPABASE_URL env var not set on Vercel")
        plog("Check the response snippet above for the exact server error.")


if __name__ == "__main__":
    main()
