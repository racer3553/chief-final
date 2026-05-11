"""
CHIEF Live Race Engineer — talks every corner.

Design goals:
  1. NEVER silent in session for more than ~6 seconds.
  2. Pre-corner braking callouts learned from your fast lap.
  3. Real-time delta callouts ("up two tenths", "down a tenth on best").
  4. Tire / brake / fuel warnings as they cross thresholds.
  5. Position, gap to ahead/behind, flag changes — all spoken.
  6. Ambient coach mode when iRacing is closed (so you can verify TTS works).
  7. Bullet-proof: every loop wrapped in try/except, log file on Desktop.

Run via:  Desktop\\LIVE-COACH.bat
"""
import os, sys, time, random, traceback, subprocess, math
from datetime import datetime
from collections import deque

LOG_PATH = os.path.join(os.path.expanduser("~"), "Desktop", "chief-coach.log")

def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

def _ensure(pkg, importname=None):
    importname = importname or pkg
    try:
        __import__(importname); return True
    except ImportError:
        log(f"Installing {pkg}...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", pkg])
            __import__(importname); return True
        except Exception as e:
            log(f"Failed to install {pkg}: {e}"); return False

_ensure("pywin32", "win32com")
HAS_IRSDK = _ensure("pyirsdk", "irsdk")
HAS_EDGE = _ensure("edge-tts", "edge_tts")
HAS_PYGAME = _ensure("pygame", "pygame")
# Always upgrade edge-tts — Microsoft API rotates voices and old packages start returning "no audio"
try:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "--upgrade", "edge-tts"])
except Exception:
    pass

import win32com.client
try:
    import irsdk
except ImportError:
    irsdk = None

import threading, queue, tempfile, asyncio
try:
    import pythoncom   # for SAPI from worker threads
except Exception:
    pythoncom = None
try:
    import edge_tts
except ImportError:
    edge_tts = None
try:
    import pygame
    pygame.mixer.init(frequency=24000, size=-16, channels=2, buffer=512)
    PYGAME_OK = True
except Exception as _e:
    PYGAME_OK = False
    log(f"pygame mixer init failed: {_e}")

# ---------------- Voice ----------------
# Voice priority:
#   1. edge-tts neural voices — auto-rotates through known-working female voices
#      (Microsoft rate-limits / deprecates voices over time; we test on startup
#      and pick the first one that actually returns audio.)
#   2. SAPI Windows voice (offline fallback) — picks Aria/Zira (female) if available
#
# Override with env vars:
#   CHIEF_VOICE = single voice override (e.g. "en-US-AriaNeural") — skips rotation
#   CHIEF_RATE  = "-5%" default (slightly slower = less robotic)
#   CHIEF_PITCH = "+0Hz" default
#
# Female neural voices in order of preference. AriaNeural is tried first because
# it's Microsoft's longest-lived stable voice — least likely to be rate-limited.
VOICE_CANDIDATES = [
    "en-US-AriaNeural",              # stable workhorse, warm — try first for fast startup
    "en-US-JennyNeural",             # clear, conversational
    "en-US-AvaMultilingualNeural",   # newest, very natural conversational
    "en-US-EmmaMultilingualNeural",  # warm, expressive
    "en-US-MichelleNeural",          # newscaster — clean diction
]
NEURAL_VOICE_OVERRIDE = os.environ.get("CHIEF_VOICE", "").strip()
NEURAL_RATE  = os.environ.get("CHIEF_RATE", "-5%")
NEURAL_PITCH = os.environ.get("CHIEF_PITCH", "+0Hz")

def _probe_neural_voice(voice_name, timeout=4.0):
    """Synthesize a tiny test clip — return True iff Microsoft actually returned audio."""
    if not edge_tts:
        return False
    async def _go():
        path = tempfile.mktemp(suffix=".mp3")
        try:
            c = edge_tts.Communicate("ready", voice_name)
            await asyncio.wait_for(c.save(path), timeout=timeout)
            ok = os.path.exists(path) and os.path.getsize(path) > 200
            try: os.unlink(path)
            except Exception: pass
            return ok
        except Exception:
            try: os.unlink(path)
            except Exception: pass
            return False
    try:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(_go())
        finally:
            loop.close()
    except Exception:
        return False

def _pick_working_voice():
    """Test candidates in order, return the first that produces audio. None if all fail."""
    if NEURAL_VOICE_OVERRIDE:
        # User forced a specific voice — try it but still verify
        if _probe_neural_voice(NEURAL_VOICE_OVERRIDE):
            return NEURAL_VOICE_OVERRIDE
        log(f"Override voice {NEURAL_VOICE_OVERRIDE} failed probe — falling through to candidates")
    for v in VOICE_CANDIDATES:
        if _probe_neural_voice(v):
            log(f"Voice probe OK: {v}")
            return v
        log(f"Voice probe FAILED: {v}")
    return None

