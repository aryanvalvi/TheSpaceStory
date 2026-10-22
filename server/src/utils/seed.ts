import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { StudioSettings } from '../models/StudioSettings.js';
import { CatalogueItem } from '../models/CatalogueItem.js';
import { Client } from '../models/Client.js';
import { Project } from '../models/Project.js';
import { Quotation } from '../models/Quotation.js';
import { getNextSequence } from '../models/Counter.js';
import { calculateQuotation } from '../services/calculations/index.js';

async function seed() {
  console.log('🌱 Starting database seed...');
  await connectDB();

  // 1. Seed Admin User
  let admin = await User.findOne({ email: 'owner@thespacestory.in' });
  if (!admin) {
    admin = new User({
      name: 'The Space Story Admin',
      email: 'owner@thespacestory.in',
      passwordHash: 'Admin@12345',
      role: 'owner',
      active: true,
    });
    await admin.save();
    console.log('✅ Created admin user: owner@thespacestory.in / Admin@12345');
  } else {
    console.log('ℹ️ Admin user already exists');
  }

  // 2. Seed Studio Settings
  let settings = await StudioSettings.findOne();
  if (!settings) {
    settings = new StudioSettings({
      studioName: 'The Space Story',
      logoUrl: '/logo/TTS.png',
      phone: '+91 98200 12345',
      email: 'hello@thespacestory.in',
      gstin: '27AABCU9603R1ZX',
      address: {
        line1: 'Studio 402, Design Quarter',
        line2: 'Off Senapati Bapat Marg, Lower Parel',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400013',
      },
      defaultQuotationValidityDays: 30,
      currency: 'INR',
      defaultTaxConfig: {
        enabled: true,
        type: 'exclusive',
        rate: 18,
        isInterState: false,
      },
      defaultTerms: [
        'All rates quoted are valid for 30 days from the date of issuance.',
        '50% advance along with work order is required to initiate material procurement.',
        'Any modifications or deviations from approved 3D designs/drawings will be billed as variation orders.',
        'Site handover timeline is 60 working days from receipt of initial advance and site clearance.',
        'Warranty of 5 years on BWR plywood and hardware against manufacturing defects.',
      ],
      defaultInclusions: [
        'Complete supply, fabrication, and installation of specified woodwork and finishes.',
        'High-grade soft-close hardware (Hafele / Hettich or equivalent).',
        'Daily site supervision and weekly milestone progress reports.',
        'Post-installation deep cleaning and debris disposal.',
      ],
      defaultExclusions: [
        'Major structural or civil modifications requiring municipal sanctions.',
        'Purchase of standalone loose furniture, artwork, and white goods unless explicitly quoted.',
        'Society move-in/security deposits or building management charges.',
      ],
      defaultPaymentMilestones: [
        { description: 'Booking Confirmation & Design Finalization', percentage: 20 },
        { description: 'Carcass Fabrication & Material Sourcing', percentage: 40 },
        { description: 'On-site Installation & Countertop Fitting', percentage: 30 },
        { description: 'Snagging, Final Handover & Deep Cleaning', percentage: 10 },
      ],
    });
    await settings.save();
    console.log('✅ Created Studio Settings');
  } else {
    console.log('ℹ️ Studio Settings already exist');
  }

  // 3. Seed Catalogue Items
  const catalogueCount = await CatalogueItem.countDocuments();
  if (catalogueCount === 0) {
    const items = [
      {
        name: 'Full Height Master Wardrobe (BWR Plywood + Laminate)',
        category: 'carpentry',
        description: 'Commercial grade BWR plywood with 1mm laminate inside and outside, soft close hinges, concealed handles',
        defaultUnit: 'sqft',
        defaultRate: 185000, // ₹1,850.00 in paise
        defaultQuantityFormula: 'length_x_height',
        defaultSpecifications: 'Century / Greenply 710 grade, Hafele hinges',
        active: true,
      },
      {
        name: 'Bed with Hydraulic Storage & Cushioned Headboard',
        category: 'furniture',
        description: 'King size bed (6ft x 6.5ft) with heavy duty gas lift pistons, fabric cushioned headboard',
        defaultUnit: 'piece',
        defaultRate: 6500000, // ₹65,000.00 in paise
        defaultQuantityFormula: 'manual',
        defaultSpecifications: 'Treated pine frame, 18mm BWR ply base',
        active: true,
      },
      {
        name: 'Floating TV Console with Louvered Fluted Panel',
        category: 'carpentry',
        description: 'Wall hung TV unit with 3 storage drawers and fluted charcoal veneer back panel',
        defaultUnit: 'running_ft',
        defaultRate: 220000, // ₹2,200.00 / RFT
        defaultQuantityFormula: 'manual',
        defaultSpecifications: 'Soft close push-to-open drawer channels',
        active: true,
      },
      {
        name: 'Modular Kitchen - Base & Wall Cabinets',
        category: 'modular_kitchen',
        description: 'Waterproof HDHMR carcass with acrylic shutters, Blum tandem box drawers',
        defaultUnit: 'running_ft',
        defaultRate: 320000, // ₹3,200.00 / RFT
        defaultQuantityFormula: 'manual',
        defaultSpecifications: 'Blum Antaro runners, anti-scratch acrylic',
        active: true,
      },
      {
        name: 'Quartz Countertop with Edge Moulding',
        category: 'modular_kitchen',
        description: 'Premium Kalinga Stone or Caesarstone 20mm quartz top with pencil edge polish and sink cutout',
        defaultUnit: 'sqft',
        defaultRate: 480000, // ₹4,800.00 / sqft
        defaultQuantityFormula: 'length_x_width',
        defaultSpecifications: 'Stain resistant engineered quartz',
        active: true,
      },
      {
        name: 'Designer False Ceiling with Cove Lighting',
        category: 'false_ceiling',
        description: 'Saint Gobain Gyproc false ceiling with perimeter shadow groove and indirect LED cove trough',
        defaultUnit: 'sqft',
        defaultRate: 14500, // ₹145.00 / sqft
        defaultQuantityFormula: 'length_x_width',
        defaultSpecifications: 'GI channel framework with Gyproc boards',
        active: true,
      },
      {
        name: 'Royale Luxury Emulsion Painting',
        category: 'painting',
        description: '2 coats of acrylic putty, 1 coat primer, and 2 coats Asian Paints Royale Luxury Emulsion',
        defaultUnit: 'sqft',
        defaultRate: 4500, // ₹45.00 / sqft
        defaultQuantityFormula: 'length_x_height',
        defaultSpecifications: 'Machine sanded smooth finish',
        active: true,
      },
      {
        name: 'Concealed LED Strip & Architectural COB Lights',
        category: 'lighting',
        description: 'Warm white (3000K) high-CRI architectural spotlighting with aluminum profile channels',
        defaultUnit: 'piece',
        defaultRate: 180000, // ₹1,800.00 / pc
        defaultQuantityFormula: 'manual',
        defaultSpecifications: 'Philips / Osram driver, CRI > 90',
        active: true,
      },
    ];

    await CatalogueItem.insertMany(items);
    console.log(`✅ Seeded ${items.length} catalogue items`);
  } else {
    console.log('ℹ️ Catalogue items already exist');
  }

  // 4. Seed Demo Client & Project
  let client = await Client.findOne({ email: 'rajesh.sharma@gmail.com' });
  if (!client) {
    client = await Client.create({
      name: 'Rajesh & Priya Sharma',
      email: 'rajesh.sharma@gmail.com',
      phone: '+91 98201 23456',
      billingAddress: {
        line1: 'Apt 1402, Tower B, Sea Green Heights',
        line2: 'Khan Abdul Gaffar Khan Road, Worli',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400018',
      },
    });
    console.log('✅ Created demo client: Rajesh & Priya Sharma');
  }

  let project = await Project.findOne({ clientId: client._id });
  if (!project) {
    project = await Project.create({
      projectName: '3BHK Luxury Residence - Worli',
      clientId: client._id,
      propertyType: 'apartment',
      carpetAreaSqFt: 1550,
      status: 'active',
      siteAddress: {
        line1: 'Flat 1402, Sea Green Heights',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400018',
      },
    });
    console.log('✅ Created demo project: 3BHK Luxury Residence - Worli');
  }

  // 5. Seed a Sample Quotation
  const quotationCount = await Quotation.countDocuments();
  if (quotationCount === 0) {
    const year = new Date().getFullYear();
    const seq = await getNextSequence(`quotation_${year}`);
    const quotationNumber = `TSS-${year}-${String(seq).padStart(4, '0')}`;

    const rooms = [
      {
        roomId: 'room-1',
        name: 'Master Bedroom',
        items: [
          {
            itemId: 'item-101',
            name: 'Full Height Sliding Wardrobe with Bronze Tinted Mirrors',
            category: 'carpentry',
            unit: 'sqft',
            rate: 195000, // ₹1,950.00
            calculationMethod: 'length_x_height',
            dimensions: { length: 10, height: 9 }, // 90 sqft
            quantity: 90,
            amount: 17550000, // 90 * 195000 = ₹1,75,500.00
            isOptional: false,
            isIncluded: true,
          },
          {
            itemId: 'item-102',
            name: 'King Size Hydraulic Storage Bed with Boucle Fabric Headboard',
            category: 'furniture',
            unit: 'piece',
            rate: 7200000, // ₹72,000.00
            calculationMethod: 'manual',
            quantity: 1,
            amount: 7200000,
            isOptional: false,
            isIncluded: true,
          },
        ],
        subtotal: 24750000, // ₹2,47,500.00
      },
      {
        roomId: 'room-2',
        name: 'Living & Dining Room',
        items: [
          {
            itemId: 'item-201',
            name: 'Wall-to-Wall Fluted Charcoal Veneer TV Console with Brass Trim',
            category: 'carpentry',
            unit: 'running_ft',
            rate: 260000, // ₹2,600.00
            calculationMethod: 'manual',
            quantity: 12,
            amount: 3120000, // ₹31,200.00
            isOptional: false,
            isIncluded: true,
          },
          {
            itemId: 'item-202',
            name: 'Perimeter Gyproc False Ceiling with Warm White LED Cove',
            category: 'false_ceiling',
            unit: 'sqft',
            rate: 16000, // ₹160.00
            calculationMethod: 'length_x_width',
            dimensions: { length: 24, width: 14 }, // 336 sqft
            quantity: 336,
            amount: 5376000, // ₹53,760.00
            isOptional: false,
            isIncluded: true,
          },
        ],
        subtotal: 8496000, // ₹84,960.00
      },
    ];

    // Run official calculation engine
    const calcInput = {
      rooms: rooms.map((r) => ({
        roomId: r.roomId,
        name: r.name,
        items: r.items.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          rate: i.rate,
          dimensions: i.dimensions,
          calculationMethod: i.calculationMethod as any,
          isOptional: i.isOptional,
          isIncluded: i.isIncluded,
        })),
      })),
      designFees: [
        {
          feeType: 'percentage' as const,
          amount: 800, // 8% design fee (800 basis points)
          isTaxable: true,
        },
      ],
      additionalCharges: [],
      discount: { type: 'none' as const, value: 0 },
      taxConfig: {
        enabled: true,
        type: 'exclusive' as const,
        rate: 18,
        isInterState: false,
      },
      paymentMilestones: settings.defaultPaymentMilestones,
      carpetAreaSqFt: 1550,
    };

    const calcResult = calculateQuotation(calcInput);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quotation = new Quotation({
      quotationNumber,
      revisionNumber: 1,
      projectId: project._id,
      clientSnapshot: {
        name: client.name,
        phone: client.phone,
        email: client.email,
        billingAddress: client.billingAddress,
      },
      projectSnapshot: {
        projectName: project.projectName,
        propertyType: project.propertyType,
        siteAddress: project.siteAddress,
        carpetAreaSqFt: project.carpetAreaSqFt,
      },
      status: 'draft',
      rooms,
      designFees: [
        {
          description: 'Architectural & Interior Design Fee (8%)',
          feeType: 'percentage',
          amount: 800,
          calculatedAmount: calcResult.designFees[0]?.calculatedAmount || 0,
          isTaxable: true,
        },
      ],
      additionalCharges: [],
      discountConfig: { type: 'none', value: 0, calculatedAmount: 0 },
      taxConfig: {
        enabled: true,
        type: 'exclusive',
        rate: 18,
        isInterState: false,
      },
      calculationSnapshot: calcResult.calculationSnapshot,
      paymentMilestones: calcResult.paymentMilestones,
      terms: settings.defaultTerms,
      inclusions: settings.defaultInclusions,
      exclusions: settings.defaultExclusions,
      validUntil,
      createdBy: admin._id,
      version: 1,
    });

    await quotation.save();
    console.log(`✅ Created initial sample quotation: ${quotationNumber}`);
  }

  console.log('🎉 Seeding completed successfully!');
  await disconnectDB();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
