"""
Universal Sim Hardware Vendor Scanner
Auto-detects and reads settings from whatever the user has installed:
  Wheels:    Simucube 1/2, Fanatec/Fanalab, Moza Pit House, Thrustmaster, Asetek
  Motion:    Sim Magic, D-Box (via SimHub), Sim-Lab P1X
  Pedals:    Heusinkveld, Asetek Invicta, Simagic P1000, Fanatec
  Coach:     Coach Dave Delta v5+ (Electron app at AppData\\Roaming\\Coach Dave Delta)
  Sim:       iRacing per-car setups, controls.cfg, app.ini
"""
import os, json, glob
from pathlib import Path
from datetime import datetime

HOME = Path.home()
DOCS = HOME / "Documents"
APPDATA = Path(os.environ.get("APPDATA", HOME / "AppData/Roaming"))
LOCAL_APPDATA = Path(os.environ.get("LOCALAPPDATA", HOME / "AppData/Local"))


def _stat(f):
    try:
        return {"path": str(f), "name": f.name, "size": f.stat().st_size,
                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat()}
    except: return None


def _scan(roots, patterns, max_files=50):
    out = []
    for r in roots:
        rp = Path(r)
        if not rp.exists(): continue
        for pat in patterns:
            for f in rp.rglob(pat):
                if f.is_file():
                    s = _stat(f)
                    if s: out.append(s)
                    if len(out) >= max_files: return out
    return out


def _read_text(f, max_bytes=20000):
    try:
        with open(f, 'r', encoding='utf-8', errors='ignore') as fh:
            return fh.read(max_bytes)
    except: return None


# ============ SIMUCUBE ============
def scan_simucube():
    """Read Simucube profile files AND parse the actual settings values."""
    out = {"detected": False, "version": None, "profiles": [], "active_profile": None,
           "active_profile_values": None}
    candidates = [
        DOCS / "Granite Devices" / "Simucube 2",
        DOCS / "Granite Devices" / "Simucube",
        DOCS / "Granite Devices",
    ]
    for c in candidates:
        if c.exists():
            out["detected"] = True
            out["version"] = c.name
            # Find profile JSONs in the Settings subfolder (where Tuner stores them)
            profile_files = []
            for sub in [c, c / "Settings", c / "Profiles"]:
                if sub.exists():
                    for f in sub.rglob("*.profile.json"):
                        if f.is_file(): profile_files.append(f)
                    for f in sub.rglob("*.json"):
                        if f.is_file() and f not in profile_files: profile_files.append(f)
            out["profiles"] = []
            for f in profile_files[:30]:
                s = _stat(f)
                if s: out["profiles"].append(s)
            # Most recently modified = active
            if out["profiles"]:
                out["active_profile"] = max(out["profiles"], key=lambda p: p["modified"])
                # READ THE ACTUAL VALUES from the active profile JSON
                try:
                    content = Path(out["active_profile"]["path"]).read_text(encoding='utf-8', errors='ignore')[:50000]
                    parsed = json.loads(content)
                    # Extract the meaningful FFB settings - flatten nested keys
                    flat = _flatten_settings(parsed)
                    out["active_profile_values"] = flat
                except Exception as e:
                    out["active_profile_values"] = {"error": str(e)}
            break
    return out


def _flatten_settings(obj, prefix=''):
    """Flatten a nested settings object into key-value pairs of just the meaningful values."""
    flat = {}
    if not isinstance(obj, dict): return flat
    for k, v in obj.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, (int, float, bool, str)) and len(str(v)) < 100:
            flat[key] = v
        elif isinstance(v, dict):
            flat.update(_flatten_settings(v, key))
        # skip arrays and complex types
    return flat


# ============ FANATEC / FANALAB ============
def scan_fanatec():
    out = {"detected": False, "profiles": [], "device_settings": []}
    roots = [
        DOCS / "Fanalab",
        DOCS / "Fanatec",
        LOCAL_APPDATA / "Fanatec",
        APPDATA / "Fanatec",
    ]
    for r in roots:
        if r.exists():
            out["detected"] = True
            out["profiles"].extend(_scan([r], ["*.fxp", "*.json", "*.xml", "*.cfg"])[:30])
    return out


