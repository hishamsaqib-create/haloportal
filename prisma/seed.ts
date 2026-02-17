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

  // Create Clinics
  const clinic1 = await prisma.clinic.upsert({
    where: { id: 'clinic-1' },
    update: {},
    create: {
      id: 'clinic-1',
      name: 'Smile Dental Clinic',
      address: '123 High Street, London, W1A 1AA',
      phone: '020 7123 4567',
      email: 'info@smiledental.co.uk',
      billingName: 'Smile Dental Ltd',
      billingAddress: '123 High Street, London, W1A 1AA',
      billingEmail: 'accounts@smiledental.co.uk',
      paymentTermDays: 30,
    },
  })

  const clinic2 = await prisma.clinic.upsert({
    where: { id: 'clinic-2' },
    update: {},
    create: {
      id: 'clinic-2',
      name: 'Park Lane Dental',
      address: '45 Park Lane, Manchester, M1 2AB',
      phone: '0161 234 5678',
      email: 'info@parklanedental.co.uk',
      billingName: 'Park Lane Dental Practice',
      billingAddress: '45 Park Lane, Manchester, M1 2AB',
      billingEmail: 'billing@parklanedental.co.uk',
      paymentTermDays: 14,
    },
  })
  console.log('Created clinics')

  // Create Dentists
  const dentist1 = await prisma.dentist.upsert({
    where: { id: 'dentist-1' },
    update: {},
    create: {
      id: 'dentist-1',
      clinicId: clinic1.id,
      name: 'Dr Sarah Johnson',
      email: 'sarah@smiledental.co.uk',
      phone: '07700 900001',
      gdcNumber: '123456',
    },
  })

  const dentist2 = await prisma.dentist.upsert({
    where: { id: 'dentist-2' },
    update: {},
    create: {
      id: 'dentist-2',
      clinicId: clinic1.id,
      name: 'Dr James Wright',
      email: 'james@smiledental.co.uk',
      phone: '07700 900002',
      gdcNumber: '234567',
    },
  })

  const dentist3 = await prisma.dentist.upsert({
    where: { id: 'dentist-3' },
    update: {},
    create: {
      id: 'dentist-3',
      clinicId: clinic2.id,
      name: 'Dr Emily Chen',
      email: 'emily@parklanedental.co.uk',
      phone: '07700 900003',
      gdcNumber: '345678',
    },
  })
  console.log('Created dentists')

  // Create Dentist Portal Users
  const dentistPassword = await bcrypt.hash('dentist123', 10)
  await prisma.user.upsert({
    where: { email: 'sarah@smiledental.co.uk' },
    update: {},
    create: {
      email: 'sarah@smiledental.co.uk',
      name: 'Dr Sarah Johnson',
      passwordHash: dentistPassword,
      userType: 'DENTIST',
      role: 'DENTIST_USER',
      clinicId: clinic1.id,
      dentistId: dentist1.id,
      active: true,
    },
  })

  // Create Clinic Admin User
  const clinicPassword = await bcrypt.hash('clinic123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@smiledental.co.uk' },
    update: {},
    create: {
      email: 'admin@smiledental.co.uk',
      name: 'Clinic Admin',
      passwordHash: clinicPassword,
      userType: 'CLINIC',
      role: 'CLINIC_ADMIN',
      clinicId: clinic1.id,
      active: true,
    },
  })
  console.log('Created portal users')

  // Create Referral Centres
  const rc1 = await prisma.referralCentre.upsert({
    where: { id: 'rc-1' },
    update: {},
    create: {
      id: 'rc-1',
      name: 'Premier Ceramics Lab',
      email: 'orders@premierceramics.co.uk',
      phone: '020 8555 1234',
      address: '10 Industrial Estate, Birmingham, B1 1AA',
      defaultLeadTimeDays: 5,
      specialties: JSON.stringify(['Ceramics', 'Veneers', 'Crowns']),
    },
  })

  const rc2 = await prisma.referralCentre.upsert({
    where: { id: 'rc-2' },
    update: {},
    create: {
      id: 'rc-2',
      name: 'DSD Design Centre',
      email: 'cases@dsddesign.co.uk',
      phone: '020 8555 5678',
      address: '20 Tech Park, Leeds, LS1 1AA',
      defaultLeadTimeDays: 7,
      specialties: JSON.stringify(['DSD', 'Digital Design', 'Smile Makeover']),
    },
  })
  console.log('Created referral centres')

  // Create Products
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

  // Create sample cases
  const patient1 = await prisma.patient.upsert({
    where: { reference: 'PAT-001' },
    update: {},
    create: { reference: 'PAT-001', initials: 'JD' },
  })
  const patient2 = await prisma.patient.upsert({
    where: { reference: 'PAT-002' },
    update: {},
    create: { reference: 'PAT-002', initials: 'AB' },
  })

  const case1 = await prisma.case.upsert({
    where: { caseNumber: 'HL-2026-0001' },
    update: {},
    create: {
      caseNumber: 'HL-2026-0001',
      clinicId: clinic1.id,
      dentistId: dentist1.id,
      patientId: patient1.id,
      department: 'CERAMICS',
      status: 'IN_PRODUCTION',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: 'Shade A2, patient prefers natural look',
      source: 'MANUAL',
    },
  })

  await prisma.caseItem.upsert({
    where: { id: 'ci-1' },
    update: {},
    create: {
      id: 'ci-1',
      caseId: case1.id,
      productId: 'prod-1',
      description: 'Porcelain Crown',
      qty: 1,
      toothNumbers: JSON.stringify([14]),
      material: 'Porcelain',
      shade: 'A2',
      unitPrice: 120,
      lineTotal: 120,
    },
  })

  const case2 = await prisma.case.upsert({
    where: { caseNumber: 'HL-2026-0002' },
    update: {},
    create: {
      caseNumber: 'HL-2026-0002',
      clinicId: clinic1.id,
      dentistId: dentist2.id,
      patientId: patient2.id,
      department: 'APPLIANCES',
      status: 'NEW',
      priority: 'NORMAL',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      source: 'MANUAL',
    },
  })

  await prisma.caseItem.upsert({
    where: { id: 'ci-2' },
    update: {},
    create: {
      id: 'ci-2',
      caseId: case2.id,
      productId: 'prod-8',
      description: 'Night Guard',
      qty: 1,
      unitPrice: 95,
      lineTotal: 95,
    },
  })

  const case3 = await prisma.case.upsert({
    where: { caseNumber: 'HL-2026-0003' },
    update: {},
    create: {
      caseNumber: 'HL-2026-0003',
      clinicId: clinic2.id,
      dentistId: dentist3.id,
      department: 'DSD',
      status: 'REVIEWED',
      priority: 'NORMAL',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      source: 'MANUAL',
    },
  })

  await prisma.caseItem.upsert({
    where: { id: 'ci-3' },
    update: {},
    create: {
      id: 'ci-3',
      caseId: case3.id,
      productId: 'prod-10',
      description: 'DSD Design',
      qty: 1,
      unitPrice: 250,
      lineTotal: 250,
    },
  })

  console.log('Created sample cases')
  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
