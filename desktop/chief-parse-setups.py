"""
CHIEF - parse iRacing .sto setup files to extract values + metadata.

REALITY CHECK (2026-05): iRacing .sto files are a proprietary BINARY format,
not text or HTML. The structure is:

    [12-byte header][zlib-ish compressed binary setup blob][UTF-16-LE trailing notes]

The numeric setup values (pressures, camber, springs, dampers, gears...) live
inside the compressed binary blob and are NOT recoverable with regex alone -
they need iRacing's native parser. HOWEVER, most vendors (Maconi, Team53/RKM,
Coach Dave, PRS, RWM) append a UTF-16-LE NOTES section at the tail of the
file. That section is plain text and typically contains:

    - Series + season + week  (e.g. "S3 2025 Late Model Stock  Week 1")
    - Track + race length     (e.g. "Kern County - 90 Laps")
    - TT rating               (e.g. "TT: 112")
    - Target lap time         (e.g. "Qual: 16.600" / "Race: 18.699")
    - Setup advice            (e.g. "Use 4th Gear", "3.69 rear gear")
    - Vendor social links     (Facebook/YouTube/Twitch/etc.)

In RARE cases (Coach Dave HTML exports, older text dumps) the file IS plain
text or HTML with key:value pairs - those are still handled.

Filename carries strong signal too:
    RKM-LMSC-KernCounty-26S1-Q-looser.sto
    vendor=RKM, class=LMSC, track=KernCounty, season=26S1, session=Q, tag=looser

Usage:
    python chief-parse-setups.py path/to/setup.sto
    python chief-parse-setups.py --all          # parse every .sto we can find

Library use:
    from chief_parse_setups import parse_sto_file
    data = parse_sto_file(Path("..."))
"""
import argparse
import json
import re
import sys
from pathlib import Path
from html import unescape

HOME = Path.home()
import os as _os
APPDATA       = Path(_os.environ.get("APPDATA",      HOME / "AppData" / "Roaming"))
LOCAL_APPDATA = Path(_os.environ.get("LOCALAPPDATA", HOME / "AppData" / "Local"))
DOCS          = HOME / "Documents"

# Mirrors vendors.py (the chief-autocapture daemon's scanner). Coach Dave Delta
# v5+ stores files in AppData\Roaming\Coach Dave Delta (Electron app pattern).
DESKTOP = HOME / "Desktop"
SOURCE_DIRS = [
    # Permanent archive (what chief-archive-setups.py builds) - highest priority
    DOCS / "ChiefSetupLibrary",
    # Documents (older versions)
    DOCS / "Coach Dave Academy",
    DOCS / "CoachDaveDelta",
    DOCS / "Coach Dave Delta",
    DOCS / "Delta",
    # AppData\Roaming (v5+ Electron - PRIMARY for current installs)
    APPDATA / "Coach Dave Delta",
    APPDATA / "coach-dave-delta",
    APPDATA / "CoachDaveDelta",
    APPDATA / "Coach Dave Academy",
    APPDATA / "delta",
    APPDATA / "@coachdaveacademy",
    APPDATA / "Delta",
    APPDATA / "delta-app",
    # AppData\Local
    LOCAL_APPDATA / "Coach Dave Delta",
    LOCAL_APPDATA / "coach-dave-delta",
    LOCAL_APPDATA / "CoachDaveDelta",
    LOCAL_APPDATA / "Coach Dave Academy",
    LOCAL_APPDATA / "Programs" / "Coach Dave Delta",
    LOCAL_APPDATA / "Programs" / "coach-dave-delta",
    # User's manual downloads
    DESKTOP / "Seteps",
    DESKTOP / "Setups",
    DESKTOP / "Setups Backup",
    # iRacing setups (Coach Dave can copy here)
    DOCS / "iRacing" / "setups",
]
# Dynamic discovery: also scan any AppData subfolder containing "coach" or "delta"
for _parent in (APPDATA, LOCAL_APPDATA):
    if _parent.exists():
        try:
            for _sub in _parent.iterdir():
                if _sub.is_dir() and ("coach" in _sub.name.lower() or "delta" in _sub.name.lower()):
                    if _sub not in SOURCE_DIRS:
                        SOURCE_DIRS.append(_sub)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# PATTERNS - applied to whatever text we can recover from the file.
