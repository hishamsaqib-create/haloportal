import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  // Check if already seeded
  const existingUsers = await prisma.user.count()
  if (existingUsers > 0 && !force) {
    return NextResponse.json({ message: 'Database already seeded. Add ?force=true to reseed.', users: existingUsers })
  }

  // If force reseed, clear all data in correct order
  if (force) {
    await prisma.auditLog.deleteMany()
    await prisma.dAMASPrescription.deleteMany()
    await prisma.remake.deleteMany()
    await prisma.supplierInvoice.deleteMany()
    await prisma.invoiceLine.deleteMany()
    await prisma.invoice.deleteMany()
    await prisma.statement.deleteMany()
    await prisma.emailMessage.deleteMany()
    await prisma.emailThread.deleteMany()
    await prisma.outsourceOrder.deleteMany()
    await prisma.caseItem.deleteMany()
    await prisma.case.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.pricingRule.deleteMany()
    await prisma.product.deleteMany()
    await prisma.emailTemplate.deleteMany()
    await prisma.departmentStatusConfig.deleteMany()
    await prisma.userInvite.deleteMany()
    await prisma.user.deleteMany()
    await prisma.dentist.deleteMany()
    await prisma.referralCentre.deleteMany()
    await prisma.clinic.deleteMany()
  }

  // Create Super Admin
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.create({
    data: {
      email: 'drhish@halolab.co.uk',
      name: 'Hisham Saqib',
      passwordHash: adminPassword,
      userType: 'INTERNAL',
      role: 'SUPER_ADMIN',
      active: true,
    },
  })

  // Create Lab Manager
  const managerPassword = await bcrypt.hash('manager123', 10)
  await prisma.user.create({
    data: {
      email: 'danielle@halolab.co.uk',
      name: 'Danielle',
      passwordHash: managerPassword,
      userType: 'INTERNAL',
      role: 'LAB_MANAGER',
      active: true,
    },
  })

  // Create Clinics
  const clinic1 = await prisma.clinic.create({
    data: {
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

  const clinic2 = await prisma.clinic.create({
    data: {
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

  // Create Dentists
  const dentist1 = await prisma.dentist.create({
    data: {
      clinicId: clinic1.id,
      name: 'Dr Sarah Johnson',
      email: 'sarah@smiledental.co.uk',
      phone: '07700 900001',
      gdcNumber: '123456',
    },
  })

  const dentist2 = await prisma.dentist.create({
    data: {
      clinicId: clinic1.id,
      name: 'Dr James Wright',
      email: 'james@smiledental.co.uk',
      phone: '07700 900002',
      gdcNumber: '234567',
    },
  })

  const dentist3 = await prisma.dentist.create({
    data: {
      clinicId: clinic2.id,
      name: 'Dr Emily Chen',
      email: 'emily@parklanedental.co.uk',
      phone: '07700 900003',
      gdcNumber: '345678',
    },
  })

  // Create Dentist Portal User
  const dentistPassword = await bcrypt.hash('dentist123', 10)
  await prisma.user.create({
    data: {
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
  await prisma.user.create({
    data: {
      email: 'admin@smiledental.co.uk',
      name: 'Clinic Admin',
      passwordHash: clinicPassword,
      userType: 'CLINIC',
      role: 'CLINIC_ADMIN',
      clinicId: clinic1.id,
      active: true,
    },
  })

  // Create Referral Centres
  await prisma.referralCentre.create({
    data: {
      name: 'Premier Ceramics Lab',
      email: 'orders@premierceramics.co.uk',
      phone: '020 8555 1234',
      address: '10 Industrial Estate, Birmingham, B1 1AA',
      defaultLeadTimeDays: 5,
      specialties: JSON.stringify(['Ceramics', 'Veneers', 'Crowns']),
    },
  })

  await prisma.referralCentre.create({
    data: {
      name: 'DSD Design Centre',
      email: 'cases@dsddesign.co.uk',
      phone: '020 8555 5678',
      address: '20 Tech Park, Leeds, LS1 1AA',
      defaultLeadTimeDays: 7,
      specialties: JSON.stringify(['DSD', 'Digital Design', 'Smile Makeover']),
    },
  })

  // Create Products
  const products = [
    { department: 'CERAMICS', name: 'Porcelain Crown', sku: 'CER-001', basePrice: 120, requiresToothSelection: true },
    { department: 'CERAMICS', name: 'Porcelain Veneer', sku: 'CER-002', basePrice: 150, requiresToothSelection: true },
    { department: 'CERAMICS', name: 'Zirconia Crown', sku: 'CER-003', basePrice: 180, requiresToothSelection: true },
    { department: 'CERAMICS', name: 'E-Max Crown', sku: 'CER-004', basePrice: 200, requiresToothSelection: true },
    { department: 'CERAMICS', name: 'Bridge (per unit)', sku: 'CER-005', basePrice: 130, requiresToothCount: true },
    { department: 'APPLIANCES', name: 'Retainer (Hawley)', sku: 'APP-001', basePrice: 85 },
    { department: 'APPLIANCES', name: 'Retainer (Essix)', sku: 'APP-002', basePrice: 65 },
    { department: 'APPLIANCES', name: 'Night Guard', sku: 'APP-003', basePrice: 95 },
    { department: 'APPLIANCES', name: 'Whitening Tray', sku: 'APP-004', basePrice: 55 },
    { department: 'DSD', name: 'DSD Design', sku: 'DSD-001', basePrice: 250 },
    { department: 'DSD', name: 'Wax-Up (per tooth)', sku: 'DSD-002', basePrice: 45, requiresToothCount: true },
    { department: 'DSD', name: 'Trial Smile', sku: 'DSD-003', basePrice: 180 },
  ]

  for (const p of products) {
    await prisma.product.create({
      data: {
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

  // Create Email Templates
  await prisma.emailTemplate.create({
    data: {
      name: 'outsource-order',
      subject: 'Outsource Order - Case {{caseNumber}}',
      bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: #072a49; color: white; padding: 20px; text-align: center;"><h1 style="margin: 0; font-size: 24px;">Halo Lab</h1></div><div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;"><h2 style="color: #1a1a1a;">New Outsource Order</h2><p>Case: {{caseNumber}}</p><p>Patient: {{patientRef}}</p><p>Due: {{dueDate}}</p><div>{{items}}</div><p>{{notes}}</p></div></div>',
      variables: JSON.stringify(['caseNumber', 'patientRef', 'dueDate', 'items', 'notes']),
      category: 'outsource',
      active: true,
    },
  })

  await prisma.emailTemplate.create({
    data: {
      name: 'case-update',
      subject: 'Case Update - {{caseNumber}}',
      bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: #072a49; color: white; padding: 20px; text-align: center;"><h1 style="margin: 0; font-size: 24px;">Halo Lab</h1></div><div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;"><h2 style="color: #1a1a1a;">Case Update</h2><p>Case <strong>{{caseNumber}}</strong> status: {{status}}</p><p>{{message}}</p></div></div>',
      variables: JSON.stringify(['caseNumber', 'status', 'message']),
      category: 'update',
      active: true,
    },
  })

  // Create Department Status Configs
  await prisma.departmentStatusConfig.create({
    data: {
      department: 'CERAMICS',
      statuses: JSON.stringify(['NEW', 'REVIEWED', 'IN_PRODUCTION', 'SENT_OUTSOURCE', 'RECEIVED', 'QC', 'READY', 'DISPATCHED', 'COMPLETED']),
    },
  })
  await prisma.departmentStatusConfig.create({
    data: {
      department: 'APPLIANCES',
      statuses: JSON.stringify(['NEW', 'REVIEWED', 'IN_PRODUCTION', 'QC', 'READY', 'DISPATCHED', 'COMPLETED']),
    },
  })
  await prisma.departmentStatusConfig.create({
    data: {
      department: 'DSD',
      statuses: JSON.stringify(['NEW', 'REVIEWED', 'IN_PRODUCTION', 'SENT_OUTSOURCE', 'RECEIVED', 'QC', 'READY', 'DISPATCHED', 'COMPLETED']),
    },
  })

  // Create sample patients and cases
  const patient1 = await prisma.patient.create({ data: { reference: 'PAT-001', initials: 'JD' } })
  const patient2 = await prisma.patient.create({ data: { reference: 'PAT-002', initials: 'AB' } })

  const case1 = await prisma.case.create({
    data: {
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

  const prodCrown = await prisma.product.findFirst({ where: { sku: 'CER-001' } })
  await prisma.caseItem.create({
    data: {
      caseId: case1.id,
      productId: prodCrown?.id,
      description: 'Porcelain Crown',
      qty: 1,
      toothNumbers: JSON.stringify([14]),
      material: 'Porcelain',
      shade: 'A2',
      unitPrice: 120,
      lineTotal: 120,
    },
  })

  const case2 = await prisma.case.create({
    data: {
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

  const prodNightGuard = await prisma.product.findFirst({ where: { sku: 'APP-003' } })
  await prisma.caseItem.create({
    data: {
      caseId: case2.id,
      productId: prodNightGuard?.id,
      description: 'Night Guard',
      qty: 1,
      unitPrice: 95,
      lineTotal: 95,
    },
  })

  const case3 = await prisma.case.create({
    data: {
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

  const prodDsd = await prisma.product.findFirst({ where: { sku: 'DSD-001' } })
  await prisma.caseItem.create({
    data: {
      caseId: case3.id,
      productId: prodDsd?.id,
      description: 'DSD Design',
      qty: 1,
      unitPrice: 250,
      lineTotal: 250,
    },
  })

  return NextResponse.json({
    message: 'Database seeded successfully!',
    data: {
      users: 4,
      clinics: 2,
      dentists: 3,
      products: 12,
      cases: 3,
      referralCentres: 2,
      emailTemplates: 2,
    },
    loginAccounts: [
      { email: 'drhish@halolab.co.uk', password: 'admin123', role: 'Lab Super Admin' },
      { email: 'danielle@halolab.co.uk', password: 'manager123', role: 'Lab Manager' },
      { email: 'sarah@smiledental.co.uk', password: 'dentist123', role: 'Dentist Portal' },
      { email: 'admin@smiledental.co.uk', password: 'clinic123', role: 'Clinic Admin' },
    ],
  })
}
