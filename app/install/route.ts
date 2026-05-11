// chiefracing.com/install
// One URL → immediate download of the Chief tester installer.
// Send your friends ONE link: "go to chiefracing.com/install"
// → their browser instantly downloads "chief-install.bat"
// → they double-click → installer runs and sets everything up.

import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'chief-install.bat')
    const file = await readFile(filePath)
    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-bat; charset=utf-8',
        'Content-Disposition': 'attachment; filename="chief-install.bat"',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