#
# Two flavors are mixed in here:
#   1. Vendor NOTES patterns - match the UTF-16-LE trailing notes that
#      Maconi/Team53/RKM/Coach Dave/PRS append to binary .sto files.
#      These are the ones that actually fire on the user's library.
#   2. HTML/text setup patterns - match the rare plaintext or HTML
#      exports (older Coach Dave dumps, web previews). Kept for coverage.
# ---------------------------------------------------------------------------
PATTERNS = {
    # ------------------------------------------------------------ notes/meta
    # Series / car class - Maconi & Team53 lead with this.
    # e.g. "S3 2025 Late Model Stock", "S2 2025 LMODS", "Week 8 - Five Flags"
    "series":          [r"((?:S\d\s+20\d{2}|20\d{2}\s+S\d)[^\n\r]*?(?:Late Model|LMODS|LMSC|Xfinity|Trucks|GT3|Cup|SLM|Super Late|Modified)[^\n\r]{0,40})",
                        r"((?:Late Model Stock|Super Late Model|Xfinity|GT3 Cup|Truck Series)[^\n\r]{0,40})"],
    "week":            [r"Week\s+(\d+)"],
    "season":          [r"(\d{2}S\d)\b", r"(20\d{2}\s*S\d)\b", r"S(\d)\s+20(\d{2})"],
    "race_length":     [r"(\d+)\s*Laps?\b", r"(\d+)\s*minute", r"Race\s+length[:\s]+(\d+)"],

    # Target performance numbers vendors quote in their notes
    "tt_rating":       [r"TT[:\s]+(\d+)"],
    "target_qual":     [r"Qual(?:ifying)?[:\s]+([\d:.]+)", r"Q[:\s]+([\d]+\.[\d]+)"],
    "target_race":     [r"Race(?:\s+time)?[:\s]+([\d:.]+)\b", r"Avg\s+lap[:\s]+([\d:.]+)"],

    # Gear advice text - very common in oval Late Model setups
    "gear_advice":     [r"((?:Use|Try|Run)\s+\d(?:st|nd|rd|th)\s+[Gg]ear[^\n\r]{0,60})",
                        r"(\d\.\d+\s+rear\s+gear)"],
    "rear_gear_ratio": [r"(\d\.\d{1,2})\s+rear\s+gear", r"rear\s+gear[:\s]+(\d\.\d{1,2})"],

    # Vendor / author identity (helps us route advice to the right tone)
    "vendor":          [r"(Team53|Maconi[\s\w]*?Setup[\s\w]*?Shop|Coach Dave|RKM|PRS|RWM|Trophi|Justin Laxton|Cole Croft)"],
    "vendor_url":      [r"(https?://[^\s\r\n<>]+)"],

    # Track name - many vendors title the package with it
    "track_hint":      [r"-\s*([A-Z][A-Za-z\s]+?(?:Speedway|Raceway|Park|Circuit|Course|Beach|County|National|Coliseum))\b",
                        r"(Kern County|Five Flags|North Wilkesboro|Richmond|Martinsville|Bullring|Hickory|Lanier|Nashville|Myrtle Beach|South Boston|Southern National|Bristol|Michigan)"],

    # ------------------------------------------------------------ html/text setup values
    # If we ever do hit a real text/HTML export, keep extracting numerics.
    # Tire pressures (psi or kPa)
    "tire_pressure_lf": [r"LF[^\n]{0,30}?Cold pressure[:\s]+([\d.]+)",
                         r"LF[^\n]{0,30}?Last hot pressure[:\s]+([\d.]+)",
                         r"LF\s+Pressure[:\s]+([\d.]+)",
                         r"Left Front[^\n]{0,30}?[Pp]ressure[:\s]+([\d.]+)"],
    "tire_pressure_rf": [r"RF[^\n]{0,30}?Cold pressure[:\s]+([\d.]+)",
                         r"RF[^\n]{0,30}?Last hot pressure[:\s]+([\d.]+)",
                         r"RF\s+Pressure[:\s]+([\d.]+)",
                         r"Right Front[^\n]{0,30}?[Pp]ressure[:\s]+([\d.]+)"],
    "tire_pressure_lr": [r"LR[^\n]{0,30}?Cold pressure[:\s]+([\d.]+)",
                         r"LR[^\n]{0,30}?Last hot pressure[:\s]+([\d.]+)",
                         r"LR\s+Pressure[:\s]+([\d.]+)",
                         r"Left Rear[^\n]{0,30}?[Pp]ressure[:\s]+([\d.]+)"],
    "tire_pressure_rr": [r"RR[^\n]{0,30}?Cold pressure[:\s]+([\d.]+)",
                         r"RR[^\n]{0,30}?Last hot pressure[:\s]+([\d.]+)",
                         r"RR\s+Pressure[:\s]+([\d.]+)",
                         r"Right Rear[^\n]{0,30}?[Pp]ressure[:\s]+([\d.]+)"],

    # Camber
    "camber_lf": [r"LF[^\n]{0,30}?Camber[:\s]+(-?[\d.]+)", r"Left Front[^\n]{0,30}?Camber[:\s]+(-?[\d.]+)"],
    "camber_rf": [r"RF[^\n]{0,30}?Camber[:\s]+(-?[\d.]+)", r"Right Front[^\n]{0,30}?Camber[:\s]+(-?[\d.]+)"],
    "camber_lr": [r"LR[^\n]{0,30}?Camber[:\s]+(-?[\d.]+)", r"Left Rear[^\n]{0,30}?Camber[:\s]+(-?[\d.]+)"],
    "camber_rr": [r"RR[^\n]{0,30}?Camber[:\s]+(-?[\d.]+)", r"Right Rear[^\n]{0,30}?Camber[:\s]+(-?[\d.]+)"],

    # Toe
    "toe_lf": [r"LF[^\n]{0,30}?Toe[\- ]?in[:\s]+(-?[\d.]+)", r"LF[^\n]{0,30}?Toe[:\s]+(-?[\d.]+)"],
    "toe_rf": [r"RF[^\n]{0,30}?Toe[\- ]?in[:\s]+(-?[\d.]+)", r"RF[^\n]{0,30}?Toe[:\s]+(-?[\d.]+)"],
    "toe_lr": [r"LR[^\n]{0,30}?Toe[\- ]?in[:\s]+(-?[\d.]+)", r"LR[^\n]{0,30}?Toe[:\s]+(-?[\d.]+)"],
    "toe_rr": [r"RR[^\n]{0,30}?Toe[\- ]?in[:\s]+(-?[\d.]+)", r"RR[^\n]{0,30}?Toe[:\s]+(-?[\d.]+)"],

    # Ride heights
    "ride_height_lf":    [r"LF[^\n]{0,30}?Ride height[:\s]+([\d.]+)"],
    "ride_height_rf":    [r"RF[^\n]{0,30}?Ride height[:\s]+([\d.]+)"],
    "ride_height_lr":    [r"LR[^\n]{0,30}?Ride height[:\s]+([\d.]+)"],
    "ride_height_rr":    [r"RR[^\n]{0,30}?Ride height[:\s]+([\d.]+)"],
    "ride_height_front": [r"Front[^\n]{0,30}?Ride height[:\s]+([\d.]+)"],
    "ride_height_rear":  [r"Rear[^\n]{0,30}?Ride height[:\s]+([\d.]+)"],

    # Spring rates (N/mm or lbs/in)
    "spring_lf": [r"LF[^\n]{0,30}?Spring (?:rate|perch)[:\s]+([\d.]+)"],
    "spring_rf": [r"RF[^\n]{0,30}?Spring (?:rate|perch)[:\s]+([\d.]+)"],
    "spring_lr": [r"LR[^\n]{0,30}?Spring (?:rate|perch)[:\s]+([\d.]+)"],
    "spring_rr": [r"RR[^\n]{0,30}?Spring (?:rate|perch)[:\s]+([\d.]+)"],

    # Dampers
    "bump_lf":    [r"LF[^\n]{0,30}?(?:Bump|Compression)[^\n]{0,30}?(\d+)"],
    "bump_rf":    [r"RF[^\n]{0,30}?(?:Bump|Compression)[^\n]{0,30}?(\d+)"],
    "bump_lr":    [r"LR[^\n]{0,30}?(?:Bump|Compression)[^\n]{0,30}?(\d+)"],
    "bump_rr":    [r"RR[^\n]{0,30}?(?:Bump|Compression)[^\n]{0,30}?(\d+)"],
    "rebound_lf": [r"LF[^\n]{0,30}?Rebound[^\n]{0,30}?(\d+)"],
    "rebound_rf": [r"RF[^\n]{0,30}?Rebound[^\n]{0,30}?(\d+)"],
    "rebound_lr": [r"LR[^\n]{0,30}?Rebound[^\n]{0,30}?(\d+)"],
    "rebound_rr": [r"RR[^\n]{0,30}?Rebound[^\n]{0,30}?(\d+)"],

    # ARB
    "arb_front": [r"Front[^\n]{0,30}?(?:ARB|Anti[\- ]?roll|Sway)[^\n]{0,30}?(\d+)"],
    "arb_rear":  [r"Rear[^\n]{0,30}?(?:ARB|Anti[\- ]?roll|Sway)[^\n]{0,30}?(\d+)"],

    # Wing / downforce
    "wing_front": [r"Front[^\n]{0,30}?Wing[^\n]{0,30}?([\d.]+)"],
    "wing_rear":  [r"Rear[^\n]{0,30}?Wing[^\n]{0,30}?([\d.]+)"],

    # Gears
    "final_drive": [r"Final drive[^\n]{0,30}?ratio[:\s]+([\d.:]+)", r"Final drive[:\s]+([\d.:]+)"],

    # Brake bias
    "brake_bias": [r"Brake[^\n]{0,30}?bias[:\s]+([\d.]+)\s*%?"],

    # Fuel
    "fuel_level": [r"Fuel[^\n]{0,30}?level[:\s]+([\d.]+)"],
    "fuel_load":  [r"Fuel[^\n]{0,30}?load[:\s]+([\d.]+)"],

    # Differential
    "diff_preload": [r"Diff(?:erential)?[^\n]{0,30}?preload[:\s]+([\d.]+)"],
    "diff_entry":   [r"Diff(?:erential)?[^\n]{0,30}?entry[:\s]+([\d.]+)"],
    "diff_middle":  [r"Diff(?:erential)?[^\n]{0,30}?middle[:\s]+([\d.]+)"],
    "diff_exit":    [r"Diff(?:erential)?[^\n]{0,30}?exit[:\s]+([\d.]+)"],

    # Identity in HTML/text exports
    "car_name":   [r"^Car:\s*(.+)$", r"Car name:\s*(.+)$"],
    "track_name": [r"Track:\s*(.+?)$"],
}