class Voice:
    NEURAL_FAILURE_THRESHOLD = 3   # after this many consecutive fails, lock to SAPI

    def __init__(self):
        self.last_say = 0
        self.q: "queue.Queue[tuple[str,bool]]" = queue.Queue()
        self._neural_fail_streak = 0
        self._neural_locked_off = False
        # Pick a neural voice that ACTUALLY works right now (Microsoft rate-limits
        # / deprecates specific voices — DavisNeural has been failing as of 2026).
        self.neural_voice = None
        if edge_tts and PYGAME_OK:
            self.neural_voice = _pick_working_voice()
        self.use_neural = bool(self.neural_voice)
        # SAPI fallback always primed
        try:
            self.sapi = win32com.client.Dispatch("SAPI.SpVoice")
            self.sapi.Rate = -1   # slightly slower = smoother
            self.sapi.Volume = 100
            # Pick softest installed voice (Zira > Hazel > David > Mark)
            best = None
            voices = self.sapi.GetVoices()
            for i in range(voices.Count):
                v = voices.Item(i)
                desc = v.GetDescription()
                for pref in ("Aria", "Zira", "Hazel", "Mark", "David"):
                    if pref in desc:
                        if best is None or pref in ("Aria", "Zira"):
                            best = v; break
            if best is not None:
                self.sapi.Voice = best
                log(f"SAPI fallback voice: {best.GetDescription()}")
            else:
                log("SAPI fallback voice: default")
        except Exception as e:
            log(f"SAPI init failed: {e}")
            self.sapi = None

        # Worker thread for neural playback
        if self.use_neural:
            log(f"Voice: NEURAL ({self.neural_voice})  rate={NEURAL_RATE}  pitch={NEURAL_PITCH}")
            self._worker = threading.Thread(target=self._neural_worker, daemon=True)
            self._worker.start()
        else:
            log("Voice: SAPI fallback (all neural candidates failed or pygame/edge-tts missing)")

    def say(self, text, urgent=False, min_gap=0.8):
        now = time.time()
        if not urgent and (now - self.last_say) < min_gap:
            return
        self.last_say = now
        log(f"SAY: {text}")
        # If neural has been locked off (too many failures), always use SAPI now.
        if self.use_neural and not self._neural_locked_off:
            if urgent:
                try:
                    while True:
                        self.q.get_nowait()
                except queue.Empty:
                    pass
                try: pygame.mixer.music.stop()
                except Exception: pass
            self.q.put((text, urgent))
        else:
            self._sapi_speak(text, urgent)

    def _sapi_speak(self, text, urgent):
        if not self.sapi: return
        try:
            flags = 1 | (2 if urgent else 0)  # ASYNC | PURGE_BEFORE_SPEAK
            self.sapi.Speak(text, flags)
        except Exception as e:
            log(f"SAPI speak failed: {e}")

    def _thread_sapi_speak(self, text, urgent):
        """Called from the neural worker thread — uses the thread-local SAPI instance."""
        sapi = getattr(self, "_thread_sapi", None)
        if not sapi:
            log("thread SAPI unavailable; using main SAPI")
            return self._sapi_speak(text, urgent)
        try:
            flags = 1 | (2 if urgent else 0)
            sapi.Speak(text, flags)
        except Exception as e:
            log(f"thread-SAPI speak failed: {e}")

    def _neural_worker(self):
        # CRITICAL: SAPI is COM-based. If we ever fall back to SAPI from this worker
        # thread, COM must be initialized in this thread or every call fails with -2147352567.
        if pythoncom:
            try: pythoncom.CoInitialize()
            except Exception as e: log(f"CoInitialize failed: {e}")
        # Build a separate SAPI instance bound to this thread (safer than sharing the main one)
        try:
            self._thread_sapi = win32com.client.Dispatch("SAPI.SpVoice")
            self._thread_sapi.Rate = self.sapi.Rate if self.sapi else -1
            if self.sapi:
                try: self._thread_sapi.Voice = self.sapi.Voice
                except Exception: pass
        except Exception as e:
            log(f"thread-SAPI init failed: {e}")
            self._thread_sapi = None

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        while True:
            try:
                text, urgent = self.q.get()
                ok = False
                try:
                    path = loop.run_until_complete(self._synth(text))
                    if path:
                        pygame.mixer.music.load(path)
                        pygame.mixer.music.play()
                        # wait for finish (with safety timeout)
                        start = time.time()
                        while pygame.mixer.music.get_busy() and time.time() - start < 30:
                            time.sleep(0.05)
                        try: os.unlink(path)
                        except Exception: pass
                        ok = True
                except Exception as e:
                    log(f"neural playback error: {e}")

                if ok:
                    self._neural_fail_streak = 0
                else:
                    self._neural_fail_streak += 1
                    log(f"neural fail #{self._neural_fail_streak} — using SAPI for this line")
                    # Use the THREAD-LOCAL SAPI instance (CoInitialized in this thread)
                    self._thread_sapi_speak(text, urgent)
                    if self._neural_fail_streak >= self.NEURAL_FAILURE_THRESHOLD and not self._neural_locked_off:
                        self._neural_locked_off = True
                        log("Neural voice locked OFF — too many failures. Using SAPI for the rest of this session.")
                        self._thread_sapi_speak("Neural voice unavailable. Switching to standard voice.", urgent=False)
            except Exception as e:
                log(f"neural worker outer error: {e}")
                time.sleep(0.5)

    async def _synth(self, text):
        try:
            path = tempfile.mktemp(suffix=".mp3")
            # Only pass rate/pitch when explicitly non-default — Microsoft API rejects "+0%" / "+0Hz"
            # combinations on some voices and returns "No audio was received".
            kwargs = {}
            if NEURAL_RATE and NEURAL_RATE not in ("+0%", "0%", "+0", "0"):
                kwargs["rate"] = NEURAL_RATE
            if NEURAL_PITCH and NEURAL_PITCH not in ("+0Hz", "0Hz", "+0", "0"):
                kwargs["pitch"] = NEURAL_PITCH
            communicate = edge_tts.Communicate(text, self.neural_voice, **kwargs)
            await communicate.save(path)
            # Verify the file actually has audio (Microsoft sometimes saves an empty file)
            if not os.path.exists(path) or os.path.getsize(path) < 200:
                log("edge-tts produced empty file")
                try: os.unlink(path)
                except Exception: pass
                return None
            return path
        except Exception as e:
            log(f"edge-tts synth failed: {e}")
            return None

voice = Voice()