# ============ MOZA PIT HOUSE ============
def scan_moza():
    out = {"detected": False, "profiles": []}
    roots = [
        APPDATA / "MOZA Pit House",
        DOCS / "MOZA",
        LOCAL_APPDATA / "MOZA",
        Path("C:/Program Files/MOZA Pit House"),
    ]
    for r in roots:
        if r.exists():
            out["detected"] = True
            out["profiles"].extend(_scan([r], ["*.json", "*.xml", "*.cfg"])[:30])
    return out


# ============ THRUSTMASTER ============
def scan_thrustmaster():
    out = {"detected": False, "profiles": []}
    roots = [
        DOCS / "Thrustmaster",
        APPDATA / "Thrustmaster",
        LOCAL_APPDATA / "Thrustmaster",
    ]
    for r in roots:
        if r.exists():
            out["detected"] = True
            out["profiles"].extend(_scan([r], ["*.tmprofile", "*.xml", "*.json", "*.cfg"])[:20])
    return out


# ============ ASETEK SIMSPORTS ============
def scan_asetek():
    out = {"detected": False, "profiles": []}
    roots = [
        DOCS / "Asetek SimSports RaceHub",
        DOCS / "Asetek SimSports",
        APPDATA / "Asetek SimSports",
    ]
    for r in roots:
        if r.exists():
            out["detected"] = True
            out["profiles"].extend(_scan([r], ["*.json", "*.profile"])[:30])
    return out


# ============ SIMAGIC ============
def scan_simagic():
    out = {"detected": False, "profiles": []}
    roots = [
        DOCS / "Simagic",
        DOCS / "SIMAGIC",
        APPDATA / "Simagic",
        Path("C:/Simagic"),
    ]
    for r in roots:
        if r.exists():
            out["detected"] = True
            out["profiles"].extend(_scan([r], ["*.json", "*.cfg", "*.profile"])[:30])
    return out


# ============ HEUSINKVELD ============
def scan_heusinkveld():
    out = {"detected": False, "profiles": []}
    roots = [
        DOCS / "Heusinkveld",
        APPDATA / "Heusinkveld",
        LOCAL_APPDATA / "Heusinkveld",
    ]
    for r in roots:
        if r.exists():
            out["detected"] = True
            out["profiles"].extend(_scan([r], ["*.json", "*.xml", "*.profile"])[:20])
    return out


# ============ SIM MAGIC / SIMPRO MANAGER (pedals + wheel) ============
def scan_sim_magic():
    """Sim Magic hardware - their config app is called SimPro Manager."""
    out = {"detected": False, "profiles": [], "app_name": None}
    roots = [
        # SimPro Manager paths (the actual app name)
        DOCS / "SimPro Manager",
        DOCS / "SIMPRO Manager",
        DOCS / "SimPro",
        APPDATA / "SimPro Manager",
        APPDATA / "SimProManager",
        APPDATA / "SimPro",
        LOCAL_APPDATA / "SimPro Manager",
        LOCAL_APPDATA / "SimProManager",
        LOCAL_APPDATA / "Programs" / "SimPro Manager",
        Path("C:/Program Files/SimPro Manager"),
        Path("C:/Program Files (x86)/SimPro Manager"),
        # SIMAGIC brand paths
        DOCS / "Simagic",
        DOCS / "SIMAGIC",
        DOCS / "SimMagic",
        APPDATA / "Simagic",
        APPDATA / "SIMAGIC",
        LOCAL_APPDATA / "Simagic",
        Path("C:/Simagic"),
        Path("C:/SIMAGIC"),
    ]
    for r in roots:
        if r.exists():
            out["detected"] = True
            out["app_name"] = r.name
            out["profiles"].extend(_scan([r], ["*.json", "*.cfg", "*.profile", "*.xml", "*.ini"])[:30])
    # Also scan AppData for any folder containing "simpro" or "simagic"
    for parent in [APPDATA, LOCAL_APPDATA, DOCS]:
        if parent.exists():
            try:
                for sub in parent.iterdir():
                    if sub.is_dir() and ("simpro" in sub.name.lower() or "simagic" in sub.name.lower() or "sim magic" in sub.name.lower()):
                        if not any(str(p["path"]).startswith(str(sub)) for p in out["profiles"]):
                            out["detected"] = True
                            out["app_name"] = sub.name
                            out["profiles"].extend(_scan([sub], ["*"])[:20])
            except: pass
    return out