# ---------------------------------------------------------------------------
# File text extraction.
#
# iRacing .sto = small binary header + compressed blob + (optional) UTF-16-LE
# notes tail. We try multiple decodings and concatenate the recoverable text
# so the regex pass above has everything it can see.
# ---------------------------------------------------------------------------
_PRINTABLE_RE = re.compile(rb"[ -~\r\n\t]{4,}")

def _extract_utf16_le(raw: bytes) -> str:
    """Best-effort decode of the trailing UTF-16-LE notes section.

    Vendors append notes as UTF-16-LE - every other byte is 0x00 between ASCII
    chars. We strip nulls and take runs of 4+ printable bytes, which cleanly
    surfaces lines like 'TT: 112' / 'Use 4th Gear' / 'Race: 18.699'.
    """
    # Heuristic 1: full UTF-16-LE decode (works when whole tail is text)
    chunks = []
    try:
        # find a likely UTF-16-LE start: long run of [printable, 0x00]+
        for m in re.finditer(rb"(?:[\x09\x0a\x0d\x20-\x7e]\x00){8,}", raw):
            try:
                chunks.append(m.group(0).decode("utf-16-le", errors="ignore"))
            except Exception:
                pass
    except Exception:
        pass

    # Heuristic 2: strip nulls then grep printable runs (catches mixed regions)
    stripped = raw.replace(b"\x00", b"")
    for m in _PRINTABLE_RE.finditer(stripped):
        try:
            chunks.append(m.group(0).decode("ascii", errors="ignore"))
        except Exception:
            pass

    return "\n".join(chunks)


