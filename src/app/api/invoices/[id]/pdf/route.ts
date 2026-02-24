import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError, scopeInvoiceQuery } from '@/lib/rbac'
import { parseToothNumbers, calculatePerToothPrice } from '@/lib/pricing'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    // Scope access
    const scopeWhere = scopeInvoiceQuery(user)

    const invoice = await prisma.invoice.findFirst({
      where: { id, ...scopeWhere },
      include: {
        clinic: true,
        dentist: true,
        lines: {
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                status: true,
                createdAt: true,
              },
            },
            caseItem: {
              select: {
                id: true,
                description: true,
                toothNumbers: true,
                productId: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Filter lines to only include cases that are COMPLETED and fall within invoice period
    const filteredLines = invoice.lines.filter((line: typeof invoice.lines[number]) => {
      // Must have a case and the case must be COMPLETED
      if (!line.case) return true // Keep non-case lines (manual entries)
      if (line.case.status !== 'COMPLETED') return false

      // Check period bounds if set
      if (invoice.periodStart && line.case.createdAt < invoice.periodStart) return false
      if (invoice.periodEnd && line.case.createdAt > invoice.periodEnd) return false

      return true
    })

    // Get dentist pricing variation if assigned
    let pricingVariationName: string | null = null
    if (invoice.dentist?.pricingVariationId) {
      const variationRule = await prisma.pricingRule.findUnique({
        where: { id: invoice.dentist.pricingVariationId },
      })
      if (variationRule) {
        pricingVariationName = variationRule.variationName || null
      }
    }

    // Recalculate totals from filtered lines
    const subtotal = filteredLines.reduce((sum: number, line: typeof invoice.lines[number]) => sum + line.total, 0)
    const vatAmount = subtotal * (invoice.vatRate / 100)
    const total = subtotal + vatAmount

    const formatDate = (d: Date | string | null) => {
      if (!d) return '\u2014'
      return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }

    const formatCurrency = (amount: number) => {
      return '\u00a3' + amount.toFixed(2)
    }

    const toothDisplay = (json: string | null) => {
      if (!json) return '\u2014'
      const teeth = parseToothNumbers(json)
      if (teeth.length === 0) return '\u2014'
      return teeth.join(', ')
    }

    // Build per-tooth pricing info for each line
    const lineRows = filteredLines.map((line: typeof invoice.lines[number]) => {
      const toothNumbers = line.caseItem?.toothNumbers || null
      const teeth = parseToothNumbers(toothNumbers)
      const toothCount = teeth.length || 0
      const additionalTeeth = line.additionalTeeth || 0

      let perToothNote = ''
      if (line.toothCount && line.toothCount > 0 && additionalTeeth > 0) {
        perToothNote = `<div style="font-size:10px;color:#6e6e73;">
          ${line.toothCount} teeth (${additionalTeeth} additional)
        </div>`
      }

      return `
        <tr>
          <td>
            <div>${line.description}</div>
            ${line.case ? `<div style="font-size:10px;color:#6e6e73;">${line.case.caseNumber}</div>` : ''}
            ${perToothNote}
          </td>
          <td style="text-align:center;">${toothCount > 0 ? toothDisplay(toothNumbers) : '\u2014'}</td>
          <td style="text-align:center;">${line.qty}</td>
          <td style="text-align:right;">${formatCurrency(line.unitPrice)}</td>
          <td style="text-align:right;">${formatCurrency(line.total)}</td>
        </tr>
      `
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNo}</title>
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
    .doc-info .inv-no { font-size: 18px; font-weight: 700; color: #1d1d1f; font-family: monospace; }

    /* Grid */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .section { background: #f5f5f7; border-radius: 12px; padding: 16px; }
    .section-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #6e6e73; margin-bottom: 12px; }
    .field { margin-bottom: 8px; }
    .field .label { font-size: 10px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px; }
    .field .value { font-size: 13px; font-weight: 500; color: #1d1d1f; }

    /* Status badge */
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-draft { background: #fef3c7; color: #92400e; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-overdue { background: #fee2e2; color: #991b1b; }

    /* Items table */
    .items-section { margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1d1d1f; color: white; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; padding: 10px 12px; text-align: left; }
    th:first-child { border-radius: 8px 0 0 0; }
    th:last-child { border-radius: 0 8px 0 0; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e5e7; font-size: 12px; }
    tr:last-child td { border-bottom: none; }

    /* Totals */
    .totals { margin-left: auto; width: 280px; margin-bottom: 24px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e7; }
    .totals-row.grand-total { border-bottom: 2px solid #1d1d1f; border-top: 2px solid #1d1d1f; font-size: 16px; font-weight: 700; padding: 12px 0; }
    .totals-row .label { color: #6e6e73; }
    .totals-row .value { font-weight: 600; }

    /* Footer */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e7; display: flex; justify-content: space-between; }
    .footer p { font-size: 10px; color: #86868b; }

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
    <span>Invoice ${invoice.invoiceNo}</span>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo-area">
        <h1>halo<span>lab</span></h1>
        <p>Dental Laboratory</p>
      </div>
      <div class="doc-info">
        <div class="label">Invoice</div>
        <div class="inv-no">${invoice.invoiceNo}</div>
        <div style="margin-top: 4px;">
          <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
        </div>
      </div>
    </div>

    <!-- Billing Info -->
    <div class="grid-3">
      <div class="section">
        <div class="section-title">Bill To</div>
        <div class="field"><div class="value">${invoice.clinic.billingName || invoice.clinic.name}</div></div>
        ${invoice.clinic.billingAddress ? `<div class="field"><div class="label">Address</div><div class="value">${invoice.clinic.billingAddress}</div></div>` : ''}
        ${invoice.clinic.billingEmail ? `<div class="field"><div class="label">Email</div><div class="value">${invoice.clinic.billingEmail}</div></div>` : ''}
        ${invoice.clinic.vatNumber ? `<div class="field"><div class="label">VAT Number</div><div class="value">${invoice.clinic.vatNumber}</div></div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Dentist</div>
        ${invoice.dentist ? `
          <div class="field"><div class="value">${invoice.dentist.name}</div></div>
          ${invoice.dentist.gdcNumber ? `<div class="field"><div class="label">GDC Number</div><div class="value">${invoice.dentist.gdcNumber}</div></div>` : ''}
          ${pricingVariationName ? `<div class="field"><div class="label">Pricing</div><div class="value">${pricingVariationName}</div></div>` : ''}
        ` : '<div class="field"><div class="value" style="color:#86868b">All dentists</div></div>'}
      </div>

      <div class="section">
        <div class="section-title">Invoice Details</div>
        <div class="field"><div class="label">Date</div><div class="value">${formatDate(invoice.createdAt)}</div></div>
        <div class="field"><div class="label">Due Date</div><div class="value">${formatDate(invoice.dueDate)}</div></div>
        ${invoice.periodStart ? `<div class="field"><div class="label">Period</div><div class="value">${formatDate(invoice.periodStart)} &ndash; ${formatDate(invoice.periodEnd)}</div></div>` : ''}
      </div>
    </div>

    <!-- Line Items -->
    <div class="items-section">
      <div class="section-title" style="margin-bottom: 8px;">Invoice Lines</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:center;">Teeth</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineRows}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-row">
        <span class="label">Subtotal</span>
        <span class="value">${formatCurrency(subtotal)}</span>
      </div>
      <div class="totals-row">
        <span class="label">VAT (${invoice.vatRate}%)</span>
        <span class="value">${formatCurrency(vatAmount)}</span>
      </div>
      <div class="totals-row grand-total">
        <span class="label">Total</span>
        <span class="value">${formatCurrency(total)}</span>
      </div>
    </div>

    ${invoice.notes ? `
    <div class="section" style="background: #fffbeb; border: 1px solid #fde68a; margin-bottom: 24px;">
      <div class="section-title" style="color: #92400e;">Notes</div>
      <div style="font-size: 12px; color: #78350f; white-space: pre-wrap;">${invoice.notes}</div>
    </div>
    ` : ''}

    <!-- Payment Info -->
    <div class="section" style="margin-bottom: 24px;">
      <div class="section-title">Payment Information</div>
      <div class="field"><div class="label">Payment Terms</div><div class="value">${invoice.clinic.paymentTermDays} days</div></div>
      <div class="field"><div class="label">Due Date</div><div class="value">${formatDate(invoice.dueDate)}</div></div>
      ${invoice.paidDate ? `<div class="field"><div class="label">Paid Date</div><div class="value">${formatDate(invoice.paidDate)}</div></div>` : ''}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Generated on ${formatDate(new Date())}</p>
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
    console.error('Invoice PDF error:', error)
    return handleAuthError(error)
  }
}
