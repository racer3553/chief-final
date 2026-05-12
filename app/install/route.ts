// chiefracing.com/install
// Signed-in users get a PERSONALIZED installer with their email pre-baked.
// Signed-out users get redirected to /login first.
//
// This means: friend clicks the link → if signed in, file downloads
// with their email already inside → no prompts → runs silently → Chief
// installed and launched in ~2 min unattended.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    // Try to identify the user from cookies — gives us their email to personalize
    let email = ''
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      email = user?.email || ''
    } catch {}

    // Read the template installer
    const filePath = path.join(process.cwd(), 'public', 'chief-install.bat')
    let bat = (await readFile(filePath, 'utf-8'))

    // If we have an email, inject it as a default + auto-skip the prompt
    if (email) {
      // Replace the interactive email prompt with the auto-baked email
      const emailLine = `set "TESTER_EMAIL=${email}"`
      bat = bat.replace(
        'set "TESTER_EMAIL="\nset /p TESTER_EMAIL="  Enter your email: "',
        `${emailLine}\nREM Email pre-baked from chiefracing.com sign-in`,
      )
      // Same fallback variant if line break differs
      bat = bat.replace(
        /set "TESTER_EMAIL="[\r\n\s]+set \/p TESTER_EMAIL=.*?"/,
        emailLine,
      )
      // Remove the "if empty, abort" check that follows
      bat = bat.replace(
        /if "%TESTER_EMAIL%"=="" \([\s\S]*?exit \/b 1[\s\S]*?\)/,
        'REM email pre-set, no abort path needed',
      )
      // Replace pause prompts with short timeouts so the install flows automatically
      bat = bat.replace(/^pause\s*$/gm, 'timeout /t 2 >nul')
      // Force a final auto-launch of Chief after install completes
      // (the existing bat opens chiefracing.com/dashboard/sessions at the end; we also start the daemon)
      bat = bat.replace(
        'start "" "https://chiefracing.com/dashboard/sessions"\npause',
        'start "" "https://chiefracing.com/dashboard"\nREM Auto-launch Chief daemon now that install is done\nstart "" "%USERPROFILE%\\Desktop\\Chief.lnk"\necho.\necho Chief is starting. You can close this window.\ntimeout /t 5 >nul',
      )
    }

    const filename = email
      ? `chief-install-${email.split('@')[0].replace(/[^a-z0-9]/gi, '')}.bat`
      : 'chief-install.bat'

    return new NextResponse(bat, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-bat; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
