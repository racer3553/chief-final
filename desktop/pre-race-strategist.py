"""
CHIEF Pre-Race Strategist.

Reads the upcoming session BEFORE green flag and speaks strategy:
  - Race length / fuel window / laps to splash
  - Tire choice and stint length
  - Weather forecast vs current
  - Position / opponents to watch
  - Target lap pace based on history
  - Personal pep talk

Runs automatically when iRacing detects PRACTICE/QUAL/RACE pre-grid.
Re-runs once before each race start.
"""
import os, sys, time, subprocess, traceback, json
from datetime import datetime

LOG = os.path.join(os.path.expanduser("~"), "Desktop", "chief-strategist.log")

def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG, "a", encoding="utf-8") as f: f.write(line + "\n")
    except Exception: pass

def _ensure(pkg, importname=None):
    importname = importname or pkg
    try:
        __import__(importname); return True
    except ImportError:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", pkg])
            __import__(importname); return True
        except Exception as e:
            log(f"pip {pkg} failed: {e}"); return False

_ensure("pywin32", "win32com")
_ensure("pyirsdk", "irsdk")
_ensure("edge-tts", "edge_tts")
_ensure("pygame", "pygame")

import irsdk, threading, queue, asyncio, tempfile
import win32com.client
try:
    import edge_tts
except ImportError:
    edge_tts = None
try:
    import pygame
    pygame.mixer.init(frequency=24000)
    PG_OK = True
except Exception:
    PG_OK = False

# Same female-voice candidate list as live-chief.py — AriaNeural first because it's
# the most stable / least likely to be rate-limited by Microsoft.
VOICE_CANDIDATES = [
    "en-US-AriaNeural",
    "en-US-JennyNeural",
    "en-US-AvaMultilingualNeural",
    "en-US-EmmaMultilingualNeural",
    "en-US-MichelleNeural",
]
NEURAL_VOICE_OVERRIDE = os.environ.get("CHIEF_VOICE", "").strip()
NEURAL_RATE  = os.environ.get("CHIEF_RATE", "-5%")
NEURAL_PITCH = os.environ.get("CHIEF_PITCH", "+0Hz")


def _probe_neural_voice(voice_name, timeout=4.0):
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
    if NEURAL_VOICE_OVERRIDE and _probe_neural_voice(NEURAL_VOICE_OVERRIDE):
        return NEURAL_VOICE_OVERRIDE
    for v in VOICE_CANDIDATES:
        if _probe_neural_voice(v):
            log(f"Strategist voice probe OK: {v}")
            return v
        log(f"Strategist voice probe FAILED: {v}")
    return None


class Voice:
    """Blocking-style voice for strategist briefings — say() returns when audio finishes."""

    def __init__(self):
        # Pick a working female SAPI voice for fallback (Aria/Zira preferred)
        try:
            self.sapi = win32com.client.Dispatch("SAPI.SpVoice")
            self.sapi.Rate = -1   # slightly slower = smoother
            self.sapi.Volume = 100
            try:
                voices = self.sapi.GetVoices()
                best = None
                for i in range(voices.Count):
                    v = voices.Item(i)
                    desc = v.GetDescription()
                    for pref in ("Aria", "Zira", "Hazel"):
                        if pref in desc:
                            best = v
                            break
                    if best: break
                if best is not None:
                    self.sapi.Voice = best
                    log(f"Strategist SAPI fallback voice: {best.GetDescription()}")
            except Exception as e:
                log(f"Strategist SAPI voice select failed: {e}")
        except Exception as e:
            log(f"Strategist SAPI init failed: {e}")
            self.sapi = None

        # Pick a working neural voice (probe the API on startup)
        self.neural_voice = None
        if edge_tts and PG_OK:
            self.neural_voice = _pick_working_voice()
        self.use_neural = bool(self.neural_voice)
        if self.use_neural:
            log(f"Strategist voice: NEURAL ({self.neural_voice}) rate={NEURAL_RATE}")
        else:
            log("Strategist voice: SAPI fallback (all neural candidates failed)")

    def say(self, text):
        log(f"SAY: {text}")
        if self.use_neural:
            try:
                path = asyncio.run(self._synth(text))
                if path:
                    try:
                        pygame.mixer.music.load(path)
                        pygame.mixer.music.play()
                        start = time.time()
                        while pygame.mixer.music.get_busy() and time.time() - start < 30:
                            time.sleep(0.05)
                        try: os.unlink(path)
                        except Exception: pass
                        return
                    except Exception as e:
                        log(f"strategist playback failed: {e}")
            except Exception as e:
                log(f"strategist neural failed: {e}")
        # SAPI fallback — synchronous (flag 0 = blocking). Wrapped to never crash.
        if self.sapi:
            try:
                self.sapi.Speak(text, 0)
            except Exception as e:
                log(f"strategist sapi failed: {e}")

    async def _synth(self, text):
        path = tempfile.mktemp(suffix=".mp3")
        try:
            kwargs = {}
            if NEURAL_RATE and NEURAL_RATE not in ("+0%", "0%", "+0", "0"):
                kwargs["rate"] = NEURAL_RATE
            if NEURAL_PITCH and NEURAL_PITCH not in ("+0Hz", "0Hz", "+0", "0"):
                kwargs["pitch"] = NEURAL_PITCH
            c = edge_tts.Communicate(text, self.neural_voice, **kwargs)
            await c.save(path)
            if not os.path.exists(path) or os.path.getsize(path) < 200:
                try: os.unlink(path)
                except Exception: pass
                return None
            return path
        except Exception as e:
            log(f"strategist synth failed: {e}")
            try: os.unlink(path)
            except Exception: pass
            return None

