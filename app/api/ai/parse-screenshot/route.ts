// chief-final/app/api/ai/parse-screenshot/route.ts
// Upload a screenshot of any sim app (Simucube Tuner, iRacing, SimPro Manager, Coach Dave Delta).
// Claude Vision reads every visible setting and returns structured JSON.
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const PROMPTS: Record<string, string> = {
  simucube: `This is a screenshot of Simucube Tuner. Read EVERY visible value and return strict JSON with these keys: max_strength_pct, steering_range_deg, damping, friction, inertia, centering_force_pct, reconstruction_filter, slew_rate_limit, torque_bandwidth_hz, static_force_reduction_pct, ultra_low_latency_pct, torque_linearity, bumpstop_feel, bumpstop_range, high_torque_enabled, ffb_effects, iracing_360hz, active_profile_name. Use numbers where applicable, strings for "Off"/"Soft"/etc. Set null for anything not visible. Output ONLY the JSON, no other text.`,
  iracing: `This is a screenshot of an iRacing setup screen. Read EVERY visible setting (front/rear camber, toe, caster, spring rates, dampers, ride heights, anti-roll bars, tire pressures, gears, brakes, fuel level, weight distribution, anything else). Return strict JSON with snake_case keys grouped logically. Output ONLY the JSON.`,
  simpro: `This is a screenshot of SimPro Manager (Sim Magic pedals/wheel config). Read EVERY visible value (pedal calibration, brake force curve, throttle response, deadzone, max output) and return strict JSON. Output ONLY the JSON.`,
  sim_magic: `This is a screenshot of SimPro Manager (Sim Magic pedals/wheel config). Read EVERY visible value (pedal calibration, brake force curve, throttle response, deadzone, max output) and return strict JSON. Output ONLY the JSON.`,
  coach_dave: `This is a screenshot of Coach Dave Delta. Read every visible setting/lap time/sector/setup name/track/car/stint displayed. Return strict JSON with keys like: car, track, best_lap_seconds, optimal_lap_seconds, average_lap_seconds, total_laps, drive_time, sectors[], stints[], setup_name, weather, tire_temps, tire_pressures, fuel_used. Output ONLY the JSON.`,
  generic: `Look at this screenshot. Read EVERY label and value visible. Return them as strict JSON with snake_case keys. Output ONLY the JSON.`,
}

export async function POST(req: Request) {
  try {
    const { image_b64, image_type, vendor, session_id } = await req.json()
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    if (!image_b64) return NextResponse.json({ error: 'image required' }, { status: 400 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured on server' }, { status: 500 })
    }

    // Sanity check image size — Anthropic max is 5MB per image (b64 expands ~33%)
    const approxBytes = Math.floor((image_b64.length * 3) / 4)
    if (approxBytes > 4_500_000) {
      return NextResponse.json({
        error: `Screenshot is too large (${(approxBytes / 1_000_000).toFixed(1)}MB). Crop tighter or save as JPG.`,
      }, { status: 400 })
    }

    const prompt = PROMPTS[vendor] || PROMPTS.generic

    const tryModels = ['claude-haiku-4-5', 'claude-sonnet-4-5']
    let completion: any = null
    let lastErr: any = null
    for (const model of tryModels) {
      try {
        completion = await anthropic.messages.create({
          model,
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: image_type || 'image/png', data: image_b64 } },
              { type: 'text', text: prompt },
            ],
          }],
        })
        break
      } catch (apiErr: any) {
        lastErr = apiErr
        // Only fall through on model-not-found / availability errors
        const msg = apiErr?.message || ''
        if (!/not_found|deprecated|invalid model|model/i.test(msg)) break
      }
    }

    if (!completion) {
      return NextResponse.json({
        error: `AI vision call failed: ${lastErr?.message || lastErr?.error?.message || 'unknown'}`,
      }, { status: 502 })
    }

    const text = completion.content[0].type === 'text' ? completion.content[0].text : ''
    let parsed: any = null
    try {
      // strip markdown code fences if present
      const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```\s*$/, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { _raw: text }
    }

    // Optionally save into session record
    if (session_id) {
      const fieldMap: Record<string, string> = {
        simucube: 'wheelbase_settings_json',
        iracing: 'iracing_settings_json',
        simpro: 'pedal_settings_json',
        coach_dave: 'coach_dave_data',
      }
      const field = fieldMap[vendor]
      if (field) {
        // Read current then merge
        const { data: cur } = await sb.from('sim_session_captures').select(field).eq('id', session_id).single()
        const existing = (cur as any)?.[field] || {}
        const merged = { ...existing, screenshot_parsed: parsed, screenshot_parsed_at: new Date().toISOString() }
        await sb.from('sim_session_captures').update({ [field]: merged } as any).eq('id', session_id).eq('user_id', user.id)
      }
    }

    return NextResponse.json({ ok: true, vendor, parsed })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
