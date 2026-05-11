"""
CHIEF Auto-Capture Daemon (Full Integration)
- iRacing: live telemetry + per-lap data + session metadata
- SimHub: reads sessionData / setup logs from Documents/SimHub
- Coach Dave Delta: parses .cdd / setup exports from CDD folder
- Sim Magic: reads motion profiles
- Pushes everything to Chief backend so AI can answer "what was my setup last time"
"""
import time, json, sys, os, datetime, getpass, glob
from pathlib import Path

def _ensure(pkg):
    try: __import__(pkg.replace('-', '_'))
    except ImportError:
        import subprocess
        print(f"Installing {pkg}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", pkg])

for p in ["pyirsdk", "requests", "psutil"]: _ensure(p)
import irsdk, requests, psutil
from vendors import scan_all, detected_summary

CHIEF_API = os.environ.get("CHIEF_API", "https://chiefracing.com/api/sessions/auto-capture")
CHIEF_USER_EMAIL = os.environ.get("CHIEF_USER_EMAIL", "racer3553@gmail.com")  # default to Ben for now
CHIEF_API_LOCAL = "http://localhost:3000/api/sessions/auto-capture"
LOCAL_CACHE_DIR = Path.home() / "Documents" / "ChiefAutoCapture"
LOCAL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
PUSH_LOG = Path.home() / "Desktop" / "chief-autocapture.log"
SIMHUB_DIR = Path.home() / "Documents" / "SimHub"
COACH_DAVE_DIR = Path.home() / "Documents" / "Coach Dave Academy"
SIM_MAGIC_DIR = Path.home() / "Documents" / "SimMagic"