# ---------------- Phrase banks ----------------
AMBIENT_TIPS = [
    "Chief here. Standing by for telemetry.",
    "Brake later than you think — most drivers leave time on the table.",
    "Smooth steering equals fast steering. Less is more.",
    "Trail brake into the apex. Throttle out from the apex. Every corner.",
    "Eyes up. Look where you want the car to go.",
    "Tire temps before pace. Cold tires plus fast laps equals a wreck.",
    "Slow in, fast out. Every single time.",
    "Manage tires early, push hard late.",
    "Watch your delta. Negative delta means you're cooking it.",
    "Deep breath every straight. Reset for the next corner.",
]
LINES_FAST = ["Pace is good — hold it.", "Banker lap. Build on it.", "That's the rhythm.", "Repeat that lap."]
LINES_SLOW = ["Tenth slower — fix one corner.", "Off pace. Reset and attack.", "Find time in your weakest sector.", "Lift earlier or later — pick one corner."]
LINES_INC  = ["Incident logged. Cool down — money is in finishing.", "X recorded. Settle two laps before pushing.", "Mistake is cheaper than a wreck. Recompose."]
LINES_FUEL_LOW = ["Fuel tight — save in the straights.", "Watch your fuel — splash may be needed.", "Lift early off the throttle to extend stint."]
LINES_DELTA_UP = ["Up a tenth.", "Two tenths up.", "Faster than your best.", "Build on this.", "Carrying more speed — hold it."]
LINES_DELTA_DOWN = ["Down a tenth.", "Two tenths off.", "You're losing time.", "Reset focus.", "Find the brake marker again."]
LINES_FLAG = {
    "green": ["Green green green — go.", "Track's green."],
    "yellow": ["Yellow flag — caution.", "Yellow — back off."],
    "blue": ["Blue flag — let the leader by.", "Blue — leader behind."],
    "white": ["White flag — last lap.", "One to go."],
    "checkered": ["Checkered — bring it home clean.", "Checkered — well driven."],
    "red": ["Red flag — session stopped.", "Red — pit lane."],
}
PRE_CORNER = [
    "Brake here.", "Big brake zone.", "Turn in.", "Late apex.", "Track out smooth.",
    "Patience on throttle.", "Trail brake in.", "Carry speed.", "Tight line.",
]
# High-importance corner cues — corners with long straight after = lap-time gold
PRE_CORNER_IMPORTANT = [
    "Money corner — sacrifice entry for exit.",
    "Long straight after — earlier throttle.",
    "Exit matters here. Diamond it.",
    "Big gain available — open the wheel for exit speed.",
    "This one feeds the straight. Don't waste it.",
    "Late apex, full power as soon as you can see exit.",
]
# Corner-specific instructional cues mapped to driving issues
CUE_OVERSLOW = ["Minimum speed too low.", "You're over-slowing here.", "Carry more speed in.", "Don't bleed the brakes — release them sooner."]
CUE_LATE_THROTTLE = ["Earlier on throttle.", "Pick up the gas sooner.", "You're delaying the throttle.", "Get to power before apex tracks out."]
CUE_EARLY_BRAKE = ["Brake later — 10 feet deeper.", "Too early on brake. Keep building speed.", "Push the brake marker."]
CUE_LIFT_OFF = ["You lifted mid-corner — commit.", "Don't lift here. Trust the front.", "Smooth throttle, no lift."]
CUE_CORRECTION = ["You corrected steering — preserve front grip.", "Pinching the front — open the wheel.", "Two inputs cost time. One smooth arc."]
CUE_TIRE_PROTECT = ["Protect right rear here.", "Save the front tires this corner.", "Don't overload — short shift if needed."]
QUALI_CUES = ["Send it.", "All in this lap.", "Maximum attack.", "Banker first, then risk."]
RACE_CUES = ["Smooth — preserve the car.", "Save tire here.", "Don't fight the car.", "Patience pays.", "Set him up for the next corner."]
GENERIC_PUSH = [
    "Eyes up.", "Smooth hands.", "Hit your marks.", "Build the lap.", "One corner at a time.",
    "Carry minimum speed.", "Throttle when you see the exit.", "Don't overdrive.",
]

# ---------------- iRacing feed ----------------
class IRacingFeed:
    def __init__(self):
        self.ir = irsdk.IRSDK() if irsdk else None
        self.connected = False

    def tick(self):
        if not self.ir: return None
        if not self.connected:
            try:
                if self.ir.startup() and self.ir.is_initialized and self.ir.is_connected:
                    self.connected = True
                    log("iRacing connected.")
                    # Greeting handled by main loop's edge detector to avoid double-speaking.
                else:
                    return None
            except Exception:
                return None
        try:
            if not self.ir.is_connected:
                self.connected = False
                # Disconnect greeting handled by main loop's edge detector.
                return None
        except Exception:
            self.connected = False; return None
        try:
            return {
                "lap": int(self.ir["Lap"] or 0),
                "lap_complete": int(self.ir["LapCompleted"] or 0),
                "lap_dist_pct": float(self.ir["LapDistPct"] or 0),
                "lap_time_last": float(self.ir["LapLastLapTime"] or 0),
                "lap_time_best": float(self.ir["LapBestLapTime"] or 0),
                "lap_time_current": float(self.ir["LapCurrentLapTime"] or 0),
                "delta_best": float(self.ir["LapDeltaToBestLap"] or 0),
                "delta_session_best": float(self.ir["LapDeltaToSessionBestLap"] or 0),
                "incidents": int(self.ir["PlayerCarMyIncidentCount"] or 0),
                "fuel_pct": float(self.ir["FuelLevelPct"] or 0) * 100,
                "speed_mph": float(self.ir["Speed"] or 0) * 2.23694,
                "rpm": float(self.ir["RPM"] or 0),
                "gear": int(self.ir["Gear"] or 0),
                "throttle": float(self.ir["Throttle"] or 0),
                "brake": float(self.ir["Brake"] or 0),
                "steer": float(self.ir["SteeringWheelAngle"] or 0),
                "on_track": bool(self.ir["IsOnTrackCar"]),
                "on_pit_road": bool(self.ir["OnPitRoad"]),
                "session_flags": int(self.ir["SessionFlags"] or 0),
                "session_time": float(self.ir["SessionTime"] or 0),
                "position": int(self.ir["PlayerCarPosition"] or 0),
                "class_position": int(self.ir["PlayerCarClassPosition"] or 0),
                "tire_lf_temp": float(self.ir["LFtempCM"] or 0),
                "tire_rf_temp": float(self.ir["RFtempCM"] or 0),
                "tire_lr_temp": float(self.ir["LRtempCM"] or 0),
                "tire_rr_temp": float(self.ir["RRtempCM"] or 0),
                # GPS for track map rendering
                "lat": float(self.ir["Lat"] or 0),
                "lon": float(self.ir["Lon"] or 0),
                "alt": float(self.ir["Alt"] or 0),
                "lap_dist_m": float(self.ir["LapDist"] or 0),
                "yaw": float(self.ir["Yaw"] or 0),
                # Identity for reference matching
                "track_name": (self.ir["WeekendInfo"] or {}).get("TrackDisplayName") if self.ir["WeekendInfo"] else "",
                "track_config": (self.ir["WeekendInfo"] or {}).get("TrackConfigName") if self.ir["WeekendInfo"] else "",
            }
        except Exception:
            return None

# ---------------- Race engineer ----------------
DNA_PATH = os.path.join(os.path.expanduser("~"), "Desktop", "chief-autocapture", "driver-dna.json")
COACHING_MODE = os.environ.get("CHIEF_MODE", "practice").lower()  # practice | qualify | race | training

