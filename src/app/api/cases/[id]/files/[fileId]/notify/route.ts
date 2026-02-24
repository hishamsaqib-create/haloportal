import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'
import nodemailer from 'nodemailer'

type RouteContext = { params: Promise<{ id: string; fileId: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id, fileId } = await context.params

    // Verify the file belongs to this case
    const file = await prisma.caseFile.findFirst({
      where: { id: fileId, caseId: id },
      include: {
        case: {
          include: {
            dentist: { select: { id: true, name: true, email: true } },
            clinic: { select: { name: true } },
          },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Mark as notified
    const updated = await prisma.caseFile.update({
      where: { id: fileId },
      data: { dentistNotified: true },
    })

    // Send email notification to dentist
    const dentistEmail = file.case.dentist.email
    if (dentistEmail) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@halolab.co.uk',
          to: dentistEmail,
          subject: `New file available for case ${file.case.caseNumber}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1d1d1f;">New File Available</h2>
              <p>Dear Dr. ${file.case.dentist.name},</p>
              <p>A new file has been shared with you for case <strong>${file.case.caseNumber}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">File</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${file.fileName}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Case</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${file.case.caseNumber}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Type</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${file.direction === 'OUTBOUND' ? 'Design/Output' : 'File'}</td></tr>
              </table>
              <p>Please log in to your Halo Dentist Portal to view and download the file.</p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Halo Dental Laboratory</p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError)
        // Don't fail the request if email fails - file is still marked as notified
      }
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    return handleAuthError(error)
  }
}
