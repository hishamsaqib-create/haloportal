import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

const sampleData: Record<string, string> = {
  '{{clinicName}}': 'Smile Dental Clinic',
  '{{dentistName}}': 'Dr. Sarah Johnson',
  '{{patientRef}}': 'JS',
  '{{caseNumber}}': 'C-JS-0001',
  '{{department}}': 'Ceramics',
  '{{status}}': 'In Production',
  '{{dueDate}}': '28 Feb 2026',
  '{{labName}}': 'Halo Dental Lab',
  '{{trackingRef}}': 'TRK-12345',
  '{{notes}}': 'Sample note for preview purposes.',
  '{{portalLink}}': 'https://portal.halolab.co.uk',
  '{{items}}': 'Porcelain Veneer x2, Zirconia Crown x1',
  '{{fileLink}}': 'https://portal.halolab.co.uk/files/sample',
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params

    const template = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    let previewHtml = template.bodyHtml
    let previewSubject = template.subject

    for (const [key, value] of Object.entries(sampleData)) {
      previewHtml = previewHtml.replaceAll(key, value)
      previewSubject = previewSubject.replaceAll(key, value)
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Preview: ${template.name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f7; margin: 0; padding: 20px; }
  .preview-bar { background: #1d1d1f; color: white; padding: 12px 24px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; }
  .preview-bar span { font-size: 13px; }
  .preview-bar .label { color: #86868b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  .preview-content { background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e7; max-width: 640px; }
  .subject-line { font-size: 16px; font-weight: 600; color: #1d1d1f; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e5e7; }
</style></head><body>
  <div style="max-width: 680px; margin: 0 auto;">
    <div class="preview-bar">
      <div><span class="label">Template Preview</span><br><span>${template.name}</span></div>
      <div><span class="label">Category</span><br><span>${template.category || 'General'}</span></div>
    </div>
    <div class="preview-content">
      <div class="subject-line">Subject: ${previewSubject}</div>
      ${previewHtml}
    </div>
  </div>
</body></html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