def load_dna():
    try:
        if os.path.exists(DNA_PATH):
            import json
            with open(DNA_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception: pass
    return {
        "tendencies": {
            "overslow": 0,        # times over-slowing detected
            "late_throttle": 0,   # times throttle picked up too late
            "early_brake": 0,     # times braking too early
            "tire_abuse": 0,      # times pushing tire temp critical
            "lift_off": 0,        # mid-corner lifts
            "corrections": 0,     # steering corrections detected
        },
        "personal_bests": {},     # car|track -> {best_lap, best_sectors[], best_avg}
        "session_count": 0,
        "tracks_run": [],
        "preferred_lines": {},
    }

def save_dna(dna):
    try:
        import json
        with open(DNA_PATH, "w", encoding="utf-8") as f:
            json.dump(dna, f, indent=2)
    except Exception as e:
        log(f"DNA save failed: {e}")

# ---------------- Corner Insights ----------------
# This is the live in-ear corner coach. After each completed lap, we segment the
# trace by detected corner and compute per-corner metrics: peak brake pressure,
# brake-zone length, entry speed, apex (min) speed, exit speed, and gear at apex.
# We compare each metric to the reference (best lap). When the driver approaches
# a corner, we speak the SINGLE most costly weakness for that corner — Delta-style
# insights, but BEFORE the corner, not after the session.

class CornerInsights:
    # How big a window around the corner pct we sample for entry / apex / exit metrics.
    # Numbers are fractions of total lap (lap_dist_pct).
    BRAKE_ZONE_BACK = 0.020   # look back ~2% of lap for brake zone start
    ENTRY_WINDOW    = 0.005   # 0.5% of lap before apex pct = "entry"
    APEX_WINDOW     = 0.003   # 0.3% of lap centred on apex
    EXIT_WINDOW     = 0.010   # 1% of lap after apex = "exit"

    # Thresholds that decide whether a weakness is worth speaking.
    SPEAK_BRAKE_DELTA  = 0.05   # 5% more brake force than ref
    SPEAK_ENTRY_MPH    = 4.0    # 4mph slower than ref
    SPEAK_APEX_MPH     = 3.0    # 3mph slower at apex
    SPEAK_EXIT_MPH     = 3.0    # 3mph slower exiting
    SPEAK_GEAR_DELTA   = 1      # one gear low

    def __init__(self):
        # corner_pct -> {"my": {...latest metrics...}, "ref": {...reference metrics...},
        #                "weakness": "brake"|"entry"|"apex"|"exit"|"gear"|None,
        #                "phrase": "spoken cue"}
        self.by_corner = {}

    @staticmethod
    def _slice_around(trace, center_pct, half_window):
        lo, hi = center_pct - half_window, center_pct + half_window
        return [s for s in trace if lo <= s["pct"] <= hi]

    @staticmethod
    def _slice_before(trace, end_pct, length):
        lo, hi = end_pct - length, end_pct
        return [s for s in trace if lo <= s["pct"] <= hi]

    @staticmethod
    def _slice_after(trace, start_pct, length):
        lo, hi = start_pct, start_pct + length
        return [s for s in trace if lo <= s["pct"] <= hi]

    def _compute_metrics(self, trace, corner_pct):
        """Return brake/entry/apex/exit/gear metrics for ONE corner from a full lap trace."""
        if not trace: return None
        # Brake zone — sustained brake before the apex pct
        brake_window = self._slice_before(trace, corner_pct, self.BRAKE_ZONE_BACK)
        brake_samples = [s["brake"] for s in brake_window if s["brake"] > 0.05]
        peak_brake = max(brake_samples) if brake_samples else 0.0
        avg_brake  = sum(brake_samples) / len(brake_samples) if brake_samples else 0.0

        # Entry speed = speed at start of brake zone (or just before)
        entry = self._slice_before(trace, corner_pct, self.BRAKE_ZONE_BACK)
        entry_speed = entry[0]["speed"] if entry else 0

        # Apex = minimum speed in narrow window centred on corner pct
        apex_win = self._slice_around(trace, corner_pct, self.APEX_WINDOW)
        if apex_win:
            apex_sample = min(apex_win, key=lambda s: s["speed"])
            apex_speed  = apex_sample["speed"]
            apex_gear   = apex_sample["gear"]
        else:
            apex_speed = 0; apex_gear = 0

        # Exit = peak speed in window AFTER apex
        exit_win = self._slice_after(trace, corner_pct, self.EXIT_WINDOW)
        exit_speed = max((s["speed"] for s in exit_win), default=0)

        return {
            "peak_brake": peak_brake,
            "avg_brake":  avg_brake,
            "entry_speed": entry_speed,
            "apex_speed":  apex_speed,
            "apex_gear":   apex_gear,
            "exit_speed":  exit_speed,
        }

    def update_from_lap(self, lap_trace, ref_trace, corners):
        """Recompute metrics for every corner using the lap just completed and the reference lap."""
        if not lap_trace or not corners: return
        for c in corners:
            pct = c["pct"]
            mine = self._compute_metrics(lap_trace, pct)
            if not mine: continue
            ref = self._compute_metrics(ref_trace, pct) if ref_trace else None
            entry = self.by_corner.setdefault(pct, {})
            entry["my"] = mine
            if ref: entry["ref"] = ref
            entry["weakness"], entry["phrase"] = self._pick_worst_weakness(mine, ref, c)

    def _pick_worst_weakness(self, mine, ref, corner_meta):
        """Return (weakness_key, spoken_phrase). Prioritises the most costly issue."""
        if not ref:
            # No reference yet — give a generic but still useful cue
            return None, None

        candidates = []  # (priority_score, key, phrase)

        # Entry speed — easiest fix, biggest gain on long-straight corners
        ent_delta = ref["entry_speed"] - mine["entry_speed"]
        if ent_delta > self.SPEAK_ENTRY_MPH:
            candidates.append((
                ent_delta * (1.5 if corner_meta.get("importance", 0) > 0.6 else 1.0),
                "entry",
                f"Entry {ent_delta:.0f} miles per hour down — brake later.",
            ))

        # Brake force — over-slowing
        bp_delta = mine["peak_brake"] - ref["peak_brake"]
        if bp_delta > self.SPEAK_BRAKE_DELTA:
            candidates.append((
                bp_delta * 100,  # scale up so it competes with mph deltas
                "brake",
                f"Lighter brake here — you're {int(bp_delta*100)} percent harder than your best.",
            ))

        # Apex speed
        ap_delta = ref["apex_speed"] - mine["apex_speed"]
        if ap_delta > self.SPEAK_APEX_MPH:
            candidates.append((
                ap_delta,
                "apex",
                f"Carry {ap_delta:.0f} more miles per hour through apex.",
            ))

        # Gear at apex
        gear_delta = ref["apex_gear"] - mine["apex_gear"]
        if gear_delta >= self.SPEAK_GEAR_DELTA and ref["apex_gear"] > 0:
            candidates.append((
                gear_delta * 5,
                "gear",
                f"Stay in {int(ref['apex_gear'])}th — you're a gear low.",
            ))

        # Exit speed
        ex_delta = ref["exit_speed"] - mine["exit_speed"]
        if ex_delta > self.SPEAK_EXIT_MPH:
            # Exit is most important on corners feeding straights
            mult = 2.0 if corner_meta.get("importance", 0) > 0.6 else 1.0
            candidates.append((
                ex_delta * mult,
                "exit",
                f"Exit speed {ex_delta:.0f} down — earlier throttle, open the wheel.",
            ))

        if not candidates:
            return None, None
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1], candidates[0][2]

    def phrase_for(self, corner_pct):
        """Return the spoken phrase for a corner, or None if no insight yet."""
        rec = self.by_corner.get(corner_pct)
        if not rec: return None
        return rec.get("phrase")


