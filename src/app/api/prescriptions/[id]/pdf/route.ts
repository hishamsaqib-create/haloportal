import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const prescription = await prisma.dAMASPrescription.findUnique({
      where: { id },
      include: {
        case: {
          include: {
            clinic: true,
            dentist: true,
            patient: true,
            items: {
              include: { product: true },
            },
          },
        },
        generatedBy: { select: { name: true } },
      },
    })

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }

    const c = prescription.case
    const items = c.items

    const toothDisplay = (json: string | null) => {
      if (!json) return '—'
      try {
        const parsed = JSON.parse(json)
        if (!Array.isArray(parsed) || parsed.length === 0) return '—'
        return parsed.join(', ')
      } catch {
        return json || '—'
      }
    }

    const formatDate = (d: Date | null) => {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Prescription ${c.caseNumber}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1d1d1f; font-size: 13px; line-height: 1.5; background: white; }
    .page { max-width: 210mm; margin: 0 auto; padding: 20mm; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #1d1d1f; }
    .logo-area h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .logo-area h1 span { color: #3b82f6; }
    .logo-area p { font-size: 10px; color: #6e6e73; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
    .doc-info { text-align: right; }
    .doc-info .label { font-size: 10px; color: #6e6e73; text-transform: uppercase; letter-spacing: 1px; }
    .doc-info .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
    .doc-info .case-no { font-size: 18px; font-weight: 700; color: #1d1d1f; font-family: monospace; }

    /* Grid */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .section { background: #f5f5f7; border-radius: 12px; padding: 16px; }
    .section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #6e6e73; margin-bottom: 12px; }
    .field { margin-bottom: 8px; }
    .field .label { font-size: 10px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px; }
    .field .value { font-size: 13px; font-weight: 500; color: #1d1d1f; }

    /* Items table */
    .items-section { margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1d1d1f; color: white; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; padding: 10px 12px; text-align: left; }
    th:first-child { border-radius: 8px 0 0 0; }
    th:last-child { border-radius: 0 8px 0 0; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e5e7; font-size: 12px; }
    tr:last-child td { border-bottom: none; }

    /* Notes */
    .notes-section { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .notes-section .section-title { color: #92400e; }
    .notes-text { font-size: 12px; color: #78350f; white-space: pre-wrap; }

    /* Footer */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e7; display: flex; justify-content: space-between; }
    .footer p { font-size: 10px; color: #86868b; }
    .signature-area { margin-top: 40px; display: flex; gap: 60px; }
    .signature-line { border-top: 1px solid #1d1d1f; width: 200px; padding-top: 6px; font-size: 10px; color: #6e6e73; }

    /* Print */
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 0; max-width: none; }
      .no-print { display: none !important; }
    }

    /* Print button */
    .print-bar { background: #1d1d1f; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; }
    .print-bar button { background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .print-bar button:hover { background: #2563eb; }
    .print-bar span { font-size: 13px; }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span>Prescription for ${c.caseNumber}</span>
    <button onclick="window.print()">Print Prescription</button>
  </div>

  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo-area">
        <h1>halo<span>lab</span></h1>
        <p>Dental Laboratory</p>
      </div>
      <div class="doc-info">
        <div class="label">Prescription</div>
        <div class="case-no">${c.caseNumber}</div>
        <div style="margin-top: 4px; font-size: 11px; color: #6e6e73;">
          v${prescription.version} &middot; ${formatDate(prescription.generatedAt)}
        </div>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="grid-2">
      <div class="section">
        <div class="section-title">Clinic</div>
        <div class="field"><div class="value">${c.clinic.name}</div></div>
        ${c.clinic.address ? `<div class="field"><div class="label">Address</div><div class="value">${c.clinic.address}</div></div>` : ''}
        ${c.clinic.phone ? `<div class="field"><div class="label">Phone</div><div class="value">${c.clinic.phone}</div></div>` : ''}
        ${c.clinic.email ? `<div class="field"><div class="label">Email</div><div class="value">${c.clinic.email}</div></div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Dentist</div>
        <div class="field"><div class="value">${c.dentist.name}</div></div>
        ${c.dentist.gdcNumber ? `<div class="field"><div class="label">GDC Number</div><div class="value">${c.dentist.gdcNumber}</div></div>` : ''}
        ${c.dentist.email ? `<div class="field"><div class="label">Email</div><div class="value">${c.dentist.email}</div></div>` : ''}
        ${c.dentist.phone ? `<div class="field"><div class="label">Phone</div><div class="value">${c.dentist.phone}</div></div>` : ''}
      </div>
    </div>

    <div class="grid-2">
      <div class="section">
        <div class="section-title">Patient</div>
        ${c.patient ? `
          <div class="field"><div class="label">Reference</div><div class="value">${c.patient.reference}</div></div>
          ${c.patient.initials ? `<div class="field"><div class="label">Initials</div><div class="value">${c.patient.initials}</div></div>` : ''}
          ${c.patient.dob ? `<div class="field"><div class="label">DOB</div><div class="value">${c.patient.dob}</div></div>` : ''}
        ` : '<div class="field"><div class="value" style="color:#86868b">No patient data</div></div>'}
      </div>

      <div class="section">
        <div class="section-title">Case Details</div>
        <div class="field"><div class="label">Department</div><div class="value">${c.department}</div></div>
        <div class="field"><div class="label">Priority</div><div class="value">${c.priority}</div></div>
        <div class="field"><div class="label">Due Date</div><div class="value">${formatDate(c.dueDate)}</div></div>
      </div>
    </div>

    <!-- Items -->
    <div class="items-section">
      <div class="section-title" style="margin-bottom: 8px;">Prescribed Items</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Material</th>
            <th>Shade</th>
            <th>Teeth</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td><strong>${item.description}</strong>${item.product ? ` <span style="color:#86868b">(${item.product.sku || item.product.name})</span>` : ''}</td>
              <td>${item.material || '—'}</td>
              <td>${item.shade || '—'}</td>
              <td>${toothDisplay(item.toothNumbers)}</td>
              <td>${item.qty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${c.notes ? `
    <div class="notes-section">
      <div class="section-title">Notes & Instructions</div>
      <div class="notes-text">${c.notes}</div>
    </div>
    ` : ''}

    <!-- Signatures -->
    <div class="signature-area">
      <div>
        <div class="signature-line">Dentist Signature</div>
      </div>
      <div>
        <div class="signature-line">Date</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Generated by ${prescription.generatedBy.name} on ${formatDate(prescription.generatedAt)}</p>
      <p>Halo Dental Lab &middot; halolab.co.uk</p>
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Prescription PDF error:', error)
    return NextResponse.json({ error: 'Failed to generate prescription' }, { status: 500 })
  }
}
