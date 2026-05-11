"""
CHIEF Master Diagnostic — runs every check, reports OK/FAIL clearly.

Tests:
  1. Python + pip
  2. SAPI voice (offline)
  3. Edge-tts neural voice (online)
  4. Pygame audio mixer
  5. iRacing SDK installed
  6. iRacing running + connected
  7. Vendor folder discovery (Coach Dave, Simucube, Sim Magic, etc.)
  8. Internet to chiefracing.com
  9. Anthropic API reachable from local
 10. ANTHROPIC_API_KEY env var
 11. Daemon log file readable
 12. Driver DNA file
"""
import os, sys, subprocess, traceback, urllib.request, json
from datetime import datetime

PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"

def header(t):
    print()
    print("=" * 60)
    print(f" {t}")
    print("=" * 60)

def check(name, ok, detail=""):
    sym = PASS if ok else FAIL
    print(f"  {sym}  {name:<40s}  {detail}")
    return ok

results = []

def run(name, fn):
    try:
        ok, detail = fn()
        results.append((name, ok, detail))
        check(name, ok, detail)
    except Exception as e:
        results.append((name, False, str(e)))
        check(name, False, f"EXCEPTION: {e}")

header("CHIEF — Master Diagnostic")
print(f"  Run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

# 1. Python
def t_python():
    return True, f"Python {sys.version.split()[0]}"
run("Python interpreter", t_python)

# 2. SAPI
def t_sapi():
    try:
        import win32com.client
        s = win32com.client.Dispatch("SAPI.SpVoice")
        v = s.GetVoices()
        return True, f"{v.Count} voices installed"
    except Exception as e:
        return False, str(e)
run("SAPI offline voice", t_sapi)

# 3. edge-tts
def t_edge():
    try:
        import edge_tts
        return True, "edge-tts module loaded"
    except Exception as e:
        return False, "not installed (pip install edge-tts)"
run("Edge-TTS neural module", t_edge)

# 4. pygame
def t_pygame():
    try:
        import pygame
        pygame.mixer.init(frequency=24000)
        pygame.mixer.quit()
        return True, "pygame.mixer OK"
    except Exception as e:
        return False, str(e)
run("Pygame audio mixer", t_pygame)

# 5. iRacing SDK
def t_irsdk():
    try:
        import irsdk
        return True, "pyirsdk loaded"
    except Exception as e:
        return False, "not installed (pip install pyirsdk)"
run("iRacing SDK module", t_irsdk)

# 6. iRacing running
def t_iracing_live():
    try:
        import irsdk
        ir = irsdk.IRSDK()
        if ir.startup() and ir.is_initialized and ir.is_connected:
            return True, "iRacing detected + connected"
        return False, "iRacing not running (OK if not racing)"
    except Exception as e:
        return False, str(e)
run("iRacing connection", t_iracing_live)

# 7. Vendor folders
APPDATA = os.environ.get("APPDATA", "")
DOCS = os.path.join(os.path.expanduser("~"), "Documents")
def t_coach_dave():
    p = os.path.join(APPDATA, "Coach Dave Delta")
    return os.path.exists(p), p if os.path.exists(p) else "not found"
run("Coach Dave Delta folder", t_coach_dave)

def t_simucube():
    p = os.path.join(DOCS, "Granite Devices", "Simucube 2")
    return os.path.exists(p), p if os.path.exists(p) else "not found"
run("Simucube profile folder", t_simucube)

def t_iracing_setups():
    p = os.path.join(DOCS, "iRacing", "setups")
    return os.path.exists(p), p if os.path.exists(p) else "not found"
run("iRacing setups folder", t_iracing_setups)

# 8. Internet
def t_chief_online():
    try:
        urllib.request.urlopen("https://chiefracing.com", timeout=8)
        return True, "chiefracing.com reachable"
    except Exception as e:
        return False, str(e)
run("Chief webapp reachable", t_chief_online)

# 9. Anthropic API
def t_anthropic():
    try:
        urllib.request.urlopen("https://api.anthropic.com", timeout=8)
        return True, "api.anthropic.com reachable"
    except Exception as e:
        # Anthropic returns 404 on root — that's fine
        return "Forbidden" in str(e) or "404" in str(e), str(e)
run("Anthropic API reachable", t_anthropic)

# 10. Anthropic API key (if user set locally)
def t_api_key():
    k = os.environ.get("ANTHROPIC_API_KEY", "")
    if not k: return True, "not set locally (only needed in server env)"
    return k.startswith("sk-"), "key looks valid" if k.startswith("sk-") else "key format wrong"
run("ANTHROPIC_API_KEY (local)", t_api_key)

# 11. Logs
def t_log():
    p = os.path.join(os.path.expanduser("~"), "Desktop", "chief-coach.log")
    if os.path.exists(p):
        sz = os.path.getsize(p)
        return True, f"log exists, {sz} bytes"
    return False, "no log yet (will be created on first coach run)"
run("Coach log file", t_log)

# 12. DNA
def t_dna():
    p = os.path.join(os.path.expanduser("~"), "Desktop", "chief-autocapture", "driver-dna.json")
    if os.path.exists(p):
        try:
            with open(p) as f: d = json.load(f)
            return True, f"DNA loaded — {d.get('session_count', 0)} sessions tracked"
        except Exception as e:
            return False, str(e)
    return False, "no DNA yet (created after first session)"
run("Driver DNA profile", t_dna)

# Summary
header("Summary")
passed = sum(1 for _,ok,_ in results if ok)
failed = sum(1 for _,ok,_ in results if not ok)
print(f"  {PASS} {passed}     {FAIL} {failed}")
print()
if failed:
    print("  Failures:")
    for name, ok, detail in results:
        if not ok:
            print(f"    - {name}: {detail}")
    print()

print("=" * 60)
print(" Done.")
print("=" * 60)
input("\nPress enter to close...")