# ============ IRACING ============
def scan_iracing(current_car=None, current_track=None):
    """iRacing setups + READ the actual .sto file contents for the current car/track."""
    out = {"detected": False, "controls_config": None, "app_ini": None,
           "setups_for_car": [], "all_cars_with_setups": [], "setup_files": []}
    iracing_root = DOCS / "iRacing"
    if not iracing_root.exists(): return out
    out["detected"] = True

    # controls.cfg / app.ini
    for fn in ["controls.cfg", "app.ini", "joyCalib.yaml"]:
        f = iracing_root / fn
        if f.exists():
            out[fn.replace(".", "_")] = _read_text(f, 8000)

    setups_root = iracing_root / "setups"
    if setups_root.exists():
        out["all_cars_with_setups"] = [d.name for d in setups_root.iterdir() if d.is_dir()][:50]
        if current_car:
            target = None
            cn = current_car.lower().replace(" ", "")
            for d in setups_root.iterdir():
                if d.is_dir() and cn in d.name.lower().replace(" ", ""):
                    target = d; break
            if target:
                out["setups_for_car"] = _scan([target], ["*.sto"])[:30]
                # READ actual file contents (base64) so they can be re-downloaded later
                import base64
                out["setup_files"] = []
                files_to_read = out["setups_for_car"][:10]  # cap to 10 to keep payload small
                # Filter to track if known
                if current_track:
                    tn = current_track.lower().replace(" ", "")
                    matched = [s for s in out["setups_for_car"] if tn in s["name"].lower().replace(" ", "")]
                    if matched:
                        out["setups_for_track"] = matched[:15]
                        files_to_read = matched[:10]
                for s in files_to_read:
                    try:
                        with open(s["path"], 'rb') as fh:
                            content = fh.read()
                        if len(content) < 200000:  # skip giant files
                            out["setup_files"].append({
                                "name": s["name"],
                                "size": len(content),
                                "content_b64": base64.b64encode(content).decode('ascii'),
                                "modified": s["modified"],
                            })
                    except Exception as e: pass
    return out