def read_setup_text(path: Path) -> str:
    """Recover every text-shaped byte we can from a .sto file.

    Returns a single string with:
      - any 8-bit decode (utf-8 / cp1252 / latin-1) of the file
      - any UTF-16-LE printable runs (vendor notes tail)
      - HTML-stripped content if the file is actually HTML
    The result is a sloppy concat - regex doesn't care, and a single PATTERNS
    pass over the lot catches whatever vendor put in.
    """
    raw = path.read_bytes()

    pieces = []

    # 8-bit decode attempts - for plaintext or HTML exports
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            txt = raw.decode(enc, errors="ignore")
            pieces.append(txt)
            break
        except UnicodeDecodeError:
            continue

    # UTF-16-LE trailing notes (the main signal for binary .sto files)
    pieces.append(_extract_utf16_le(raw))

    text = "\n".join(pieces)

    # If the file is an HTML export, normalize it
    if "<" in text and ">" in text and ("<table" in text.lower() or "<td" in text.lower() or "<html" in text.lower()):
        # Convert <tr><td>Key</td><td>Value</td></tr> into "Key: Value\n"
        text = re.sub(
            r"<tr[^>]*>\s*<td[^>]*>([^<]+)</td>\s*<td[^>]*>([^<]+)</td>.*?</tr>",
            lambda m: f"{m.group(1).strip()}: {m.group(2).strip()}\n",
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        text = re.sub(r"<[^>]+>", " ", text)
        text = unescape(text)

    # Collapse whitespace but keep newlines (regex uses MULTILINE)
    text = re.sub(r"[ \t]+", " ", text)
    return text


# ---------------------------------------------------------------------------
# Filename heuristics. The user's library has very structured filenames like
#   RKM-LMSC-KernCounty-26S1-Q-looser.sto
#   25S2 LMODS KERN R02.sto
#   CDA 25S4 LMODS FIFL Q01.sto
#   Lawrence Cerquettini - Team - SLM_MaconiSetupShop_Kern_25S2 R.st.sto
# We crack those for vendor / class / track / season / session.
# ---------------------------------------------------------------------------
_VENDOR_TOKENS = {
    "RKM": "RKM (Team53)",
    "CDA": "Coach Dave Academy",
    "MACONI": "Maconi Setup Shop",
    "PRS": "PRS",
    "RWM": "RWM",
    "TROPHI": "Trophi.AI",
}
_CLASS_TOKENS = {
    "LMSC": "Late Model Stock",
    "LMODS": "Late Model Stock (Open Setup)",
    "SLM":   "Super Late Model",
    "XFINITY": "NASCAR Xfinity",
    "TRUCKS": "NASCAR Truck",
    "GT3":   "GT3",
}
_TRACK_TOKENS = {
    "FIFL":   "Five Flags Speedway",
    "KERN":   "Kern County Raceway",
    "BULL":   "The Bullring at LVMS",
    "SOBO":   "South Boston Speedway",
    "SONAT":  "Southern National Motorsports Park",
    "NASH":   "Nashville Fairgrounds",
    "MART":   "Martinsville Speedway",
    "MYRT":   "Myrtle Beach Speedway",
    "WILK":   "North Wilkesboro Speedway",
    "RICHMOND": "Richmond Raceway",
    "HICKORY":  "Hickory Motor Speedway",
    "LANIER":   "Lanier National Speedway",
}

def parse_filename(name: str) -> dict:
    """Pull vendor / class / track / season / session from the filename."""
    out = {}
    stem = name.rsplit(".", 1)[0]
    upper = stem.upper()

    for tok, label in _VENDOR_TOKENS.items():
        if re.search(rf"\b{tok}\b", upper):
            out["fname_vendor"] = label
            break

    for tok, label in _CLASS_TOKENS.items():
        if re.search(rf"\b{tok}\b", upper):
            out["fname_class"] = label
            break

    for tok, label in _TRACK_TOKENS.items():
        if re.search(rf"\b{tok}\b", upper) or tok in upper:
            out["fname_track"] = label
            break

    m = re.search(r"\b(\d{2}S\d)\b", upper)
    if m:
        out["fname_season"] = m.group(1)

    # Session: Q / R / Race / Qual, optionally with a number (Q01, R02)
    m = re.search(r"\b(Q|R)(?:0?\d)?\b", upper)
    if m:
        out["fname_session"] = "Qualifying" if m.group(1) == "Q" else "Race"
    elif "QUAL" in upper:
        out["fname_session"] = "Qualifying"
    elif "RACE" in upper:
        out["fname_session"] = "Race"

    # Variant: looser / tighter / option2 / shifting / test
    for variant in ("looser", "tighter", "option2", "shifting", "test", "baseline", "fixed"):
        if variant in stem.lower():
            out["fname_variant"] = variant
            break

    return out


# ---------------------------------------------------------------------------
# Public API.
# ---------------------------------------------------------------------------
def parse_sto_file(path: Path):
    """Return dict of {key: value} for everything we can extract from this .sto."""
    out = {"_path": str(path), "_filename": path.name, "_size": path.stat().st_size}
    try:
        txt = read_setup_text(path)
    except Exception as e:
        out["_error"] = f"read failed: {e}"
        return out

    # Pattern pass
    for key, patterns in PATTERNS.items():
        for pat in patterns:
            m = re.search(pat, txt, re.IGNORECASE | re.MULTILINE)
            if m:
                # Take group 1 if present, else group 0
                try:
                    raw = m.group(1).strip()
                except IndexError:
                    raw = m.group(0).strip()
                # Coerce to float when it looks numeric
                try:
                    out[key] = float(raw)
                except ValueError:
                    out[key] = raw
                break

    # Filename pass (always runs - cheap and reliable)
    out.update(parse_filename(path.name))

    # Quality score - fraction of PATTERNS that fired.
    # (Filename fields are bonus, not counted in the denominator.)
    expected = len(PATTERNS)
    found = sum(1 for k in out if not k.startswith("_") and not k.startswith("fname_"))
    out["_parse_score"] = round(found / expected, 2)

    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", help="Single .sto file to parse (omit with --all)")
    ap.add_argument("--all", action="store_true", help="Parse every .sto in known Coach Dave folders")
    ap.add_argument("--json", action="store_true", help="Output JSON (default: pretty text)")
    args = ap.parse_args()

    files = []
    if args.all:
        for d in SOURCE_DIRS:
            if d.exists():
                files.extend(d.rglob("*.sto"))
    elif args.path:
        files = [Path(args.path)]
    else:
        ap.error("specify a path or --all")

    results = []
    for f in files:
        data = parse_sto_file(f)
        results.append(data)
        if not args.json:
            print(f"\n=== {f.name}  (parse score {data.get('_parse_score', 0):.0%}) ===")
            for k, v in data.items():
                if k.startswith("_"): continue
                print(f"  {k:<22}  {v}")

    if args.json:
        print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
