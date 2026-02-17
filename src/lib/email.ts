import { prisma } from './prisma'

interface SendEmailOptions {
  to: string
  cc?: string
  subject: string
  html: string
  text?: string
  caseId?: string
  sentById?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const { to, cc, subject, html, text, caseId, sentById } = options

  // Use SMTP transport
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@halolab.co.uk',
      to,
      cc: cc || undefined,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    })

    // Store in email thread if linked to a case
    if (caseId) {
      let thread = await prisma.emailThread.findFirst({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
      })

      if (!thread) {
        thread = await prisma.emailThread.create({
          data: { caseId, subject },
        })
      }

      await prisma.emailMessage.create({
        data: {
          threadId: thread.id,
          fromAddress: process.env.SMTP_FROM || 'noreply@halolab.co.uk',
          toAddress: to,
          ccAddress: cc || null,
          subject,
          bodyHtml: html,
          bodyText: text || null,
          direction: 'OUTBOUND',
          providerId: info.messageId || null,
          sentById: sentById || null,
        },
      })
    }

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false }
  }
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return rendered
}

export async function sendOutsourceEmail(params: {
  referralCentreEmail: string
  caseNumber: string
  patientRef: string
  items: string
  dueDate: string
  notes: string
  caseId: string
  sentById: string
}) {
  const template = await prisma.emailTemplate.findFirst({
    where: { category: 'outsource', active: true },
  })

  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #072a49; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Halo Lab</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb;">
        <h2>New Outsource Order</h2>
        <p><strong>Case:</strong> {{caseNumber}}</p>
        <p><strong>Patient Ref:</strong> {{patientRef}}</p>
        <p><strong>Items:</strong></p>
        <div>{{items}}</div>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
        <p><strong>Notes:</strong> {{notes}}</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated message from Halo Lab Portal.
          Please do not reply directly to this email.
        </p>
      </div>
    </div>
  `

  const html = renderTemplate(template?.bodyHtml || defaultHtml, {
    caseNumber: params.caseNumber,
    patientRef: params.patientRef,
    items: params.items,
    dueDate: params.dueDate,
    notes: params.notes,
  })

  return sendEmail({
    to: params.referralCentreEmail,
    subject: `Outsource Order - Case ${params.caseNumber}`,
    html,
    caseId: params.caseId,
    sentById: params.sentById,
  })
}
