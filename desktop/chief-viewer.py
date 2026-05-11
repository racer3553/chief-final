"""
CHIEF Telemetry Viewer — local Delta-style data view.

Serves:
    /                          → the HTML viewer (single page, Chart.js based)
    /api/laps                  → JSON list of all available lap traces
    /api/lap/<filename>        → JSON for a single lap trace
    /api/sessions              → JSON list of captured sessions (chief-autocapture)

Reads:
    ~/Documents/ChiefAutoCapture/traces/lap_*.json   (per-lap full telemetry traces)
    ~/Documents/ChiefAutoCapture/sess_*.json         (session summaries)

Run via:  CHIEF-VIEWER.bat   (opens browser to http://localhost:8765 automatically)
"""
import json
import os
import sys
import threading
import webbrowser
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

PORT = int(os.environ.get("CHIEF_VIEWER_PORT", "8765"))
HOME = Path.home()
TRACE_DIR = HOME / "Documents" / "ChiefAutoCapture" / "traces"
SESSION_DIR = HOME / "Documents" / "ChiefAutoCapture"
REFERENCE_DIR = HOME / "Documents" / "ChiefAutoCapture" / "references"
HERE = Path(__file__).parent
HTML_PATH = HERE / "chief-viewer.html"


def list_laps():
    """Return metadata for every lap trace on disk, newest first."""
    if not TRACE_DIR.exists():
        return []
    out = []
    for f in TRACE_DIR.glob("lap_*.json"):
        try:
            stat = f.stat()
            with f.open("r", encoding="utf-8") as fh:
                payload = json.load(fh)
            samples = payload.get("samples") or []
            out.append({
                "file": f.name,
                "lap": payload.get("lap"),
                "lap_time": payload.get("lap_time"),
                "ts": payload.get("ts") or datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "samples_count": len(samples),
                "size": stat.st_size,
            })
        except Exception as e:
            print(f"[viewer] skip {f.name}: {e}", file=sys.stderr)
    out.sort(key=lambda r: r["ts"], reverse=True)
    return out


def load_lap(filename):
    """Return the raw lap trace JSON. Filename is the basename only — guarded."""
    safe = Path(filename).name  # strip any path components
    fp = TRACE_DIR / safe
    if not fp.exists() or not fp.is_file():
        return None
    try:
        with fp.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as e:
        return {"error": str(e)}


def list_references():
    """Return all reference packs available locally.

    A reference pack is a JSON file at:
        ~/Documents/ChiefAutoCapture/references/<car>__<track>__<tag>.json
    Containing:
        {
            "car": "...",
            "track": "...",
            "track_config": "...",
            "lap_time": <seconds>,
            "driver": "<source / pro name>",
            "source": "personal-best" | "pro-pack" | "shared",
            "samples": [ ...full lap trace... ]
        }
    """
    if not REFERENCE_DIR.exists():
        return []
    out = []
    for f in REFERENCE_DIR.glob("*.json"):
        if f.name == "index.json":
            continue
        try:
            with f.open("r", encoding="utf-8") as fh:
                payload = json.load(fh)
            out.append({
                "file": f.name,
                "car": payload.get("car") or "",
                "track": payload.get("track") or "",
                "track_config": payload.get("track_config") or "",
                "lap_time": payload.get("lap_time"),
                "driver": payload.get("driver") or "",
                "source": payload.get("source") or "",
                "samples_count": len(payload.get("samples") or []),
                "size": f.stat().st_size,
            })
        except Exception as e:
            print(f"[viewer] skip ref {f.name}: {e}", file=sys.stderr)
    out.sort(key=lambda r: (r["track"], r["car"], r.get("lap_time") or 1e9))
    return out


def load_reference(filename):
    safe = Path(filename).name
    fp = REFERENCE_DIR / safe
    if not fp.exists() or not fp.is_file():
        return None
    try:
        with fp.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as e:
        return {"error": str(e)}


def list_sessions():
    """Return session summaries from chief-autocapture daemon."""
    if not SESSION_DIR.exists():
        return []
    out = []
    for f in SESSION_DIR.glob("sess_*.json"):
        try:
            with f.open("r", encoding="utf-8") as fh:
                s = json.load(fh)
            out.append({
                "file": f.name,
                "id": s.get("id"),
                "started_at": s.get("started_at"),
                "ended_at": s.get("ended_at"),
                "track": s.get("track"),
                "car": s.get("car"),
                "session_type": s.get("session_type"),
                "best_lap_time": s.get("best_lap_time"),
                "lap_count": len(s.get("laps") or []),
                "incidents": s.get("incidents", 0),
            })
        except Exception as e:
            print(f"[viewer] skip {f.name}: {e}", file=sys.stderr)
    out.sort(key=lambda r: r.get("started_at") or "", reverse=True)
    return out


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Quieter logs
        sys.stderr.write(f"[viewer] {fmt % args}\n")

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, html):
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            if path == "/" or path == "/index.html":
                if HTML_PATH.exists():
                    self._send_html(HTML_PATH.read_text(encoding="utf-8"))
                else:
                    self._send_html("<h1>chief-viewer.html missing</h1>")
                return

            if path == "/api/laps":
                self._send_json(200, list_laps())
                return

            if path.startswith("/api/lap/"):
                fname = unquote(path[len("/api/lap/"):])
                payload = load_lap(fname)
                if payload is None:
                    self._send_json(404, {"error": "not found"})
                else:
                    self._send_json(200, payload)
                return

            if path == "/api/sessions":
                self._send_json(200, list_sessions())
                return

            if path == "/api/references":
                self._send_json(200, list_references())
                return

            if path.startswith("/api/reference/"):
                fname = unquote(path[len("/api/reference/"):])
                payload = load_reference(fname)
                if payload is None:
                    self._send_json(404, {"error": "not found"})
                else:
                    self._send_json(200, payload)
                return

            self._send_json(404, {"error": "no route", "path": path})
        except Exception as e:
            self._send_json(500, {"error": str(e)})


def main():
    print("=" * 64)
    print(" CHIEF Telemetry Viewer")
    print(f" Trace directory: {TRACE_DIR}")
    print(f" Session directory: {SESSION_DIR}")
    print(f" Listening on:   http://localhost:{PORT}")
    print("=" * 64)
    if not TRACE_DIR.exists():
        TRACE_DIR.mkdir(parents=True, exist_ok=True)
        print(f"  (created empty trace dir — drive a lap with CHIEF running to populate)")
    if not REFERENCE_DIR.exists():
        REFERENCE_DIR.mkdir(parents=True, exist_ok=True)
        print(f"  (created empty reference dir at {REFERENCE_DIR})")
    # Open browser shortly after server starts
    threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nViewer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
