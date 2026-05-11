# CHIEF — Universal Auto-Capture

Auto-detects and captures **every iRacing session** with the driver's full hardware setup, regardless of which vendor they're using.

## Universal hardware support

| Category | Supported vendors |
|---|---|
| **Wheels** | Simucube 1/2, Fanatec/Fanalab, Moza Pit House, Thrustmaster, Asetek SimSports, Simagic |
| **Pedals** | Heusinkveld, Asetek Invicta, Simagic, Fanatec |
| **Motion** | Sim Magic |
| **Sim** | iRacing per-car setups, controls.cfg, app.ini |
| **Coach** | Coach Dave Delta (setup files + telemetry exports) |

The daemon scans known install paths for all of these on every session start. Whichever vendor the user has, their settings get tagged with the current car + track and pushed to the Chief backend.

## Files in this folder

| File | Purpose |
|---|---|
| `chief-autocapture.py` | Main daemon — reads iRacing + scans hardware |
| `vendors.py` | Universal vendor scanner |
| `chief-autocapture.bat` | Windows launcher |
| `INSTALL-AUTOSTART-CHIEF.bat` | Adds daemon to Windows startup |
| `DashboardSidebar-CLEAN.tsx` | New 5-group sidebar |
| `chief-final-additions/` | Drop-in code for the Next.js webapp |

## Step 1 — Test the scanner

Open cmd in this folder, run:
```
python vendors.py
```
You'll see a JSON dump showing exactly what hardware was detected on this PC. Verify your wheel/pedals/sim are picked up.

## Step 2 — Run the auto-capture daemon

Double-click `chief-autocapture.bat`. Then start an iRacing session. You'll see:
```
SESSION START: Dirt Late Model @ Eldora Speedway
  Detected hardware: simucube, fanatec, iracing, coach_dave
  Lap 0: 0:21.483 | fuel 87.2%
  Lap 1: 0:20.917 | fuel 84.5%
```

When you exit iRacing, the session saves locally + pushes to your Chief backend.

## Step 3 — Auto-start on Windows boot

Double-click `INSTALL-AUTOSTART-CHIEF.bat`. Daemon now runs every login.

## Step 4 — Deploy the webapp pieces

Copy these into your `chief-final` Next.js repo:

| Source | Destination |
|---|---|
| `chief-final-additions/app/api/sessions/auto-capture/route.ts` | `app/api/sessions/auto-capture/route.ts` |
| `chief-final-additions/app/api/ai/ask-chief/route.ts` | `app/api/ai/ask-chief/route.ts` (replace existing) |
| `chief-final-additions/app/dashboard/ai-chat/page.tsx` | `app/dashboard/ai-chat/page.tsx` (replace existing) |
| `chief-final-additions/components/AskChiefVoice.tsx` | `components/AskChiefVoice.tsx` |
| `DashboardSidebar-CLEAN.tsx` | `components/shared/DashboardSidebar.tsx` (replace existing) |

Then run the SQL migration in Supabase:
```
chief-final-additions/supabase/migrations/auto_capture_columns.sql
```

Commit + push to GitHub. Vercel auto-deploys.

## Step 5 — Test the voice query

Visit `chiefracing.com/dashboard/ai-chat`. Click the mic. Say:

> "What was my setup last time at Eldora?"

Chief responds with text AND speaks it back. Pulls from your auto-captured sessions, references the actual setup file names from your wheel vendor / Coach Dave folder, and knows what hardware you had at the time.

## Voice queries that work today

- "What was my setup last time at Eldora?"
- "Compare my best laps yesterday vs today"
- "Track temp is up 15 degrees — what should I change?"
- "What does Coach Dave say for this car?"
- "Show me my Simucube settings from last week"
- "Recommend a starting setup for tonight's race"

## Architecture

```
[Sim PC]
  iRacing  →  pyirsdk reads telemetry
  Wheel/Pedals/Motion config  →  vendors.py scans paths
  Coach Dave files  →  vendors.py reads .cdd folder
                      ↓
            chief-autocapture.py (background)
                      ↓
            POST every session to chiefracing.com
                      ↓
[Cloud]
  Supabase: sim_session_captures (with hardware_scan jsonb)
                      ↓
  /api/ai/ask-chief uses Claude with full session+hardware context
                      ↓
[Web/Phone]
  AskChiefVoice component → mic → speech-to-text → AI → speech-to-voice
```

## Adding more vendors

Edit `vendors.py`. Each vendor is a standalone function (`scan_simucube`, `scan_fanatec`, etc.) — copy any of them as a template. The scanner auto-includes new functions in `scan_all()`.
