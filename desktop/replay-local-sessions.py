"""Re-push every locally-saved session to chiefracing.com after API was fixed."""
import json, os, sys
from pathlib import Path

def _ensure(pkg):
    try: __import__(pkg.replace('-','_'))
    except ImportError:
        import subprocess; subprocess.check_call([sys.executable,"-m","pip","install","--quiet",pkg])

_ensure("requests")
import requests

CACHE = Path.home() / "Documents" / "ChiefAutoCapture"
API = "https://chiefracing.com/api/sessions/auto-capture"
EMAIL = os.environ.get("CHIEF_USER_EMAIL", "racer3553@gmail.com")

if not CACHE.exists():
    print("No local cache dir."); sys.exit(0)

files = sorted(CACHE.glob("*.json"))
if not files:
    print("No local sessions to replay."); sys.exit(0)

print(f"Replaying {len(files)} local sessions to {API}")
print(f"Attributing to: {EMAIL}\n")

ok, fail = 0, 0
for f in files:
    try:
        data = json.loads(f.read_text())
        # Inject email so API can look up user
        data["email"] = EMAIL
        data["daemon_email"] = EMAIL
        r = requests.post(API, json=data, timeout=10)
        if r.status_code in (200, 201):
            print(f"  OK  {f.name}  -  {data.get('car','?')} @ {data.get('track','?')}")
            ok += 1
        else:
            print(f"  FAIL {f.name}  status={r.status_code}  body={r.text[:200]}")
            fail += 1
    except Exception as e:
        print(f"  ERR {f.name}: {e}")
        fail += 1

print(f"\nDone. ok={ok} fail={fail}")
input("Enter to close...")