class Engineer:
    def __init__(self):
        # Corner learning: list of dicts with importance ranking
        self.corners = []                # [{pct, importance, name?}]
        self.corner_importance = {}      # pct -> 0..1 score (long straight after = high)
        self._brake_zone_open = False
        self._brake_zone_start = None
        self._learned_lap = -1
        self.last_corner_call_pct = -1
        self.last_corner_idx = -1

        # Telemetry trace per lap for WHY-delta analysis
        self.lap_trace = deque(maxlen=4000)   # (pct, speed, throttle, brake, steer, gear, rpm, t)
        self.best_lap_trace = None             # snapshot of best lap's trace
        self.last_completed_trace = None       # most recently completed lap's full trace

        # Per-corner insights — the live in-ear coaching brain
        self.insights = CornerInsights()

        # DNA — driver tendencies persisted across sessions
        self.dna = load_dna()
        self.dna["session_count"] = self.dna.get("session_count", 0) + 1

        # Coaching mode
        self.mode = COACHING_MODE
        log(f"Coaching mode: {self.mode.upper()}")

        # Sector tracking — splits the lap into 3 thirds (S1/S2/S3) by lap_dist_pct
        self.sector_starts = [0.0, 0.333, 0.666]
        self.current_sector = 0
        self.sector_enter_time = None
        self.current_lap_sectors = [None, None, None]   # times for sectors of current lap
        self.best_sectors = [None, None, None]          # personal best per sector
        self.last_lap_id = -1
        self.last_sector_call = 0

        # State trackers
        self.last_lap_complete = -1
        self.last_incidents = -1
        self.last_flag_state = None
        self.last_fuel_warn = 0
        self.last_delta_call = 0
        self.last_delta_value = 0
        self.last_position = -1
        self.last_tire_warn = 0
        self.last_filler_speak = 0
        self.lap_times = deque(maxlen=10)
        self.spoke_session_start = False

    # ---- corner learning + importance ranking ----
    def learn_corner(self, data):
        """Detect brake zones AND throttle-out zones to rank corner importance."""
        b = data["brake"]
        t = data["throttle"]
        pct = data["lap_dist_pct"]
        if b > 0.30 and not self._brake_zone_open:
            self._brake_zone_open = True
            self._brake_zone_start = pct
        elif b < 0.05 and self._brake_zone_open:
            self._brake_zone_open = False
            mid = self._brake_zone_start
            if mid is not None and not any(abs(c["pct"] - mid) < 0.02 for c in self.corners):
                self.corners.append({"pct": mid, "importance": 0.5})
                self.corners.sort(key=lambda c: c["pct"])
                log(f"Corner learned at LapDistPct={mid:.3f}  (total={len(self.corners)})")

        # Importance: track the longest sustained-throttle period after each corner
        # If we see >2s of throttle > 95% after a corner, that corner is "important"
        if self.corners and t > 0.95:
            # Find the most recent corner before our current pct
            recent = None
            for c in self.corners:
                if c["pct"] < pct and pct - c["pct"] < 0.20:
                    recent = c
            if recent:
                # estimate straight length by how far we've gone with full throttle
                straight_len = pct - recent["pct"]
                if straight_len > recent["importance"] / 5:
                    recent["importance"] = min(1.0, straight_len * 5)

    def pre_corner_callout(self, data):
        """If we're approaching a known corner, speak before braking.

        Priority order:
          1. Data-driven insight from CornerInsights (specific weakness vs reference)
          2. Importance-based gold-cue (corners feeding long straights)
          3. Mode-flavored generic cue (qualify / race / practice)
        """
        if not self.corners: return False
        pct = data["lap_dist_pct"]
        for c in self.corners:
            d = c["pct"] - pct
            if 0 < d < 0.015:
                if abs(c["pct"] - self.last_corner_call_pct) < 0.001:
                    return False
                self.last_corner_call_pct = c["pct"]
                # 1. Data-driven insight wins if available — speak the SPECIFIC weakness
                #    for this corner from the most recent completed lap vs reference.
                phrase = self.insights.phrase_for(c["pct"])
                if phrase:
                    voice.say(phrase, min_gap=0.4)
                    return True
                # 2. Important corner gets the gold-cue list
                if c["importance"] > 0.6:
                    voice.say(random.choice(PRE_CORNER_IMPORTANT), min_gap=0.4)
                else:
                    # 3. Mode-specific flavoring
                    if self.mode == "qualify":
                        voice.say(random.choice(QUALI_CUES + PRE_CORNER), min_gap=0.4)
                    elif self.mode == "race":
                        voice.say(random.choice(RACE_CUES + PRE_CORNER), min_gap=0.4)
                    else:
                        voice.say(random.choice(PRE_CORNER), min_gap=0.4)
                return True
        return False

    # ---- Trace collection for WHY-delta analysis + per-corner insights ----
    def trace_tick(self, data, now):
        self.lap_trace.append({
            "pct": data["lap_dist_pct"],
            "speed": data["speed_mph"],
            "throttle": data["throttle"],
            "brake": data["brake"],
            "steer": data["steer"],
            "gear": data["gear"],
            "rpm": data["rpm"],
            "lat": data.get("lat", 0),
            "lon": data.get("lon", 0),
            "yaw": data.get("yaw", 0),
            "lap_dist_m": data.get("lap_dist_m", 0),
            "t": now,
        })

    def snapshot_best_lap(self):
        """Save current trace as best-lap reference for future comparisons."""
        if len(self.lap_trace) > 100:
            self.best_lap_trace = list(self.lap_trace)
            log(f"Best-lap reference saved ({len(self.best_lap_trace)} samples)")

    def try_load_reference_pack(self, car, track, track_config=""):
        """Look for a reference pack matching the current car+track and use it as
        the initial best_lap_trace. Lets in-ear insights kick in immediately,
        before the driver has set their own banker lap.

        Reference files live at ~/Documents/ChiefAutoCapture/references/*.json
        Filename naming convention is car__track[-config]__tag.json — but we
        actually compare on the JSON's `car` / `track` / `track_config` fields,
        so the filename can be anything as long as the contents match.
        """
        if self.best_lap_trace:
            return  # already have a reference (user beat the pro lap or pack already loaded)
        try:
            import json as _json
            ref_dir = os.path.join(os.path.expanduser("~"), "Documents", "ChiefAutoCapture", "references")
            if not os.path.isdir(ref_dir):
                return
            car_l   = (car or "").lower()
            track_l = (track or "").lower()
            cfg_l   = (track_config or "").lower()
            best_match = None
            best_match_time = None
            for name in os.listdir(ref_dir):
                if not name.endswith(".json") or name == "index.json":
                    continue
                try:
                    with open(os.path.join(ref_dir, name), "r", encoding="utf-8") as f:
                        pack = _json.load(f)
                except Exception:
                    continue
                if (pack.get("car") or "").lower() != car_l: continue
                if (pack.get("track") or "").lower() != track_l: continue
                if cfg_l and (pack.get("track_config") or "").lower() != cfg_l: continue
                lt = pack.get("lap_time")
                if best_match is None or (lt is not None and (best_match_time is None or lt < best_match_time)):
                    best_match = pack
                    best_match_time = lt
            if best_match and best_match.get("samples"):
                self.best_lap_trace = best_match["samples"]
                log(f"Reference pack loaded: {best_match.get('driver') or '?'} @ "
                    f"{best_match.get('lap_time')}s ({len(self.best_lap_trace)} samples). "
                    f"In-ear insights active from lap 2.")
        except Exception as e:
            log(f"reference pack load failed: {e}")

    def why_delta(self, data, now):
        """When delta moves significantly, explain WHY by comparing trace at this pct vs best-lap trace."""
        if not self.best_lap_trace: return
        pct = data["lap_dist_pct"]
        # Find best-lap sample at same pct
        ref = None
        for s in self.best_lap_trace:
            if abs(s["pct"] - pct) < 0.01:
                ref = s; break
        if not ref: return

        # Compare key inputs
        speed_delta = data["speed_mph"] - ref["speed"]
        brake_delta = data["brake"] - ref["brake"]
        throttle_delta = data["throttle"] - ref["throttle"]

        # Speak only when something is meaningfully different AND we're losing time
        if data["delta_best"] > 0.10 and now - self.last_delta_call > 6:
            if brake_delta > 0.15 and ref["brake"] < 0.1:
                voice.say(random.choice(CUE_EARLY_BRAKE))
                self.dna["tendencies"]["early_brake"] += 1
                self.last_delta_call = now
            elif speed_delta < -3 and abs(data["steer"]) > 0.3:
                voice.say(random.choice(CUE_OVERSLOW))
                self.dna["tendencies"]["overslow"] += 1
                self.last_delta_call = now
            elif throttle_delta < -0.20 and ref["throttle"] > 0.6:
                voice.say(random.choice(CUE_LATE_THROTTLE))
                self.dna["tendencies"]["late_throttle"] += 1
                self.last_delta_call = now

    # ---- flag change ----
    def flag_change(self, data):
        f = data["session_flags"]
        # Bit flags from iRacing — simplified mapping
        flag_state = None
        if f & 0x00000004: flag_state = "yellow"
        elif f & 0x00000008: flag_state = "red"
        elif f & 0x00000010: flag_state = "blue"
        elif f & 0x00001000: flag_state = "white"
        elif f & 0x00000400: flag_state = "checkered"
        elif f & 0x00000001: flag_state = "green"
        if flag_state and flag_state != self.last_flag_state:
            self.last_flag_state = flag_state
            voice.say(random.choice(LINES_FLAG.get(flag_state, ["Flag change."])), urgent=True)

    # ---- sector tracking ----
    def update_sectors(self, data, now):
        """Track per-sector times. When you cross into a new sector, compare to your best."""
        pct = data["lap_dist_pct"]
        lap = data["lap_complete"]

        # Reset on new lap
        if lap != self.last_lap_id:
            # Lap rolled over → finalize last sector if any
            if self.sector_enter_time and self.current_sector >= 0:
                t = now - self.sector_enter_time
                if 5 < t < 120:
                    self.current_lap_sectors[self.current_sector] = t
                    self._maybe_speak_sector(self.current_sector, t)
            # Update bests from completed lap before resetting
            for i, st in enumerate(self.current_lap_sectors):
                if st and (self.best_sectors[i] is None or st < self.best_sectors[i]):
                    self.best_sectors[i] = st
                    if self.last_lap_id >= 0:
                        voice.say(f"Sector {i+1} personal best, {st:.2f}.", min_gap=0.4)
            self.current_lap_sectors = [None, None, None]
            self.current_sector = 0
            self.sector_enter_time = now
            self.last_lap_id = lap
            return

        # Detect sector boundary crossing
        target_sector = 2 if pct >= 0.666 else (1 if pct >= 0.333 else 0)
        if target_sector != self.current_sector:
            if self.sector_enter_time:
                t = now - self.sector_enter_time
                if 3 < t < 120:
                    self.current_lap_sectors[self.current_sector] = t
                    self._maybe_speak_sector(self.current_sector, t)
            self.current_sector = target_sector
            self.sector_enter_time = now

    def _maybe_speak_sector(self, idx, t):
        """Speak sector time vs personal best."""
        now = time.time()
        if now - self.last_sector_call < 4:
            return
        best = self.best_sectors[idx]
        sector_name = ["sector one", "sector two", "sector three"][idx]
        if best is None:
            voice.say(f"{sector_name}: {t:.2f}. Reference set.", min_gap=0.4)
        else:
            delta = t - best
            if delta < -0.10:
                voice.say(f"{sector_name} fast — {t:.2f}, down {abs(delta)*10:.0f} tenths on best.", min_gap=0.4)
            elif delta > 0.20:
                voice.say(f"{sector_name} slow — {t:.2f}, up {delta*10:.0f} tenths on best. Find time there.", min_gap=0.4)
            elif abs(delta) < 0.10:
                voice.say(f"{sector_name} steady at {t:.2f}.", min_gap=0.4)
        self.last_sector_call = now

    # ---- delta callouts ----
    def delta_callout(self, data, now):
        d = data["delta_best"]
        if abs(d) < 0.05: return  # ignore noise
        if now - self.last_delta_call < 5: return
        if abs(d - self.last_delta_value) < 0.10: return
        if d < 0:
            tenths = abs(int(d * 10))
            if tenths == 0: return
            if tenths == 1: voice.say("Down a tenth on best.")
            elif tenths == 2: voice.say("Two tenths up. Keep building.")
            else: voice.say(f"Up {tenths} tenths. Banker pace.")
        else:
            tenths = int(d * 10)
            if tenths == 0: return
            if tenths == 1: voice.say("Tenth off best.")
            elif tenths <= 3: voice.say(f"{tenths} tenths off. Find it.")
            else: voice.say(f"Half second off. Reset.")
        self.last_delta_call = now
        self.last_delta_value = d

    # ---- lap complete ----
    def on_lap_complete(self, data):
        if data["lap_complete"] != self.last_lap_complete and data["lap_time_last"] > 30:
            t = data["lap_time_last"]
            self.lap_times.append(t)
            mins = int(t // 60); secs = t - mins * 60
            timestr = f"{mins} {secs:05.2f}" if mins else f"{secs:.2f}"
            avg = sum(list(self.lap_times)[-5:]) / min(5, len(self.lap_times))
            best = data["lap_time_best"]
            # If this lap is the new best — snapshot the trace as reference
            if best > 0 and abs(t - best) < 0.05:
                self.snapshot_best_lap()
            if t < avg - 0.15:
                voice.say(f"Lap {data['lap_complete']}: {timestr}. {random.choice(LINES_FAST)}", urgent=True)
            elif t > avg + 0.30:
                voice.say(f"Lap {data['lap_complete']}: {timestr}. {random.choice(LINES_SLOW)}", urgent=True)
            else:
                voice.say(f"Lap {data['lap_complete']}: {timestr}. Steady.", urgent=True)
            # Snapshot the just-completed lap's trace so insights can compare it to ref
            self.last_completed_trace = list(self.lap_trace)
            # Persist trace to disk so the web app (chiefracing.com) can render the
            # Delta-style telemetry overlay (speed/throttle/brake/steer vs reference).
            try:
                import json as _json
                from pathlib import Path as _Path
                trace_dir = _Path.home() / "Documents" / "ChiefAutoCapture" / "traces"
                trace_dir.mkdir(parents=True, exist_ok=True)
                fname = trace_dir / f"lap_{int(time.time())}_l{data['lap_complete']}.json"
                # Look up car name from the iRacing feed
                car_name = ""
                try:
                    if "FEED_REF" in globals() and FEED_REF and FEED_REF.ir and FEED_REF.ir.is_connected:
                        d = FEED_REF.ir["DriverInfo"] or {}
                        ci = d.get("DriverCarIdx", 0)
                        drvs = d.get("Drivers") or []
                        if 0 <= ci < len(drvs):
                            car_name = drvs[ci].get("CarScreenName", "") or ""
                except Exception:
                    pass
                _payload = {
                    "lap": data["lap_complete"],
                    "lap_time": t,
                    "ts": datetime.now().isoformat(),
                    "track": data.get("track_name") or "",
                    "track_config": data.get("track_config") or "",
                    "car": car_name,
                    "email": os.environ.get("CHIEF_USER_EMAIL", "racer3553@gmail.com"),
                    "daemon_email": os.environ.get("CHIEF_USER_EMAIL", "racer3553@gmail.com"),
                    "samples": self.last_completed_trace,
                }
                fname.write_text(_json.dumps(_payload))
                # Push to the cloud immediately in a background thread (don't block coaching)
                def _push_trace_bg(payload):
                    try:
                        import requests as _r
                        api = os.environ.get(
                            "CHIEF_API_TRACE",
                            "https://chiefracing.com/api/sessions/auto-capture-trace"
                        )
                        # Sanitize null bytes for Postgres jsonb
                        def _sanitize(o):
                            if isinstance(o, str):
                                return "".join(c for c in o if c == "\t" or c == "\n" or c == "\r" or ord(c) >= 0x20)
                            if isinstance(o, dict): return {k: _sanitize(v) for k, v in o.items()}
                            if isinstance(o, list): return [_sanitize(v) for v in o]
                            return o
                        r = _r.post(api, json=_sanitize(payload), timeout=8)
                        if r.status_code in (200, 201):
                            log(f"trace pushed → cloud (lap {payload.get('lap')})")
                        else:
                            log(f"trace push failed HTTP {r.status_code}: {(r.text or '')[:160]}")
                    except Exception as _ex:
                        log(f"trace push exception: {_ex}")
                threading.Thread(target=_push_trace_bg, args=(_payload,), daemon=True).start()
            except Exception as _e:
                log(f"trace dump failed: {_e}")
            # Recompute per-corner insights using this lap vs reference (best) lap
            try:
                self.insights.update_from_lap(
                    self.last_completed_trace,
                    self.best_lap_trace,
                    self.corners,
                )
                # Log the spoken plan for the next lap so we can see it in chief-coach.log
                planned = [
                    f"pct={c['pct']:.3f} → {self.insights.phrase_for(c['pct'])}"
                    for c in self.corners if self.insights.phrase_for(c['pct'])
                ]
                if planned:
                    log("Corner cues for next lap:\n  " + "\n  ".join(planned))
            except Exception as e:
                log(f"insights update failed: {e}")
            # New lap → reset trace buffer
            self.lap_trace.clear()
            self.last_lap_complete = data["lap_complete"]
            # Save DNA periodically
            if data["lap_complete"] % 3 == 0:
                save_dna(self.dna)
        elif self.last_lap_complete < 0:
            self.last_lap_complete = data["lap_complete"]

    # ---- incidents ----
    def on_incident(self, data):
        if self.last_incidents < 0:
            self.last_incidents = data["incidents"]; return
        if data["incidents"] > self.last_incidents:
            voice.say(random.choice(LINES_INC), urgent=True)
            self.last_incidents = data["incidents"]

    # ---- fuel ----
    def fuel_warn(self, data, now):
        if data["fuel_pct"] < 15 and now - self.last_fuel_warn > 45:
            voice.say(random.choice(LINES_FUEL_LOW))
            self.last_fuel_warn = now

    # ---- tires ----
    def tire_warn(self, data, now):
        if now - self.last_tire_warn < 60: return
        temps = [data["tire_lf_temp"], data["tire_rf_temp"], data["tire_lr_temp"], data["tire_rr_temp"]]
        if any(t > 110 for t in temps):
            voice.say("Tires are running hot. Back off a corner or two.")
            self.last_tire_warn = now
        elif all(t < 60 and t > 0 for t in temps):
            voice.say("Tires are cold — build temp before pushing.")
            self.last_tire_warn = now

    # ---- position ----
    def position_change(self, data):
        p = data["position"]
        if self.last_position < 0:
            self.last_position = p; return
        if p < self.last_position:
            voice.say(f"Up to P{p}. Hold position.", urgent=True)
        elif p > self.last_position:
            voice.say(f"Dropped to P{p}. Get it back.", urgent=True)
        self.last_position = p

    # ---- session start greeting ----
    def session_start(self, data):
        if not self.spoke_session_start and data["on_track"]:
            voice.say(f"On track. P{data['position']}. Build the rhythm.", urgent=True)
            self.spoke_session_start = True
        # Try once per session to load a matching reference pack so insights work
        # from the very first flying lap (instead of waiting for the driver's PB).
        if not self.best_lap_trace and data.get("on_track"):
            try:
                # We pull car/track from the iRacing feed via the feed object that
                # owns ir; the data dict we get here doesn't carry car name yet,
                # so we look it up directly from the global irsdk handle.
                car = ""
                track = data.get("track_name", "") or ""
                config = data.get("track_config", "") or ""
                # Best effort: scan the WeekendInfo / DriverInfo
                try:
                    if "FEED_REF" in globals():
                        ir = FEED_REF.ir if FEED_REF else None
                        if ir and ir.is_connected:
                            d = ir["DriverInfo"] or {}
                            ci = d.get("DriverCarIdx", 0)
                            drvs = d.get("Drivers") or []
                            if 0 <= ci < len(drvs):
                                car = drvs[ci].get("CarScreenName", "") or ""
                            w = ir["WeekendInfo"] or {}
                            track = track or w.get("TrackDisplayName", "")
                            config = config or w.get("TrackConfigName", "")
                except Exception:
                    pass
                if track:
                    self.try_load_reference_pack(car, track, config)
            except Exception as e:
                log(f"session_start ref load: {e}")

    # ---- Filler chatter so we never go silent ----
    def filler(self, data, now):
        # Speak something every ~7-10 seconds even if nothing dramatic happens
        gap = 7 + random.random() * 3
        if now - self.last_filler_speak < gap: return
        if not data["on_track"]:
            return  # in pits, don't fill
        # Pick a context-aware line
        if data["throttle"] < 0.05 and data["brake"] > 0.5:
            voice.say(random.choice(["Big brake — trail in.", "Late apex this one.", "Patience here."]))
        elif data["throttle"] > 0.95:
            voice.say(random.choice(["Eyes up the straight.", "Build it through the next.", "Marker for braking."]))
        else:
            voice.say(random.choice(GENERIC_PUSH))
        self.last_filler_speak = now

# ---------------- Main loop ----------------
# Ambient (off-track) chatter is now OPT-IN — set CHIEF_AMBIENT=1 to enable
# the every-12s training tips. Default behaviour: silent until iRacing connects.
AMBIENT_ENABLED = os.environ.get("CHIEF_AMBIENT", "0").strip() in ("1", "true", "yes", "on")

def main():
    log(f"Live Race Engineer starting. Log: {LOG_PATH}")
    log(f"Ambient (off-track) chatter: {'ENABLED' if AMBIENT_ENABLED else 'DISABLED — will only speak when iRacing is on'}")
    # Single startup confirmation. After this, CHIEF stays SILENT until iRacing connects.
    voice.say("Chief is online. Standing by for iRacing.", urgent=True)
    feed = IRacingFeed()
    eng = Engineer()
    # Expose for the Engineer's reference-pack lookup (needs car/track from iRacing)
    globals()["FEED_REF"] = feed
    last_heartbeat = 0
    last_ambient_tip = 0
    ambient_idx = 0
    # Track connection edges so we speak ONCE on connect/disconnect, not every loop
    was_connected = False

    while True:
        try:
            now = time.time()
            data = feed.tick()
            connected = bool(data)

            # Heartbeat every 3s — log only, doesn't speak
            if now - last_heartbeat > 3:
                if data:
                    log(f"HB iR=ON  L={data['lap']}  pct={data['lap_dist_pct']:.2f}  spd={data['speed_mph']:.0f}  fuel={data['fuel_pct']:.1f}  d={data['delta_best']:+.2f}  inc={data['incidents']}  pos=P{data['position']}  flags={data['session_flags']:#010x}")
                else:
                    log("HB iR=OFF (silent)" if not AMBIENT_ENABLED else "HB iR=OFF (ambient mode)")
                last_heartbeat = now

            # Spoken edge events: connect / disconnect
            if connected and not was_connected:
                voice.say("iRacing connected. Chief on the wheel.", urgent=True)
            elif not connected and was_connected:
                voice.say("iRacing disconnected. Standing by.", urgent=True)
            was_connected = connected

            if data:
                # Session-aware coaching
                eng.session_start(data)
                eng.flag_change(data)
                eng.on_lap_complete(data)
                eng.on_incident(data)
                eng.position_change(data)
                eng.fuel_warn(data, now)
                eng.tire_warn(data, now)

                # On-track stuff
                if data["on_track"] and not data["on_pit_road"]:
                    eng.trace_tick(data, now)        # record telemetry for insights + replay
                    eng.update_sectors(data, now)
                    eng.learn_corner(data)
                    eng.why_delta(data, now)         # explain delta moves vs reference
                    if not eng.pre_corner_callout(data):
                        eng.delta_callout(data, now)
                        eng.filler(data, now)

            else:
                # Ambient — iRacing not running. SILENT by default; only speak if user opted in.
                if AMBIENT_ENABLED and now - last_ambient_tip > 12:
                    voice.say(AMBIENT_TIPS[ambient_idx % len(AMBIENT_TIPS)])
                    ambient_idx += 1
                    last_ambient_tip = now

            time.sleep(0.20)

        except KeyboardInterrupt:
            log("Stopping."); break
        except Exception:
            log("ERROR in loop:\n" + traceback.format_exc()); time.sleep(1)

if __name__ == "__main__":
    try:
        main()
    except Exception:
        log("FATAL:\n" + traceback.format_exc())
        input("Press enter to close...")