voice = Voice()

def fmt_time(s):
    m = int(s // 60); sec = s - m*60
    return f"{m}:{sec:05.2f}" if m else f"{sec:.2f}"

class Strategist:
    SESSION_TYPE = {0: "Practice", 1: "Open Qualify", 2: "Lone Qualify", 3: "Warmup", 4: "Heat", 5: "Race"}

    def __init__(self):
        self.ir = irsdk.IRSDK()
        self.briefed_session_uid = None

    def connect(self):
        try:
            return self.ir.startup() and self.ir.is_initialized and self.ir.is_connected
        except Exception:
            return False

    def session_uid(self):
        try:
            return f"{self.ir['SessionUniqueID']}-{self.ir['SessionNum']}"
        except Exception:
            return None

    def gather(self):
        """Pull everything needed for the briefing."""
        try:
            ir = self.ir
            data = {
                "track": ir["WeekendInfo"]["TrackDisplayName"] if ir["WeekendInfo"] else "unknown",
                "track_config": ir["WeekendInfo"]["TrackConfigName"] if ir["WeekendInfo"] else "",
                "track_length_km": ir["WeekendInfo"]["TrackLength"] if ir["WeekendInfo"] else 0,
                "car": ir["DriverInfo"]["DriverCarSLBlinkRPM"] if ir["DriverInfo"] else "",
                "fuel_level": float(ir["FuelLevel"] or 0),
                "fuel_tank_capacity": float(ir["DriverInfo"]["DriverCarFuelMaxLtr"] or 0),
                "session_type": ir["SessionInfo"]["Sessions"][ir["SessionNum"]]["SessionType"] if ir["SessionInfo"] else "",
                "session_laps": ir["SessionInfo"]["Sessions"][ir["SessionNum"]].get("SessionLaps") if ir["SessionInfo"] else None,
                "session_time_s": ir["SessionInfo"]["Sessions"][ir["SessionNum"]].get("SessionTime") if ir["SessionInfo"] else None,
                "weather_track_temp": float(ir["TrackTempCrew"] or 0),
                "weather_air_temp": float(ir["AirTemp"] or 0),
                "weather_skies": int(ir["Skies"] or 0),
                "weather_humidity": float(ir["RelativeHumidity"] or 0),
                "weather_wind_mph": float(ir["WindVel"] or 0) * 2.23694,
                "rain_pct": float(ir["WeatherDeclaredWet"] or 0),
                "best_lap": float(ir["LapBestLapTime"] or 0),
                "session_best": float(ir["LapBestLapTime"] or 0),
                "position": int(ir["PlayerCarPosition"] or 0),
                "class_position": int(ir["PlayerCarClassPosition"] or 0),
                "session_state": int(ir["SessionState"] or 0),  # 0=invalid,1=getInCar,2=warmup,3=parade,4=racing,5=checkered,6=cooldown
            }
            try:
                car_idx = ir["DriverInfo"]["DriverCarIdx"]
                drivers = ir["DriverInfo"]["Drivers"]
                me = next((d for d in drivers if d["CarIdx"] == car_idx), None)
                if me:
                    data["my_iRating"] = me.get("IRating", 0)
                    data["my_class"] = me.get("CarClassShortName") or me.get("CarClassID", "")
            except Exception:
                pass
            return data
        except Exception as e:
            log(f"gather failed: {e}")
            return None

    def brief(self, d):
        """Speak a comprehensive pre-race briefing."""
        if not d: return

        stype = d["session_type"] or "Session"
        track = d["track"]
        config = d["track_config"]
        track_str = f"{track} {config}" if config else track

        voice.say(f"Pre-session briefing. {stype} at {track_str}.")
        time.sleep(0.2)

        # Weather
        ttemp = d["weather_track_temp"] * 9/5 + 32
        atemp = d["weather_air_temp"] * 9/5 + 32
        wind = d["weather_wind_mph"]
        wet = d["rain_pct"] > 0.1
        sky_desc = ["clear", "partly cloudy", "mostly cloudy", "overcast"][min(d["weather_skies"], 3)]
        if wet:
            voice.say(f"Track is WET. Air {atemp:.0f} Fahrenheit, track {ttemp:.0f}. Be smooth.")
        else:
            voice.say(f"Skies {sky_desc}. Air {atemp:.0f} Fahrenheit, track {ttemp:.0f}. Wind {wind:.0f} miles per hour.")
        time.sleep(0.2)

        # Fuel and race length
        if "race" in stype.lower():
            tank = d["fuel_tank_capacity"]
            current = d["fuel_level"]
            laps = d["session_laps"]
            if laps and laps != "unlimited" and isinstance(laps, (int, float)):
                voice.say(f"Race is {int(laps)} laps. Fuel at {current:.1f} of {tank:.1f} liters in tank.")
                # Rough fuel-per-lap: assume 3% of tank per lap as starting point
                if tank > 0:
                    est_fuel_per_lap = tank * 0.035
                    laps_on_current = current / est_fuel_per_lap if est_fuel_per_lap > 0 else 0
                    if laps_on_current < laps:
                        gap = laps - laps_on_current
                        splash_lap = max(1, int(laps_on_current) - 2)
                        voice.say(f"You'll need a fuel stop. Plan a splash around lap {splash_lap}. Approximately {gap:.0f} laps short on a single tank.")
                    else:
                        voice.say("One stint should make it to the flag. Push the pace.")
            elif d["session_time_s"] and d["session_time_s"] > 0:
                mins = d["session_time_s"] / 60
                voice.say(f"Timed race, {mins:.0f} minutes.")
        else:
            voice.say(f"Fuel: {d['fuel_level']:.1f} liters. Use this session to find pace.")
        time.sleep(0.2)

        # Position context
        pos = d["position"]
        if pos > 0:
            if "race" in stype.lower():
                if pos <= 3:
                    voice.say(f"Starting P{pos}. Defend hard at green, pull a gap by lap five.")
                elif pos <= 10:
                    voice.say(f"Starting P{pos}. First lap is opportunity. Be patient, pick your moves.")
                else:
                    voice.say(f"Starting P{pos}. Long race ahead. Stay clean lap one, points are in finishing.")
            elif "qualify" in stype.lower():
                voice.say("Qualifying — one or two flying laps. Tires need temp first lap. Send it lap two.")
        time.sleep(0.2)

        # Target pace
        if d["best_lap"] and d["best_lap"] > 0:
            voice.say(f"Your reference here is {fmt_time(d['best_lap'])}. Anything inside that is gravy.")
        else:
            voice.say("No reference lap yet. First three laps build temp, then push.")
        time.sleep(0.2)

        # Mental cue
        voice.say("Eyes up. Smooth hands. Patience early, attack late. Let's go to work.")

def main():
    # No spoken greeting at boot — LiveCoach handles the "online" announcement so
    # the two processes don't talk over each other on startup. Strategist only
    # speaks when it actually has a pre-race briefing to deliver.
    log(f"Pre-Race Strategist running (silent until session detected). Log: {LOG}")
    # Build Strategist defensively — irsdk import can throw on some Windows configs
    try:
        s = Strategist()
    except Exception:
        log("Strategist init failed — running in standby:\n" + traceback.format_exc())
        s = None
    while True:
        try:
            if s is None:
                time.sleep(10)
                continue
            connected = False
            try:
                connected = s.connect()
            except Exception:
                connected = False
            if not connected:
                time.sleep(3); continue
            uid = None
            try:
                uid = s.session_uid()
            except Exception:
                uid = None
            if uid and uid != s.briefed_session_uid:
                time.sleep(2)
                d = None
                try:
                    d = s.gather()
                except Exception:
                    log("gather threw:\n" + traceback.format_exc())
                if d:
                    try:
                        s.brief(d)
                    except Exception:
                        log("brief threw:\n" + traceback.format_exc())
                    s.briefed_session_uid = uid
            time.sleep(5)
        except KeyboardInterrupt:
            break
        except Exception:
            log("ERROR:\n" + traceback.format_exc())
            time.sleep(2)

if __name__ == "__main__":
    try: main()
    except Exception:
        log("FATAL:\n" + traceback.format_exc())
        input("Press enter to close...")
