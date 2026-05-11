"""Voice test — confirms both neural and SAPI voices work."""
import os, sys, time, subprocess, traceback

def _ensure(pkg, importname=None):
    importname = importname or pkg
    try:
        __import__(importname); return True
    except ImportError:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", pkg])
            __import__(importname); return True
        except Exception as e:
            print(f"[!] pip install {pkg} failed: {e}")
            return False

print("=" * 50)
print("CHIEF Voice Test")
print("=" * 50)

# 1) SAPI test
print("\n[1] Testing SAPI (offline Windows voice)...")
_ensure("pywin32", "win32com")
try:
    import win32com.client
    sapi = win32com.client.Dispatch("SAPI.SpVoice")
    voices = sapi.GetVoices()
    print(f"    Found {voices.Count} voice(s):")
    for i in range(voices.Count):
        print(f"      - {voices.Item(i).GetDescription()}")
    sapi.Speak("This is the SAPI fallback voice. If you hear this, SAPI works.", 0)
    print("    SAPI: OK")
except Exception as e:
    print(f"    SAPI FAILED: {e}")
    traceback.print_exc()

# 2) Neural test
print("\n[2] Testing Microsoft Neural voice (edge-tts + pygame)...")
_ensure("edge-tts", "edge_tts")
_ensure("pygame", "pygame")
try:
    import asyncio, edge_tts, tempfile, pygame
    pygame.mixer.init(frequency=24000)
    voice_name = os.environ.get("CHIEF_VOICE", "en-US-DavisNeural")
    print(f"    Voice: {voice_name}")
    async def synth():
        path = tempfile.mktemp(suffix=".mp3")
        c = edge_tts.Communicate(
            "This is the neural race-engineer voice. Smooth and clear. If you hear this, you're set.",
            voice_name
        )
        await c.save(path)
        return path
    path = asyncio.run(synth())
    pygame.mixer.music.load(path)
    pygame.mixer.music.play()
    while pygame.mixer.music.get_busy():
        time.sleep(0.05)
    try: os.unlink(path)
    except Exception: pass
    print("    Neural: OK")
except Exception as e:
    print(f"    Neural FAILED: {e}")
    traceback.print_exc()

print("\n" + "=" * 50)
print("Test complete. If you heard BOTH voices, you're good to go.")
print("If only SAPI works, edge-tts couldn't reach Microsoft (check internet).")
print("=" * 50)
input("\nPress enter to close...")
