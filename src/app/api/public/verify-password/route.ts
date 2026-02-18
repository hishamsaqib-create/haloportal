import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    const sitePassword = process.env.SITE_PASSWORD || 'halo2024'

    if (password === sitePassword) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
