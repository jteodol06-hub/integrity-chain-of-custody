# 🛡️ ICCF — Integrity & Chain-of-Custody Focused

### _Preserving Digital Evidence. Protecting Its Integrity. Maintaining the Chain of Custody._

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-26-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Tests](https://img.shields.io/badge/Tests-50%20Passing-brightgreen.svg)](https://vitest.dev/)

---

## 1. Executive Summary & Problem Statement

In modern digital forensics, security operations centers (SOC), incident response (DFIR) engagements, and legal proceedings, **digital evidence is inherently fragile**. Digital artifacts—disk images, memory dumps, network PCAP files, telemetry logs, and forensic extractions—are vulnerable to accidental modification, deliberate tampering, malicious spoofing, and procedural challenges.

Without a verifiable, mathematical guarantee of evidence integrity and a transparent, unbroken chain of custody, evidence presented in incident investigations or courtrooms can easily be compromised, dismissed, or discredited under legal cross-examination (e.g., Federal Rules of Evidence Rule 901 or ISO/IEC 27037).

**Integrity & Chain-of-Custody Focused (ICCF)** is an enterprise-grade digital evidence management platform engineered to resolve these challenges. Built on defensive cybersecurity principles, ICCF anchors every piece of digital evidence to three foundational pillars:

1. **Mathematical Evidence Integrity**: Bit-level verification using streaming cryptographic SHA-256 hashes computed on ingestion and verifiable on demand. Original baselines are permanently immutably preserved.
2. **Cryptographic Chain of Custody (CoC)**: An append-only, hash-linked cryptographic event ledger tracking every transfer, accession, download, and state transition from genesis to case closure.
3. **Rigorous Accountability & Traceability**: Strict Role-Based Access Control (RBAC: `ADMIN`, `INVESTIGATOR`, `VIEWER`), deep magic-byte file signature validation, and immutable audit logs recording every operational request.

> [!NOTE]
> This platform is an advanced defensive cybersecurity demonstration project engineered according to enterprise software architecture standards and OWASP Top 10 defensibility guidelines.

---

## 2. Core Capabilities & Forensic Workflow

```mermaid
flowchart LR
    A["Evidence Ingestion\n(Deep Byte Inspection)"] --> B["SHA-256 Streaming Engine\n(Baseline Digest)"]
    B --> C["Private Vault Storage\n(Isolated UUID Filename)"]
    C --> D["Genesis Custody Block\n(Hash-Linked Ledger)"]
    D --> E["Active Investigation\n(Transfers, Downloads)"]
    E --> F["Live Re-Verification\n(Bit-Identical Check)"]
    F --> G["Audit & Chain Validation\n(Tamper Detection)"]
```

- **Forensic File Ingestion**: Enforces strict MIME-type checks and deep binary magic-byte inspection (e.g., rejecting PE `MZ` or Linux `ELF` executables disguised as logs) with a 50MB per-file upload ceiling.
- **Isolated Private Vault**: Uploaded evidence files are never stored with original client names or within the static webroot. Instead, files are held in an isolated server directory under random UUIDs, accessible solely via authenticated, role-authorized streaming endpoints.
- **Dual-Hash Integrity Dashboard**: UI visually contrasts baseline SHA-256 digests against real-time re-computed physical hashes, complete with one-click live verification and tamper detection.
- **Append-Only Custody Ledger**: Every transfer, supervisor accession, and analyst download records an immutable event block. Each block binds its payload to the previous block's SHA-256 hash.
- **Recursive Chain Verification**: Evaluates the mathematical validity of the custody ledger in $O(N)$ time, immediately isolating broken pointers or manipulated historical entries.
- **Comprehensive Audit Trail**: Security-relevant actions log IP address, user-agent, actor ID, action category, and execution outcome to an immutable audit table.

---

## 3. Technology Stack

| Layer                       | Technologies & Rationale                                                                                                                                        |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**                | **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **React Router v7**, **TanStack Query**, **React Hook Form**, **Zod**, **Lucide React**, **Recharts** |
| **Backend REST API**        | **Node.js (v20+ / v26)**, **Express.js**, **TypeScript**, **Zod Request Validation**, **Helmet**, **CORS**, **Multer**                                          |
| **Database & ORM**          | **PostgreSQL 16/18**, **Prisma ORM** (strict foreign key constraints, `onDelete: Restrict` on critical evidence)                                                |
| **Security & Cryptography** | **Node.js `crypto`** (SHA-256 streaming), **bcrypt** (salt rounds = 10), **JWT** with RFC 7519 `jti` standard claims, **RBAC** middleware                       |
| **Testing & Quality**       | **Vitest 3.2**, **Supertest**, **React Testing Library**, **ESLint 9**, **Prettier**                                                                            |
| **Infrastructure**          | **Docker Compose** (PostgreSQL container), isolated filesystem vault                                                                                            |

---

## 4. System Architecture

ICCF is structured as a clean, modular TypeScript monorepo maintaining a strict separation of concerns between client presentation, backend business logic, and relational database persistence:

```
integrity-chain-of-custody/
│
├── client/                     # Frontend Single Page Application (SPA)
│   ├── src/
│   │   ├── components/         # Reusable UI primitives (Buttons, Modals, Badges, Tables)
│   │   ├── layouts/            # Dashboard layout, Sidebar, Top Navigation, Auth layout
│   │   ├── pages/              # Routed pages (Dashboard, Cases, Evidence, Custody, Audit, Settings)
│   │   ├── hooks/              # Custom React hooks (useAuth, safeStorage wrapper)
│   │   ├── services/           # Axios HTTP client, interceptors, and typed API endpoints
│   │   ├── types/              # Domain models (User, Case, Evidence, CustodyEvent, AuditLog)
│   │   └── utils/              # Client utility functions (date formatting, hash truncation)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js      # Dark enterprise cybersecurity palette (#080D18)
│   └── package.json
│
├── server/                     # Backend REST API Service
│   ├── src/
│   │   ├── config/             # Environment schemas, Prisma database client, Rate limiting
│   │   ├── middleware/         # Auth, RBAC, Rate-limit, Helmet, Error handlers
│   │   ├── modules/            # Domain-driven architecture:
│   │   │   ├── auth/           # User authentication, token issuance, session tracking
│   │   │   ├── cases/          # Case lifecycle management & investigator assignments
│   │   │   ├── evidence/       # Evidence upload, private vault storage, file validation
│   │   │   ├── custody/        # Immutable hash-linked custody ledger & verification
│   │   │   ├── verification/   # Cryptographic SHA-256 verification engine
│   │   │   ├── audit/          # Comprehensive security audit trail
│   │   │   └── dashboard/      # Forensic KPI metrics & activity aggregation
│   │   ├── routes/             # REST route registration (/api)
│   │   ├── utils/              # Crypto hashing, reference generators, byte signature checker
│   │   ├── app.ts              # Express application setup and global middleware pipeline
│   │   └── index.ts            # HTTP server entrypoint
│   ├── tsconfig.json
│   └── package.json
│
├── prisma/                     # Database Engine Configuration
│   ├── schema.prisma           # Prisma data models, indexes, and referential constraints
│   ├── migrations/             # Applied database migration files
│   └── seed.ts                 # Synthetic demo data for controlled development
│
├── docs/                       # Comprehensive Technical & Forensic Documentation
│   ├── architecture.md         # Monorepo architecture, request lifecycles, and diagrams
│   ├── security.md             # Threat modeling, RBAC matrix, and defense-in-depth
│   ├── evidence-integrity.md   # Mathematical hashing, streaming, and verification
│   └── chain-of-custody.md     # Hash-linked ledger, genesis block, and validation algorithm
│
├── storage/evidence/           # Isolated private storage directory (never public)
├── docker-compose.yml          # Containerized local PostgreSQL database
├── .env.example                # Example environment variables
├── eslint.config.js            # Monorepo ESLint 9 configuration
├── .prettierrc                 # Code formatting configuration
└── README.md                   # Project documentation & setup instructions
```

---

## 5. Database Relational Model

The database schema enforces forensic integrity. Foreign keys use `onDelete: Restrict` on evidence and custody records to prevent cascading deletions from ever compromising the chain of custody.

```mermaid
erDiagram
    USER ||--o{ CASE : "creates"
    USER ||--o{ CASE_ASSIGNMENT : "assigned to"
    USER ||--o{ EVIDENCE : "registers"
    USER ||--o{ CUSTODY_EVENT : "acts in"
    USER ||--o{ INTEGRITY_VERIFICATION : "verifies"
    USER ||--o{ AUDIT_LOG : "triggers"
    USER ||--o{ SESSION : "owns"

    CASE ||--o{ CASE_ASSIGNMENT : "has"
    CASE ||--o{ EVIDENCE : "contains"

    EVIDENCE ||--o{ CUSTODY_EVENT : "has chronological chain"
    EVIDENCE ||--o{ INTEGRITY_VERIFICATION : "has verification records"
```

---

## 6. REST API Reference

All protected endpoints require an `Authorization: Bearer <JWT>` header.

| Method    | Endpoint                           | Allowed Roles        | Description                                                                   |
| :-------- | :--------------------------------- | :------------------- | :---------------------------------------------------------------------------- |
| **POST**  | `/api/auth/register`               | Public               | Register a new user account (defaults to `VIEWER` or requested role)          |
| **POST**  | `/api/auth/login`                  | Public               | Authenticate user, verify bcrypt password, issue signed JWT                   |
| **POST**  | `/api/auth/logout`                 | Authenticated        | Revoke active session token                                                   |
| **GET**   | `/api/auth/me`                     | Authenticated        | Fetch authenticated user profile and permissions                              |
| **GET**   | `/api/cases`                       | All Roles            | List accessible cases (Admins: all; Investigators: assigned only)             |
| **POST**  | `/api/cases`                       | ADMIN, INVESTIGATOR  | Initialize a new forensic investigation case (`ICCF-YYYY-NNNN`)               |
| **GET**   | `/api/cases/:id`                   | All Roles            | Fetch case metadata, assigned investigators, and evidence list                |
| **PATCH** | `/api/cases/:id`                   | ADMIN, INVESTIGATOR  | Update case title, description, category, or status                           |
| **POST**  | `/api/cases/:id/assign`            | ADMIN, INVESTIGATOR  | Assign an investigator to a case                                              |
| **GET**   | `/api/cases/:id/evidence`          | All Roles            | List all evidence artifacts registered within a case                          |
| **POST**  | `/api/cases/:id/evidence`          | ADMIN, INVESTIGATOR  | Upload and register digital evidence file (multipart form)                    |
| **GET**   | `/api/evidence/:id`                | All Roles            | Fetch detailed evidence record, dual-hash preview, and custody events         |
| **GET**   | `/api/evidence/:id/download`       | All Roles (Assigned) | Download physical evidence file (logs an `EVIDENCE_DOWNLOADED` custody event) |
| **POST**  | `/api/evidence/:id/verify`         | ADMIN, INVESTIGATOR  | Trigger on-demand physical SHA-256 file verification against baseline         |
| **GET**   | `/api/evidence/:id/verifications`  | All Roles            | Fetch historical integrity verification records                               |
| **GET**   | `/api/evidence/:id/custody`        | All Roles            | Retrieve chronological custody event timeline                                 |
| **POST**  | `/api/evidence/:id/transfer`       | ADMIN, INVESTIGATOR  | Execute custody transfer with cryptographically linked event block            |
| **POST**  | `/api/evidence/:id/custody/verify` | All Roles            | Run recursive cryptographic chain validation on custody ledger                |
| **GET**   | `/api/audit`                       | ADMIN, INVESTIGATOR  | Query system audit logs with filters (action, outcome, date range)            |
| **GET**   | `/api/dashboard/stats`             | All Roles            | Fetch forensic metrics (total cases, verified evidence, recent activity)      |
| **GET**   | `/health`                          | Public               | Healthcheck endpoint reporting database connectivity and uptime               |

---

## 7. Installation & Local Development Setup

### Prerequisites

- **Node.js** v20.x or higher (Node v26 supported)
- **npm** v10+
- **PostgreSQL** (Docker container or local installation)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/integrity-chain-of-custody.git
cd integrity-chain-of-custody
npm install
```

### 2. Configure Environment Variables

Create `.env` in the project root:

```bash
cp .env.example .env
```

Ensure the configuration matches your environment:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/iccf_db?schema=public"
JWT_SECRET="iccf_development_secure_jwt_secret_key_minimum_32_chars"
JWT_EXPIRES_IN="8h"
EVIDENCE_STORAGE_PATH="./storage/evidence"
MAX_FILE_SIZE_BYTES=52428800
```

### 3. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
docker compose up -d
```

#### Option B: Using Local PostgreSQL (Without Docker)

If using an existing local PostgreSQL installation (e.g., listening on port 5433 or 5432):

```bash
# Update DATABASE_URL in .env to point to your local port and credentials, e.g.:
# DATABASE_URL="postgresql://postgres@127.0.0.1:5433/iccf_db?schema=public"
```

### 4. Database Migration & Synthetic Seed

Apply migrations and populate synthetic demo accounts:

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

### 5. Running the Application

Run both the Express backend and Vite frontend concurrently:

```bash
npm run dev
```

Alternatively, run individual workspaces in separate terminals:

```bash
# Terminal 1 — Backend API (http://localhost:5000)
npm run dev:server

# Terminal 2 — Frontend Client (http://localhost:5173)
npm run dev:client
```

---

## 8. Synthetic Development Credentials

The seed script creates the following demo accounts for controlled local evaluation:

| Role             | Email                     | Password             | Badge Number | Department                   |
| :--------------- | :------------------------ | :------------------- | :----------- | :--------------------------- |
| **ADMIN**        | `admin@iccf.local`        | `ForensicAdmin2026!` | ICCF-001     | Cyber Forensics Unit         |
| **INVESTIGATOR** | `investigator@iccf.local` | `ForensicAdmin2026!` | ICCF-104     | Digital Incident Response    |
| **VIEWER**       | `viewer@iccf.local`       | `ForensicAdmin2026!` | ICCF-902     | Compliance & Legal Oversight |

> [!WARNING]
> Synthetic credentials and default development JWT secrets must never be used in production environments.

---

## 9. Quality Assurance & Testing Suite

ICCF includes an automated test suite spanning unit tests, integration tests, and security boundary assertions.

### Run All Test Suites

```bash
# Execute 44 backend integration tests
npm test --workspace=server

# Execute frontend React component tests
npm test --workspace=client
```

### Code Quality & Static Analysis

```bash
# Check TypeScript compilation across both workspaces
npm run build

# Run ESLint 9 static analysis
npm run lint

# Verify Prettier code style formatting
npm run format:check
```

---

## 10. Project Status & Roadmap

- [x] **STAGE 1 — Project Foundation**: Monorepo architecture, Vite + React + Tailwind frontend, Node + Express backend, Prisma schema, Docker Compose, ESLint 9, Prettier, and Vitest test suite.
- [x] **STAGE 2 — Database and Authentication**: Migrations, session management, bcrypt authentication, RBAC, protected route wrappers.
- [x] **STAGE 3 — Case and Evidence Management**: Case CRUD, investigator assignment, multipart file upload, private storage, deep magic-byte inspection.
- [x] **STAGE 4 — Integrity and Chain of Custody**: Cryptographic verification service, canonical event hashing, recursive chain validation.
- [x] **STAGE 5 — Dashboard and Frontend Integration**: Cyber dark UI, interactive evidence timeline, Recharts visual analytics, dual-hash viewer.
- [x] **STAGE 6 — Quality Assurance and Documentation**: 50 automated tests, deep file content security validation, exhaustive forensic documentation.

### Future Roadmap

- [ ] Hardware Security Module (HSM) / PKCS#11 hardware signing integration.
- [ ] RFC 3161 compliant external Time-Stamp Authority (TSA) attestation.
- [ ] Write-Once-Read-Many (WORM) cloud object storage backend (e.g., AWS S3 Object Lock in Compliance Mode).
- [ ] Automated export of court-ready forensic Chain of Custody PDF packages with digital signatures.

---

## 11. Disclaimers & Legal Notice

> [!IMPORTANT]
> **Educational & Portfolio Demonstration**: ICCF is developed as a defensive cybersecurity, digital forensics, and full-stack software engineering demonstration.
>
> **Legal Admissibility**: While this system models forensic integrity principles (SHA-256 cryptographic digests, immutable append-only chains of custody, and auditable access records), judicial admissibility in a court of law is governed by jurisdiction-specific procedural rules (such as Federal Rules of Evidence Rule 901, UK PACE Act 1984, or ISO/IEC 27037:2012). Software alone cannot establish legal admissibility without established Standard Operating Procedures (SOPs), qualified forensic practitioner handling, verified hardware write-blockers during physical acquisition, and independent physical evidence security.
