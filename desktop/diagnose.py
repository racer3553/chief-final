"""Standalone diagnostic - no TTS to avoid hanging."""
import os, sys, glob
from pathlib import Path

print("=" * 60)
print("  CHIEF DIAGNOSTIC - PASS 2")
print("=" * 60)

# 1. Python
print(f"\n[1] Python: {sys.version.split()[0]}")

# 2. Anthropic key
key = os.environ.get("ANTHROPIC_API_KEY", "")
print(f"[2] Anthropic key: {'SET (' + key[:10] + '...)' if key else 'NOT SET'}")

# 3. iRacing connection
print(f"[3] iRacing telemetry test...")
try:
    import irsdk
    ir = irsdk.IRSDK()
    if ir.startup() and ir.is_connected:
        ir.freeze_var_buffer_latest()
        try:
            lap = ir["Lap"] or 0
            on_track = ir["IsOnTrackCar"]
            speed = (ir["Speed"] or 0) * 2.237
            w = ir["WeekendInfo"] or {}
            track = w.get("TrackDisplayName", "?")
            d = ir["DriverInfo"] or {}
            drvs = d.get("Drivers") or []
            ci = d.get("DriverCarIdx", 0)
            car = drvs[ci].get("CarScreenName", "?") if 0 <= ci < len(drvs) else "?"
            print(f"    OK: connected | lap={lap} on_track={on_track} speed={speed:.0f}mph")
            print(f"    car={car} track={track}")
        finally:
            ir.unfreeze_var_buffer_latest()
    else:
        print("    NOT CONNECTED - is iRacing running with you in a session/garage?")
except Exception as e:
    print(f"    ERROR: {e}")

# 4. Coach Dave path search
print(f"\n[4] Hunting for Coach Dave files...")
HOME = Path.home()
DOCS = HOME / "Documents"
APPDATA = Path(os.environ.get("APPDATA", HOME / "AppData/Roaming"))
LOCAL_APPDATA = Path(os.environ.get("LOCALAPPDATA", HOME / "AppData/Local"))

cdd_found = []
search_roots = [HOME, DOCS, APPDATA, LOCAL_APPDATA]
for root in search_roots:
    if root.exists():
        try:
            for f in root.rglob("*.cdd"):
                cdd_found.append(str(f))
                if len(cdd_found) >= 5: break
        except: pass
    if len(cdd_found) >= 5: break

if cdd_found:
    print(f"    FOUND {len(cdd_found)} .cdd file(s):")
    for f in cdd_found[:5]: print(f"      {f}")
else:
    print("    NO .cdd files found anywhere")

# Look for Coach Dave install dir
print(f"\n[5] Coach Dave install dir search...")
candidates = [
    DOCS / "Coach Dave Academy",
    DOCS / "Coach Dave Delta",
    DOCS / "CoachDaveDelta",
    APPDATA / "Coach Dave Delta",
    APPDATA / "Coach Dave Academy",
    APPDATA / "@coachdaveacademy",
    APPDATA / "delta",
    LOCAL_APPDATA / "Coach Dave Delta",
    LOCAL_APPDATA / "Coach Dave Academy",
    LOCAL_APPDATA / "Programs" / "Coach Dave Delta",
]
for c in candidates:
    if c.exists():
        print(f"    EXISTS: {c}")
        try:
            files = list(c.rglob("*"))[:5]
            for f in files: print(f"        - {f.name}")
        except: pass

# 6. Other vendor paths
print(f"\n[6] Other vendor paths...")
for c in [
    DOCS / "Granite Devices" / "Simucube 2",
    DOCS / "Granite Devices" / "Simucube",
    DOCS / "Fanalab",
    APPDATA / "MOZA Pit House",
    DOCS / "Asetek SimSports RaceHub",
    DOCS / "Heusinkveld",
    DOCS / "Simagic",
    DOCS / "iRacing",
    DOCS / "iRacing" / "setups",
]:
    if c.exists():
        n = sum(1 for _ in c.rglob("*"))
        print(f"    EXISTS: {c}  ({n} items)")

# 7. Process check
print(f"\n[7] Background processes...")
try:
    import psutil
    procs = ["iRacingSim64", "iRacingUI", "Coach Dave Delta", "Coach", "Delta", "Simucube", "Govee", "node"]
    for proc_name in procs:
        for p in psutil.process_iter(['name']):
            n = (p.info.get('name') or "").lower()
            if proc_name.lower() in n:
                print(f"    RUNNING: {p.info.get('name')}")
                break
except: pass

print(f"\n{'='*60}\nDone. Send this output to Claude.\n{'='*60}")
input("\nPress Enter to close...")
