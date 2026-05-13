// /api/voice/preview — returns a signed URL for the pre-generated MP3 sample
// of the requested voice. Samples are produced once by generate-voice-samples.py
// on the user's local machine (where edge-tts isn't IP-blocked) and uploaded
// to the public Supabase Storage bucket "voice-samples".
//
// This sidesteps Microsoft Edge TTS's IP-based blocking of Vercel ranges
// entirely. Bulletproof, instant, free.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const BUCKET = 'voice-samples'

const VALID_VOICES = new Set([
  'en-US-AriaNeural',
  'en-US-JennyNeural',
  'en-US-AvaMultilingualNeural',
  'en-US-EmmaMultilingualNeural',
  'en-US-MichelleNeural',
  'en-US-DavisNeural',
  'en-US-GuyNeural',
  'en-GB-RyanNeural',
  'en-AU-WilliamNeural',
  'en-US-AndrewMultilingualNeural',
])

export async function POST(req: Request) {
  let voice = 'en-US-AriaNeural'
  try {
    const body = await req.json()
    if (body?.voice && VALID_VOICES.has(body.voice)) {
      voice = body.voice
    }
  } catch (_) {}

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(voice)}.mp3`

  // Quick HEAD check so we can return a clean 404 instead of broken audio
  try {
    const head = await fetch(url, { method: 'HEAD' })
    if (!head.ok) {
      return NextResponse.json({
        error: `sample for "${voice}" not generated yet — run GENERATE-VOICE-SAMPLES.bat on the admin machine`,
        url,
        status: head.status,
      }, { status: 404 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'storage check failed: ' + e.message }, { status: 500 })
  }

  // Stream the MP3 through this route so the client gets audio/mpeg directly.
  // (Alternative: 302 redirect to the public URL, but proxying gives us
  // consistent caching headers + no CORS issues.)
  const resp = await fetch(url)
  if (!resp.ok || !resp.body) {
    return NextResponse.json({ error: `storage fetch HTTP ${resp.status}` }, { status: 502 })
  }
  return new NextResponse(resp.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
