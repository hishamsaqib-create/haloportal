import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Super Admin
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@halolab.co.uk' },
    update: {},
    create: {
      email: 'admin@halolab.co.uk',
      name: 'Hisham Saqib',
      passwordHash: adminPassword,
      userType: 'INTERNAL',
      role: 'SUPER_ADMIN',
      active: true,
    },
  })
  console.log('Created admin:', admin.email)

  // Create Lab Manager
  const managerPassword = await bcrypt.hash('manager123', 10)
  const manager = await prisma.user.upsert({
    where: { email: 'manager@halolab.co.uk' },
    update: {},
    create: {
      email: 'manager@halolab.co.uk',
      name: 'Lab Manager',
      passwordHash: managerPassword,
      userType: 'INTERNAL',
      role: 'LAB_MANAGER',
      active: true,
    },
  })
  console.log('Created manager:', manager.email)

  // Create Products (lab items - kept for actual use)
  const products = [
    { id: 'prod-1', department: 'CERAMICS', name: 'Porcelain Crown', sku: 'CER-001', basePrice: 120, requiresToothSelection: true },
    { id: 'prod-2', department: 'CERAMICS', name: 'Porcelain Veneer', sku: 'CER-002', basePrice: 150, requiresToothSelection: true },
    { id: 'prod-3', department: 'CERAMICS', name: 'Zirconia Crown', sku: 'CER-003', basePrice: 180, requiresToothSelection: true },
    { id: 'prod-4', department: 'CERAMICS', name: 'E-Max Crown', sku: 'CER-004', basePrice: 200, requiresToothSelection: true },
    { id: 'prod-5', department: 'CERAMICS', name: 'Bridge (per unit)', sku: 'CER-005', basePrice: 130, requiresToothCount: true },
    { id: 'prod-6', department: 'APPLIANCES', name: 'Retainer (Hawley)', sku: 'APP-001', basePrice: 85 },
    { id: 'prod-7', department: 'APPLIANCES', name: 'Retainer (Essix)', sku: 'APP-002', basePrice: 65 },
    { id: 'prod-8', department: 'APPLIANCES', name: 'Night Guard', sku: 'APP-003', basePrice: 95 },
    { id: 'prod-9', department: 'APPLIANCES', name: 'Whitening Tray', sku: 'APP-004', basePrice: 55 },
    { id: 'prod-10', department: 'DSD', name: 'DSD Design', sku: 'DSD-001', basePrice: 250 },
    { id: 'prod-11', department: 'DSD', name: 'Wax-Up (per tooth)', sku: 'DSD-002', basePrice: 45, requiresToothCount: true },
    { id: 'prod-12', department: 'DSD', name: 'Trial Smile', sku: 'DSD-003', basePrice: 180 },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        department: p.department,
        name: p.name,
        sku: p.sku,
        basePrice: p.basePrice,
        requiresToothCount: p.requiresToothCount || false,
        requiresToothSelection: p.requiresToothSelection || false,
        active: true,
      },
    })
  }
  console.log('Created products')

  // Create Email Templates
  await prisma.emailTemplate.upsert({
    where: { name: 'outsource-order' },
    update: {},
    create: {
      name: 'outsource-order',
      subject: 'Outsource Order - Case {{caseNumber}}',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #072a49; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Halo Lab</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1a1a1a;">New Outsource Order</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Case Number:</td><td style="padding: 8px 0; font-weight: bold;">{{caseNumber}}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Patient Ref:</td><td style="padding: 8px 0;">{{patientRef}}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Due Date:</td><td style="padding: 8px 0; font-weight: bold;">{{dueDate}}</td></tr>
          </table>
          <h3 style="color: #1a1a1a; margin-top: 20px;">Items</h3>
          <div>{{items}}</div>
          <div style="margin-top: 20px; padding: 12px; background: #f9fafb; border-radius: 8px;">
            <strong>Notes:</strong><br/>{{notes}}
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">This is an automated message from Halo Lab Portal. Please do not reply directly.</p>
        </div>
      </div>`,
      variables: JSON.stringify(['caseNumber', 'patientRef', 'dueDate', 'items', 'notes']),
      category: 'outsource',
      active: true,
    },
  })

  await prisma.emailTemplate.upsert({
    where: { name: 'case-update' },
    update: {},
    create: {
      name: 'case-update',
      subject: 'Case Update - {{caseNumber}}',
      bodyHtml: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #072a49; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Halo Lab</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1a1a1a;">Case Update</h2>
          <p>Case <strong>{{caseNumber}}</strong> has been updated.</p>
          <p><strong>New Status:</strong> {{status}}</p>
          <p>{{message}}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Halo Lab Portal</p>
        </div>
      </div>`,
      variables: JSON.stringify(['caseNumber', 'status', 'message']),
      category: 'update',
      active: true,
    },
  })
  console.log('Created email templates')

  // Create Department Status Configs
  await prisma.departmentStatusConfig.upsert({
    where: { department: 'CERAMICS' },
    update: {},
    create: {
      department: 'CERAMICS',
      statuses: JSON.stringify(['NEW', 'REVIEWED', 'IN_PRODUCTION', 'SENT_OUTSOURCE', 'RECEIVED', 'QC', 'READY', 'DISPATCHED', 'COMPLETED']),
    },
  })
  await prisma.departmentStatusConfig.upsert({
    where: { department: 'APPLIANCES' },
    update: {},
    create: {
      department: 'APPLIANCES',
      statuses: JSON.stringify(['NEW', 'REVIEWED', 'IN_PRODUCTION', 'QC', 'READY', 'DISPATCHED', 'COMPLETED']),
    },
  })
  await prisma.departmentStatusConfig.upsert({
    where: { department: 'DSD' },
    update: {},
    create: {
      department: 'DSD',
      statuses: JSON.stringify(['NEW', 'REVIEWED', 'IN_PRODUCTION', 'SENT_OUTSOURCE', 'RECEIVED', 'QC', 'READY', 'DISPATCHED', 'COMPLETED']),
    },
  })
  console.log('Created department status configs')

  // Default system settings
  const defaultSettings = [
    { key: 'lab_name', value: 'Halo Dental Lab', label: 'Lab Name', category: 'general' },
    { key: 'lab_email', value: 'info@halolab.co.uk', label: 'Lab Email', category: 'branding' },
    { key: 'lab_phone', value: '', label: 'Lab Phone', category: 'branding' },
    { key: 'lab_address', value: '', label: 'Lab Address', category: 'branding' },
    { key: 'vat_rate', value: '20', label: 'VAT Rate (%)', category: 'billing' },
    { key: 'payment_terms_days', value: '30', label: 'Payment Terms (days)', category: 'billing' },
    { key: 'currency', value: 'GBP', label: 'Currency', category: 'billing' },
    { key: 'case_number_format', value: 'HL-YYYY-XXXX', label: 'Case Number Format', category: 'general' },
    { key: 'invoice_number_format', value: 'INV-YYYYMM-XXXX', label: 'Invoice Number Format', category: 'general' },
    { key: 'theme_accent_color', value: '#0071e3', label: 'Accent Color', category: 'branding' },
  ]

  for (const setting of defaultSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log('Created default system settings')

  console.log('Seed completed! No fake data created - ready for real clinic/case data.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
