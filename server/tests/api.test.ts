import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('The Space Story API Endpoints', () => {
  let authCookie: string;

  beforeAll(async () => {
    await connectDB();
    const { User } = await import('../src/models/User.js');
    const { CatalogueItem } = await import('../src/models/CatalogueItem.js');
    let user = await User.findOne({ email: 'owner@thespacestory.in' });
    if (!user) {
      user = new User({
        name: 'The Space Story Admin',
        email: 'owner@thespacestory.in',
        passwordHash: 'Admin@12345',
        role: 'owner',
        active: true,
      });
      await user.save();
    }

    const catItem = await CatalogueItem.findOne();
    if (!catItem) {
      await CatalogueItem.create({
        name: 'Test Wardrobe',
        category: 'carpentry',
        defaultUnit: 'sqft',
        defaultRate: 150000,
        defaultQuantityFormula: 'manual',
        active: true,
      });
    }
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('GET /api/health returns 200 and ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('POST /api/auth/login logs in with seeded admin credentials and sets cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner@thespacestory.in',
        password: 'Admin@12345',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('owner@thespacestory.in');
    expect(res.body.data.user.role).toBe('owner');

    // Extract auth cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = (cookies as string[]).find((c) => c.startsWith('token=')) || '';
    expect(authCookie).toBeTruthy();
  });

  it('GET /api/auth/me returns current user info when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('owner@thespacestory.in');
  });

  it('GET /api/catalogue returns list of catalogue items', async () => {
    const res = await request(app)
      .get('/api/catalogue')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/quotations returns list of quotations', async () => {
    const res = await request(app)
      .get('/api/quotations')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/quotations/calculate returns computed summary without saving', async () => {
    const res = await request(app)
      .post('/api/quotations/calculate')
      .set('Cookie', authCookie)
      .send({
        rooms: [
          {
            roomId: 'preview-r1',
            name: 'Study Room',
            items: [
              {
                itemId: 'preview-i1',
                name: 'Custom Study Table',
                unit: 'sqft',
                quantity: 40,
                rate: 200000,
                calculationMethod: 'manual',
                isOptional: false,
                isIncluded: true,
              },
            ],
          },
        ],
        taxConfig: { enabled: true, type: 'exclusive', rate: 18, isInterState: false },
        paymentMilestones: [{ description: 'Full', percentage: 100 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.calculationSnapshot.roomsSubtotal).toBe(8000000);
    expect(res.body.data.calculationSnapshot.grandTotal).toBe(9440000); // 8,000,000 + 18% GST (1,440,000)
  });

  it('POST /api/quotations/calculate accepts string and empty-string dimensions and calculates per_sqft design fees', async () => {
    const res = await request(app)
      .post('/api/quotations/calculate')
      .set('Cookie', authCookie)
      .send({
        rooms: [
          {
            roomId: 'preview-r2',
            name: 'Civil Work',
            items: [
              {
                itemId: 'preview-i2',
                name: 'Kitchen Wall Tiles',
                unit: 'sqft',
                quantity: '208',
                rate: '50000',
                dimensions: {
                  length: '16',
                  width: '13',
                  height: '',
                  count: '',
                  perUnit: '',
                },
                calculationMethod: 'length_x_width',
                isOptional: false,
                isIncluded: true,
              },
            ],
          },
        ],
        designFees: [
          {
            description: 'Design & Architecture Fee (Per Sq. Ft.)',
            feeType: 'per_sqft',
            sqft: '1200',
            ratePerSqft: '12000', // ₹120 in paise = 12000
            amount: '14400000', // ₹1,44,000 in paise
            isTaxable: true,
          },
        ],
        taxConfig: { enabled: true, type: 'exclusive', rate: 18, isInterState: false },
        paymentMilestones: [{ description: 'Full', percentage: 100 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Design fee: 1200 * 12000 = 14,400,000 paise (₹1,44,000.00)
    expect(res.body.data.calculationSnapshot.designFeesTotal).toBe(14400000);
  });
});