def _plog(msg):
    """Append-mode log so we always have a record of pushes/failures even after the console closes."""
    line = f"[{datetime.datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    try:
        with open(PUSH_LOG, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


def _sanitize_for_postgres(obj):
    """Strip null bytes / control chars that Postgres jsonb rejects.

    iRacing telemetry strings (CarScreenName, driver names) read from raw
    shared-memory buffers often have trailing \\u0000 padding. Supabase
    returns HTTP 500 "unsupported Unicode escape sequence" if we send those.
    """
    if isinstance(obj, str):
        return "".join(c for c in obj if c == "\t" or c == "\n" or c == "\r" or ord(c) >= 0x20)
    if isinstance(obj, dict):
        return {k: _sanitize_for_postgres(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_postgres(v) for v in obj]
    return obj


def is_running(sub):
    try:
        for p in psutil.process_iter(['name']):
            n = (p.info.get('name') or "").lower()
            if sub.lower() in n: return True
    except: pass
    return False


def collect_simhub():
    """Pull whatever SimHub has captured in its working folder."""
    out = {"available": False, "session": None, "settings_files": []}
    if not SIMHUB_DIR.exists(): return out
    out["available"] = True
    # Last 10 settings JSONs by mtime
    files = sorted(SIMHUB_DIR.glob("*setupsettings.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:10]
    out["settings_files"] = [{"name": f.name, "modified": datetime.datetime.fromtimestamp(f.stat().st_mtime).isoformat()} for f in files]
    # Try to read latest game session
    sd = SIMHUB_DIR / "sessionData.json"
    if sd.exists():
        try: out["session"] = json.loads(sd.read_text())[:50000]  # truncate
        except: pass
    return out


def collect_coach_dave():
    """Find Coach Dave Delta setup .cdd files (their compressed setup format)."""
    out = {"available": False, "setups": []}
    candidates = [COACH_DAVE_DIR, Path.home() / "Documents" / "CoachDaveDelta", Path.home() / "Documents" / "Delta"]
    for d in candidates:
        if d.exists():
            out["available"] = True
            for ext in ("*.cdd", "*.json", "*.csv"):
                for f in d.rglob(ext):
                    try:
                        out["setups"].append({
                            "path": str(f),
                            "name": f.name,
                            "size": f.stat().st_size,
                            "modified": datetime.datetime.fromtimestamp(f.stat().st_mtime).isoformat()
                        })
                    except: pass
            break
    return out


def collect_sim_magic():
    """Sim Magic motion profile state."""
    out = {"available": False, "profiles": []}
    candidates = [SIM_MAGIC_DIR, Path.home() / "AppData" / "Roaming" / "SimMagic"]
    for d in candidates:
        if d.exists():
            out["available"] = True
            for f in d.rglob("*.json"):
                try:
                    out["profiles"].append({"path": str(f), "name": f.name})
                except: pass
            break
    return out


class SessionCapture:
    def __init__(self):
        self.ir = irsdk.IRSDK()
        self.session_active = False
        self.current = None
        self.last_lap = 0

    def tick(self):
        if not self.ir.is_initialized or not self.ir.is_connected:
            ok = self.ir.startup()
            if not ok or not self.ir.is_connected:
                if self.session_active: self._end()
                return False
            elif not self.session_active: self._start()
            return True
        if not self.session_active: self._start()
        self.ir.freeze_var_buffer_latest()
        try:
            cl = self.ir["Lap"] or 0
            if cl > self.last_lap:
                self._lap(cl); self.last_lap = cl
            self._update()
        finally: self.ir.unfreeze_var_buffer_latest()
        return True

    def _start(self):
        self.session_active = True
        self.last_lap = 0
        w = self.ir["WeekendInfo"] or {}
        d = self.ir["DriverInfo"] or {}
        drvs = d.get("Drivers") or []
        ci = d.get("DriverCarIdx", 0)
        car = drvs[ci].get("CarScreenName", "unknown") if 0 <= ci < len(drvs) else "unknown"
        self.current = {
            "id": f"sess_{int(time.time())}",
            "started_at": datetime.datetime.utcnow().isoformat() + "Z",
            "email": CHIEF_USER_EMAIL,
            "daemon_email": CHIEF_USER_EMAIL,
            "daemon_user": getpass.getuser(),
            "car": car,
            "track": w.get("TrackDisplayName", "unknown"),
            "track_layout": w.get("TrackConfigName", ""),
            "session_type": w.get("EventType", ""),
            "weather": {
                "track_temp_f": self.ir["TrackTempCrew"] or 0,
                "humidity": self.ir["RelativeHumidity"] or 0,
                "skies": w.get("TrackSkies", "Clear"),
                "wind_mph": (self.ir["WindVel"] or 0) * 2.237,
            },
            "user": getpass.getuser(),
            "laps": [],
            "best_lap_time": None,
            "best_lap_number": None,
            "incidents": 0,
            "hardware_scan": scan_all(car, w.get("TrackDisplayName", "")),
        }
        det = detected_summary(self.current["hardware_scan"])
        print(f"\n[{datetime.datetime.now():%H:%M:%S}] SESSION START: {self.current['car']} @ {self.current['track']}")
        print(f"  Detected hardware: {', '.join(det) or 'none'}")

    def _update(self):
        try:
            b = self.ir["LapBestLapTime"]
            if b and b > 0 and (not self.current["best_lap_time"] or b < self.current["best_lap_time"]):
                self.current["best_lap_time"] = b
                self.current["best_lap_number"] = self.ir["LapBestLap"] or 0
        except: pass
        try: self.current["incidents"] = self.ir["PlayerCarMyIncidentCount"] or 0
        except: pass

    def _lap(self, lap):
        try:
            t = self.ir["LapLastLapTime"] or 0
            fp = (self.ir["FuelLevelPct"] or 0) * 100
            e = {"lap": lap-1, "time": t, "fuel_pct": round(fp,1), "track_temp": self.ir["TrackTempCrew"] or 0,
                 "ts": datetime.datetime.utcnow().isoformat() + "Z"}
            self.current["laps"].append(e)
            print(f"  Lap {e['lap']}: {self._fmt(t)} | fuel {e['fuel_pct']}%")
        except Exception as ex: print(f"  ! lap err: {ex}")

    def _fmt(self, s):
        if not s or s <= 0: return "-"
        m = int(s // 60); return f"{m}:{s-m*60:06.3f}"

    def _end(self):
        if not self.current:
            self.session_active = False
            return
        self.current["ended_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        # Re-scan hardware at session end - settings may have been adjusted mid-session
        self.current["hardware_scan_end"] = scan_all(self.current["car"], self.current["track"])
        fp = LOCAL_CACHE_DIR / f"{self.current['id']}.json"
        try:
            fp.write_text(json.dumps(self.current, indent=2))
            print(f"\n[{datetime.datetime.now():%H:%M:%S}] SAVED: {fp.name}  ({len(self.current['laps'])} laps, best {self._fmt(self.current['best_lap_time'])})")
        except Exception as e: print(f"  ! save err: {e}")
        self._push()
        self.session_active = False; self.current = None

    def _push(self):
        sid = self.current.get("id", "?")
        track = self.current.get("track", "?")
        car = self.current.get("car", "?")
        # Strip null bytes / control chars BEFORE serializing — Supabase jsonb
        # otherwise rejects with "unsupported Unicode escape sequence" 500.
        clean = _sanitize_for_postgres(self.current)
        attempts = []
        for url in [CHIEF_API, CHIEF_API_LOCAL]:
            try:
                r = requests.post(url, json=clean, timeout=8)
                snippet = (r.text or "")[:240].replace("\n", " ")
                attempts.append(f"{url} → HTTP {r.status_code} {snippet}")
                if r.status_code in (200, 201):
                    _plog(f"PUSH OK  {sid}  {car} @ {track}  via {url}  resp={snippet}")
                    return
            except Exception as e:
                attempts.append(f"{url} → EXCEPTION {type(e).__name__}: {e}")
                continue
        _plog(
            f"PUSH FAIL {sid}  {car} @ {track}  — saved locally only.\n"
            f"  attempts:\n  - " + "\n  - ".join(attempts) +
            f"\n  HINT: re-run later via CHIEF-PUSH-CACHED.bat"
        )


def main():
    print("=" * 60)
    print("  CHIEF AUTO-CAPTURE — Full Integration")
    print(f"  Cache: {LOCAL_CACHE_DIR}")
    print(f"  Backend: {CHIEF_API}")
    print("=" * 60); print()
    cap = SessionCapture()
    last = 0
    while True:
        try:
            cap.tick()
            now = time.time()
            if now - last >= 30:
                last = now
                ir = "ON" if cap.ir.is_connected else "off"
                sh = "ON" if is_running("SimHub") else "off"
                cd = "ON" if is_running("Coach") or is_running("Delta") else "off"
                cached = len(list(LOCAL_CACHE_DIR.glob('*.json')))
                print(f"[{datetime.datetime.now():%H:%M:%S}] iRacing={ir} SimHub={sh} CoachDave={cd} cached={cached}")
        except KeyboardInterrupt:
            print("\nStopping..."); cap._end(); break
        except Exception as e: print(f"  ! {e}")
        time.sleep(1)


if __name__ == "__main__": main()
