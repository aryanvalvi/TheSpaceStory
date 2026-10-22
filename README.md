# The Space Story — Interior Design Quotation System

A full-stack web application built for interior design studio **The Space Story**. Replaces manual paper and Excel spreadsheets with a financial calculation engine, room-wise itemized quotations, catalogue management, GST compliance, versioned revisions, and instant client-ready PDF generation.

---

## 🏛️ System Architecture

- **Client (`client/`):** React 19, Vite 8, Lucide Icons, Vanilla CSS Luxury Design System.
- **Server (`server/`):** Node.js, Express, TypeScript, Mongoose ODM, Zod validation, JWT in httpOnly cookies.
- **Database:** MongoDB Atlas (`cluster0.zlzgpvy.mongodb.net`).
- **Precision:** Paise-precision integer arithmetic (1 INR = 100 paise) eliminating floating-point errors.
- **PDF Generation:** High-resolution server-rendered and printable quotation templates with A4 print layout, page-break management, and studio branding.

---

## 🔑 Demo Admin Credentials

- **Email:** `owner@thespacestory.in`
- **Password:** `Admin@12345`
*(The login page also includes a 1-click "Fill Demo Admin Credentials" button).*

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
# In the root repository
npm install
```

### 2. Configure Environment
The `server/.env` is already pre-configured with MongoDB Atlas connection string and JWT secret:
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://aryanvalvi323_db_user:6ZgXXJtHH5Ujprj7@cluster0.zlzgpvy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=super_secret_jwt_key_the_space_story_2026_studio_key_production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

### 3. Seed Initial Studio Data
Populates the admin user, studio branding, initial materials catalogue, demo client, and sample quotation:
```bash
npm run seed
```

### 4. Run Development Servers
Starts both Express backend (`http://localhost:3001`) and Vite frontend (`http://localhost:5173`):
```bash
npm run dev
```

---

## 🧪 Testing & Verification

Run the full automated test suite (Vitest + Supertest):
```bash
npm test
```

### Test Coverage Highlights
- `tests/calculations.test.ts`:
  - Paise integer conversions & rounding policy
  - All quantity formulas (`manual`, `length_x_width`, `length_x_height`, `length_x_width_x_height`, `count_x_per_unit`)
  - Optional item inclusions/exclusions
  - Design fees (percentage, fixed, per sqft)
  - Tax calculation: intra-state (CGST 9% + SGST 9%) and inter-state (IGST 18%)
  - Payment milestones exact rounding & distribution
- `tests/api.test.ts`:
  - `GET /api/health` health status
  - `POST /api/auth/login` JWT cookie creation
  - `GET /api/auth/me` protected session validation
  - `GET /api/catalogue` catalogue search
  - `GET /api/quotations` quotation list
  - `POST /api/quotations/calculate` server calculation preview without saving

Type checking:
```bash
npm run typecheck
```

Production build:
```bash
npm run build
```

---

## 💡 Key Features & Business Rules

1. **Paise-Level Financial Precision:** All monetary amounts are stored as integers in paise, rounded half-up at the line-item level.
2. **Measurement Formulas:** Supports five measurement formulas that dynamically calculate area/volume/count from entered dimensions.
3. **Quotation Numbering:** Atomic sequencing `TSS-YYYY-NNNN` via MongoDB `findOneAndUpdate` with `$inc`.
4. **Lifecycle & Immutability:** Draft quotations are editable. Once **issued**, quotations are frozen as historical snapshots; modifications require a new tracked revision (`R2`, `R3`).
5. **Printable / PDF Generation:** Access `GET /api/quotations/:id/pdf` or use the "PDF" button in the UI for an instant, styled printable quotation with client signature block.
