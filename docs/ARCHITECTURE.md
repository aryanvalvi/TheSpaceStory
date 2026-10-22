# The Space Story — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  React SPA (Vite + TypeScript + Tailwind + shadcn)  │    │
│  │  ├─ React Router (client-side routing)              │    │
│  │  ├─ React Hook Form + Zod (form validation)         │    │
│  │  ├─ TanStack Query (server state management)        │    │
│  │  └─ @react-pdf/renderer (PDF preview)               │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │ HTTP (JSON + PDF stream)           │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│  Express API Server     │ (TypeScript + Node.js)             │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │  Middleware Layer                                    │    │
│  │  ├─ Helmet (security headers)                       │    │
│  │  ├─ CORS (origin restriction)                       │    │
│  │  ├─ Rate Limiter (login protection)                 │    │
│  │  ├─ Auth Middleware (JWT httpOnly cookie)            │    │
│  │  ├─ Zod Validation Middleware                       │    │
│  │  └─ Error Handler (centralized)                     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Route Layer                                        │    │
│  │  ├─ /api/auth     (login, logout, me)               │    │
│  │  ├─ /api/clients  (CRUD)                            │    │
│  │  ├─ /api/projects (CRUD)                            │    │
│  │  ├─ /api/catalogue (CRUD)                           │    │
│  │  ├─ /api/quotations (CRUD + workflow + calculate)   │    │
│  │  ├─ /api/settings  (studio settings)                │    │
│  │  └─ /api/health    (health check)                   │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Controller Layer (thin — delegates to services)    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Service Layer                                      │    │
│  │  ├─ AuthService                                     │    │
│  │  ├─ ClientService                                   │    │
│  │  ├─ ProjectService                                  │    │
│  │  ├─ CatalogueService                               │    │
│  │  ├─ QuotationService                               │    │
│  │  ├─ CalculationService (financial engine)           │    │
│  │  ├─ PDFService                                      │    │
│  │  ├─ SettingsService                                 │    │
│  │  └─ CounterService (quotation numbering)            │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Model Layer (Mongoose schemas + indexes)           │    │
│  │  ├─ User                                            │    │
│  │  ├─ Client                                          │    │
│  │  ├─ Project                                         │    │
│  │  ├─ CatalogueItem                                   │    │
│  │  ├─ Quotation (embedded rooms + items)              │    │
│  │  ├─ StudioSettings                                  │    │
│  │  └─ Counter (sequence generation)                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│  MongoDB Atlas          │                                    │
│  └─ the-space-story DB  │                                    │
│     ├─ users             │                                    │
│     ├─ clients           │                                    │
│     ├─ projects          │                                    │
│     ├─ catalogueitems    │                                    │
│     ├─ quotations        │                                    │
│     ├─ studiosettings    │                                    │
│     └─ counters          │                                    │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
TheSpaceStory/
├── client/                          # React frontend
│   ├── src/
│   │   ├── app/                     # App entry, providers, router
│   │   ├── components/              # Shared UI components
│   │   │   └── ui/                  # shadcn/ui components
│   │   ├── features/                # Feature modules
│   │   │   ├── auth/                # Login, auth context
│   │   │   ├── dashboard/           # Dashboard page
│   │   │   ├── clients/             # Client management
│   │   │   ├── projects/            # Project management
│   │   │   ├── catalogue/           # Catalogue CRUD
│   │   │   ├── quotations/          # Quotation editor + list
│   │   │   └── settings/            # Studio settings
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Utilities (api client, cn)
│   │   ├── services/                # API service functions
│   │   ├── types/                   # Shared TypeScript types
│   │   └── utils/                   # Helpers (formatting, etc.)
│   ├── public/
│   │   └── logo/TTS.png             # Studio logo
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
├── server/                          # Express backend
│   ├── src/
│   │   ├── config/                  # DB connection, env validation
│   │   ├── middleware/              # Auth, validation, error handler
│   │   ├── models/                  # Mongoose schemas
│   │   ├── routes/                  # Express routers
│   │   ├── controllers/             # Route handlers (thin)
│   │   ├── services/                # Business logic
│   │   │   └── calculations/        # Financial engine
│   │   ├── validators/              # Zod schemas
│   │   ├── pdf/                     # PDF template + generation
│   │   ├── utils/                   # Helpers
│   │   ├── app.ts                   # Express app setup
│   │   └── server.ts                # Server entry point
│   ├── tests/                       # Backend tests
│   ├── tsconfig.json
│   └── package.json
├── docs/                            # Documentation
│   ├── IMPLEMENTATION_PLAN.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── API.md
│   └── BUSINESS_RULES.md
├── .env.example
├── .gitignore
├── README.md
└── package.json                     # Root workspace config
```

## Key Design Principles

### 1. Layered Architecture
- **Routes** → **Controllers** → **Services** → **Models**
- Controllers are thin — no business logic
- Services contain all business rules and are independently testable
- Financial calculations are isolated in their own module

### 2. Server as Source of Truth
- Frontend may compute provisional previews for responsiveness
- Server always recalculates and validates before persisting
- Client-submitted totals are never trusted

### 3. Snapshot Immutability
- Issued quotations store complete snapshots of all data
- Historical quotations never reference live catalogue prices
- Revisions create new documents; originals are untouched

### 4. Decimal-Safe Currency
- All money stored as integer paise (1 INR = 100 paise)
- Calculations use integer arithmetic internally
- Display layer converts paise → INR with proper formatting
- Single rounding policy: round half-up at the line level

### 5. Authentication & Security
- JWT tokens in httpOnly, secure, sameSite cookies
- bcrypt password hashing (12 rounds)
- Rate limiting on auth endpoints
- Zod validation on all inputs
- Helmet security headers
- CORS restricted to configured origins

### 6. Concurrency Safety
- Quotation numbering via atomic counter increment
- Optimistic concurrency with version field on quotations
- `findOneAndUpdate` with version check prevents silent overwrites

## Technology Versions (Target)

| Technology | Version |
|-----------|---------|
| Node.js | 25.x |
| React | 19.x |
| Vite | 8.x |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| Express | 4.x |
| Mongoose | 8.x |
| Zod | 3.x |
| TanStack Query | 5.x |
| React Router | 7.x |
| @react-pdf/renderer | 4.x |
| Vitest | 3.x |
