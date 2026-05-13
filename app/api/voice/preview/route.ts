// /api/voice/preview — server-side TTS preview using Microsoft Edge read-aloud
// (same endpoint Python edge-tts uses, free, no API key required).
// Wired from /dashboard/settings "Test Voice Now" so users can preview every
// neural voice (Aria, Jenny, Andrew, Ryan, etc.) without the browser falling
// back to Microsoft Zira.

import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Edge read-aloud WebSocket endpoint — no auth required
const EDGE_TTS_WS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const EDGE_TTS_ORIGIN = 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold'

const SAMPLE = "Chief here. Voice test at this volume. Hit the apex and ride the throttle out of three."

export async function POST(req: Request) {
  let voice = 'en-US-AriaNeural'
  let rate = '-5%'
  let pitch = '+0Hz'
  let text = SAMPLE
  try {
    const body = await req.json()
    if (body?.voice) voice = String(body.voice).slice(0, 60)
    if (body?.rate)  rate  = String(body.rate).slice(0, 8)
    if (body?.pitch) pitch = String(body.pitch).slice(0, 8)
    if (body?.text)  text  = String(body.text).slice(0, 280)
  } catch { /* fall through to defaults */ }

  // Dynamic import — keeps the route's cold start small and avoids loading
  // the WebSocket module if the deploy lacks it.
  let WebSocket: any
  try {
    WebSocket = (await import('ws')).default
  } catch (e: any) {
    return NextResponse.json({ error: 'ws module missing on Vercel — npm i ws' }, { status: 500 })
  }

  // Microsoft started requiring a SHA256 clock-skewed token (Sec-MS-GEC) on
  // these endpoints — without it the server returns 403. Recomputed each call;
  // changes every 5 minutes.
  const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
  const WIN_FILETIME_EPOCH_S = 11644473600
  const nowTicks = BigInt(Math.floor(Date.now() / 1000 + WIN_FILETIME_EPOCH_S)) * 10_000_000n
  const fiveMinTicks = 3_000_000_000n
  const rounded = nowTicks - (nowTicks % fiveMinTicks)
  const secMsGec = createHash('sha256')
    .update(`${rounded.toString()}${TRUSTED_CLIENT_TOKEN}`)
    .digest('hex')
    .toUpperCase()
  const secMsGecVersion = '1-130.0.2849.68'

  // Build the SSML payload (Microsoft's chunk format)
  const requestId = generateConnectId()
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody rate='${rate}' pitch='${pitch}'>${escapeXml(text)}</prosody></voice></speak>`

  return new Promise<Response>((resolve) => {
    const audioChunks: Buffer[] = []
    let resolved = false

    const finish = (res: Response) => {
      if (resolved) return
      resolved = true
      try { ws.close() } catch {}
      resolve(res)
    }

    const ws = new WebSocket(`${EDGE_TTS_WS}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${secMsGecVersion}`, {
      headers: {
        'Origin': EDGE_TTS_ORIGIN,
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
        'Sec-MS-GEC': secMsGec,
        'Sec-MS-GEC-Version': secMsGecVersion,
      },
    })

    const timeout = setTimeout(() => {
      finish(NextResponse.json({ error: 'edge-tts timeout' }, { status: 504 }))
    }, 20000)

    ws.on('open', () => {
      const ts = new Date().toISOString()
      // 1. config
      const config = {
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
            },
          },
        },
      }
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify(config)}`
      )
      // 2. ssml request
      ws.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}Z\r\nPath:ssml\r\n\r\n${ssml}`
      )
    })

    ws.on('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        // Binary frame: header section terminated by "Path:audio\r\n", then MP3 bytes
        const headerEnd = data.indexOf('Path:audio\r\n')
        if (headerEnd > -1) {
          const audio = data.slice(headerEnd + 'Path:audio\r\n'.length)
          audioChunks.push(audio)
        }
      } else {
        const txt = data.toString()
        if (txt.includes('Path:turn.end')) {
          clearTimeout(timeout)
          const buf = Buffer.concat(audioChunks)
          if (buf.length === 0) {
            finish(NextResponse.json({ error: 'no audio returned (voice name may be wrong)' }, { status: 502 }))
            return
          }
          finish(new NextResponse(buf, {
            status: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': String(buf.length),
              'Cache-Control': 'no-store',
            },
          }))
        }
      }
    })

    ws.on('error', (err: Error) => {
      clearTimeout(timeout)
      finish(NextResponse.json({ error: 'edge-tts error: ' + err.message }, { status: 500 }))
    })

    ws.on('close', () => {
      if (!resolved) {
        clearTimeout(timeout)
        if (audioChunks.length > 0) {
          const buf = Buffer.concat(audioChunks)
          finish(new NextResponse(buf, {
            status: 200,
            headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
          }))
        } else {
          finish(NextResponse.json({ error: 'connection closed without audio' }, { status: 502 }))
        }
      }
    })
  })
}

function generateConnectId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' })[c]!)
}
