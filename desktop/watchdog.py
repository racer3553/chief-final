"""
CHIEF Watchdog — keeps the autocapture daemon, live coach, and pre-race strategist alive.

Strategy:
  - Spawns each as a subprocess
  - Polls them every 5s
  - If any dies, logs and restarts after 3s
  - Outputs unified status line so user can see state at a glance
"""
import os, sys, time, subprocess, signal
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(os.path.expanduser("~"), "Desktop", "chief-watchdog.log")

def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f: f.write(line + "\n")
    except Exception: pass

PROCESSES = [
    {
        "name": "AutoCapture",
        "script": "chief-autocapture.py",
        "proc": None,
        "starts": 0,
    },
    {
        "name": "LiveCoach",
        "script": "live-chief.py",
        "proc": None,
        "starts": 0,
    },
    {
        "name": "Strategist",
        "script": "pre-race-strategist.py",
        "proc": None,
        "starts": 0,
    },
]

def start(p):
    script_path = os.path.join(HERE, p["script"])
    if not os.path.exists(script_path):
        log(f"Skipping {p['name']} — script not found at {script_path}")
        return
    log(f"Starting {p['name']}...")
    creationflags = 0
    if sys.platform == "win32":
        creationflags = subprocess.CREATE_NEW_CONSOLE  # so each gets its own window
    try:
        p["proc"] = subprocess.Popen(
            [sys.executable, script_path],
            cwd=HERE,
            creationflags=creationflags,
        )
        p["starts"] += 1
        log(f"  {p['name']} started (PID {p['proc'].pid}, total starts: {p['starts']})")
    except Exception as e:
        log(f"  Failed to start {p['name']}: {e}")
        p["proc"] = None

def is_alive(p):
    if p["proc"] is None: return False
    return p["proc"].poll() is None

def stop_all():
    log("Watchdog shutting down — terminating children")
    for p in PROCESSES:
        if p["proc"]:
            try: p["proc"].terminate()
            except Exception: pass

def main():
    log(f"CHIEF Watchdog starting. Log: {LOG_PATH}")
    log(f"Watching: {', '.join(p['name'] for p in PROCESSES)}")
    # Initial start
    for p in PROCESSES:
        start(p)
        time.sleep(1)  # stagger

    try:
        while True:
            time.sleep(5)
            for p in PROCESSES:
                if not is_alive(p):
                    log(f"{p['name']} is DOWN — restarting in 3s")
                    time.sleep(3)
                    start(p)
            # Status line
            statuses = "  ".join(
                f"{p['name']}={'UP' if is_alive(p) else 'DOWN'}({p['starts']})"
                for p in PROCESSES
            )
            log(f"STATUS  {statuses}")
    except KeyboardInterrupt:
        stop_all()
        log("Stopped.")

if __name__ == "__main__":
    main()
