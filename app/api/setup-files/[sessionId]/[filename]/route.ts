// chief-final/app/api/setup-files/[sessionId]/[filename]/route.ts
// Stream a stored setup file (.sto / .cdd) back to the user for re-download.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string, filename: string }> }) {
  const { sessionId, filename } = await params
  const decodedName = decodeURIComponent(filename)
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: session } = await sb.from('sim_session_captures')
    .select('iracing_settings_json, coach_dave_data, hardware_scan')
    .eq('id', sessionId).eq('user_id', user.id).single()
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Find the file in either iRacing setup_files or coach_dave cdd_setup_files
  let file: any = null
  const ir = session.iracing_settings_json || session.hardware_scan?.sim?.iracing
  if (ir?.setup_files) file = ir.setup_files.find((f: any) => f.name === decodedName)
  if (!file) {
    const cd = session.coach_dave_data || session.hardware_scan?.coach?.coach_dave
    if (cd?.cdd_setup_files) file = cd.cdd_setup_files.find((f: any) => f.name === decodedName)
  }
  if (!file?.content_b64) return NextResponse.json({ error: 'file not stored' }, { status: 404 })

  const buf = Buffer.from(file.content_b64, 'base64')
  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${decodedName}"`,
      'Content-Length': buf.length.toString(),
    },
  })
}