# ============ COACH DAVE DELTA ============
def scan_coach_dave():
    """Coach Dave Delta v5+ - Electron app at AppData\\Roaming\\Coach Dave Delta."""
    out = {"detected": False, "setups": [], "telemetry": [], "version": None,
           "artifacts": None, "local_state": None}

    # PRIMARY PATH (confirmed v5.5.0): AppData\Roaming\Coach Dave Delta
    primary = APPDATA / "Coach Dave Delta"
    if primary.exists():
        out["detected"] = True
        out["version"] = "v5.x (Electron)"

        # Read artifacts.json (setup metadata, downloaded packs)
        artifacts_file = primary / "artifacts.json"
        if artifacts_file.exists():
            try:
                content = artifacts_file.read_text(encoding='utf-8', errors='ignore')[:50000]
                out["artifacts"] = json.loads(content) if len(content) < 50000 else {"raw_preview": content[:5000]}
            except Exception as e: out["artifacts"] = {"err": str(e)}

        # Read Local State (Electron user state)
        local_state = primary / "Local State"
        if local_state.exists():
            try:
                content = local_state.read_text(encoding='utf-8', errors='ignore')[:20000]
                out["local_state"] = json.loads(content) if len(content) < 20000 else {"raw_preview": content[:5000]}
            except Exception as e: out["local_state"] = {"err": str(e)}

        # List blob_storage files (binary setup downloads)
        blob_dir = primary / "blob_storage"
        if blob_dir.exists():
            blobs = []
            try:
                for f in blob_dir.rglob("*"):
                    if f.is_file():
                        s = _stat(f)
                        if s: blobs.append(s)
                    if len(blobs) >= 30: break
            except: pass
            out["blob_storage_files"] = blobs

        # Try to extract setups from IndexedDB (LevelDB) — read keys/values where possible
        idb = primary / "IndexedDB"
        if idb.exists():
            idb_files = _scan([idb], ["*.ldb", "*.log", "MANIFEST*"])[:20]
            out["indexeddb_files"] = idb_files

    # Read .cdd file contents from anywhere they exist (base64 for re-download later)
    import base64
    setup_files = []
    cdd_locations = [
        primary / "blob_storage",
        DOCS / "Coach Dave Academy",
        DOCS / "iRacing" / "setups",  # Coach Dave can copy here too
    ]
    for loc in cdd_locations:
        if loc.exists():
            for f in loc.rglob("*.cdd"):
                try:
                    with open(f, 'rb') as fh:
                        content = fh.read()
                    if len(content) < 500000 and len(setup_files) < 15:
                        setup_files.append({
                            "name": f.name,
                            "size": len(content),
                            "content_b64": base64.b64encode(content).decode('ascii'),
                            "path": str(f),
                        })
                except: pass
    if setup_files:
        out["cdd_setup_files"] = setup_files
        out["detected"] = True
    roots = [
        # Documents (older versions)
        DOCS / "Coach Dave Academy",
        DOCS / "CoachDaveDelta",
        DOCS / "Coach Dave Delta",
        DOCS / "Delta",
        # AppData paths (v5+ Electron)
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
        LOCAL_APPDATA / "Coach Dave Academy",
        LOCAL_APPDATA / "Programs" / "Coach Dave Delta",
        LOCAL_APPDATA / "Programs" / "coach-dave-delta",
        # Electron auto-update paths
        LOCAL_APPDATA / "coach-dave-delta-updater",
        # iRacing setups copied by Coach Dave
        DOCS / "iRacing" / "setups" / "_coach-dave",
    ]
    # ALSO try to find ANY folder with "coach" or "delta" in AppData
    for parent in [APPDATA, LOCAL_APPDATA]:
        if parent.exists():
            try:
                for sub in parent.iterdir():
                    if sub.is_dir() and ("coach" in sub.name.lower() or "delta" in sub.name.lower()):
                        roots.append(sub)
            except: pass
    for r in roots:
        if r.exists():
            out["detected"] = True
            out["version"] = str(r)
            out["setups"].extend(_scan([r], ["*.cdd", "*.sto", "*.json", "*.csd"])[:50])
            out["telemetry"].extend(_scan([r], ["*.csv", "*.ibt", "*.json"])[:20])
    # Also scan the iRacing setups folder for Coach-Dave-named files
    iracing_setups = DOCS / "iRacing" / "setups"
    if iracing_setups.exists():
        for f in iracing_setups.rglob("*.sto"):
            try:
                if "coach" in f.name.lower() or "delta" in f.name.lower() or "cda" in f.name.lower():
                    out["setups"].append(_stat(f))
                    out["detected"] = True
            except: pass
    return out


# ============ MASTER SCAN ============
def scan_all(current_car=None, current_track=None):
    return {
        "scanned_at": datetime.utcnow().isoformat() + "Z",
        "wheels": {
            "simucube": scan_simucube(),
            "fanatec": scan_fanatec(),
            "moza": scan_moza(),
            "thrustmaster": scan_thrustmaster(),
            "asetek": scan_asetek(),
            "simagic": scan_simagic(),
        },
        "pedals": {
            "heusinkveld": scan_heusinkveld(),
        },
        "motion": {
            "sim_magic": scan_sim_magic(),
        },
        "sim": {
            "iracing": scan_iracing(current_car, current_track),
        },
        "coach": {
            "coach_dave": scan_coach_dave(),
        },
    }


def detected_summary(scan):
    """One-line summary of detected hardware."""
    found = []
    for cat in ["wheels", "pedals", "motion", "sim", "coach"]:
        for vendor, info in scan.get(cat, {}).items():
            if info.get("detected"): found.append(vendor)
    return found


if __name__ == "__main__":
    s = scan_all()
    print(json.dumps(s, indent=2, default=str))
    print("\n--- Detected:", detected_summary(s))
