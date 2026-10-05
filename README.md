<<<<<<< HEAD
# MEIL Centralized ESG & BRSR Reporting Platform

Enterprise sustainability governance, ESG accounting, SEBI BRSR compliance, and hierarchical consolidation platform for Megha Engineering and Infrastructures Limited (MEIL) and its group subsidiaries.

---

## 1. System Architecture

```
Frontend (HTML5, Vanilla CSS3, Modern JavaScript)
                ↓ HTTPS / JSON
Node.js (v18+) + Express REST API
                ↓
Prisma ORM (v5+)
                ↓
PostgreSQL 18 Database (Single Source of Truth)
```

The system strictly enforces the backend as the **Single Source of Truth** for authentication, authorization, business data, submissions, workflows, SDG contributions, evidence documents, and audit logs. Client-side storage (`localStorage`) is restricted strictly to non-sensitive UI preferences and transient offline caching.

---

## 2. Security & Core Architecture Highlights

### A. Authentication & Password Security
- **Strict Bcrypt Verification:** Password verification always compares against stored bcrypt hashes. All development bypasses (`password === "admin"`) and fake/demo authentication bypasses have been completely eliminated from both frontend and backend.
- **No Offline Fallback Authentication:** If the backend is unavailable, the application displays a clear error (*"Unable to connect to the server. Please try again later."*) and rejects local offline authentication.
- **Fail-Fast JWT Configuration:** The backend validates `JWT_SECRET` on boot and immediately halts startup with a descriptive error if environment secrets are missing. No hardcoded fallback secrets are permitted.

### B. Role-Based Access Control (RBAC) & Route Guards
The system maintains the established corporate role hierarchy:
- **`MAIN_ADMIN` (Group Sustainability Officer / Central Committee):** Group-wide consolidation, statutory submissions review, approvals/rejections, audit log oversight, company profile management.
- **`SUB_ADMIN` / Operational Roles (Subsidiary ESG Officers):** Subsidiary data entry, business unit monitoring, project management, SDG initiative management, and Scan-to-BRSR document ingestion.

Both frontend navigation routes and backend endpoints enforce RBAC permissions. Unauthorized access attempts to restricted endpoints receive an HTTP `403 Forbidden` response.

### C. Subsidiary Multi-Tenant Isolation
- **Server-Derived Scope:** For any `SUB_ADMIN`, `req.user.subsidiaryId` is authoritative. Client-supplied `subsidiaryId` in request bodies or query parameters is never blindly trusted.
- **Strict Cross-Tenant Protection:** Sub Admins cannot read, update, or delete records (projects, business units, SDG contributions, evidence, submissions, or notifications) belonging to other subsidiaries.
- **Field Whitelisting:** Update handlers explicitly whitelist updatable fields, strictly preventing privilege escalation or reassignment of `subsidiaryId`, `role`, or `ownerId`.
- **Project ↔ Business Unit Integrity:** Creating or modifying a project validates that `Project.subsidiaryId === BusinessUnit.subsidiaryId`, preventing cross-subsidiary linking (HTTP `400 Bad Request`).

### D. Scan-to-BRSR Role Architecture (Requirement 21)
- **Removed from Main Admin Module:** Scan-to-BRSR (AI document extraction and fuel slip OCR ingestion) has been completely removed from the Main Admin navigation sidebar, dashboard, and quick actions.
- **Preserved for Operational Roles:** Sub Admins and operational users retain full access to Scan-to-BRSR in their navigation.
- **Backend Role Guard:** Endpoints `/api/snap-to-brsr/upload` and `/api/snap-to-brsr/save` enforce operational role authorization via `requireOperationalRole` middleware, returning `403 Forbidden` if an Admin directly accesses the ingestion endpoints.

### E. Evidence Document Security
- **No Public `/uploads` Static Directory:** The file upload directory is completely private and not exposed via `express.static`.
- **Authenticated Streaming:** Evidence files are downloaded exclusively through `GET /api/evidence/:id/file`, which verifies JWT authentication, checks subsidiary ownership, prevents path traversal, sets `X-Content-Type-Options: nosniff`, and records an audit log.
- **File Upload Hardening:** Strict 10MB file limit, extension and MIME type validation (PDF, JPEG, PNG, WEBP, XLSX, CSV), magic bytes signature validation, and randomized safe server-side filenames (`ev_<hex>_<timestamp>.<ext>`).

### F. Request Validation & Sanitized Error Handling
- **Zod Validation:** All incoming requests (auth, projects, subsidiaries, business units, submissions, SDGs, simulations, reports) are validated with Zod schemas before reaching Prisma.
- **Sanitized Errors:** In production (`NODE_ENV=production`), responses never leak Prisma internal codes, SQL queries, file paths, or stack traces.

---

## 3. Environment Configuration

Create a `.env` file inside the `backend/` directory based on `backend/.env.example`:

```bash
# Server Port
PORT=5000
NODE_ENV=production

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/meil_esg?schema=public"

# JWT Secrets (Must be strong random strings)
JWT_SECRET=replace_with_strong_random_secret_at_least_32_characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=replace_with_strong_random_refresh_secret

# CORS Whitelist (Comma-separated for multiple origins)
FRONTEND_ORIGIN=http://localhost:5000,http://127.0.0.1:5000

# File Upload Directory
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
```

> **Security Notice:** `.env`, `.env.*`, `pgdata_meil/`, `uploads/`, and logs are strictly ignored in `.gitignore`. Never commit secrets or database files to source control.

---

## 4. Database Setup & Migrations

### Prerequisites
- Node.js v18 or later
- PostgreSQL 14+ (local instance or cloud service)

### Initializing the Database
1. Configure `DATABASE_URL` in `backend/.env`.
2. Generate Prisma client:
   ```bash
   cd backend
   npx prisma generate
   ```
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Seed demo corporate accounts and baseline ESG frameworks:
   ```bash
   node prisma/seed.js
   ```

### Seeded Demonstration Accounts
All accounts use bcrypt-hashed passwords. In local development/demo environments, initial accounts can be authenticated with their standard corporate demo credentials:
- **Central Main Admin:** `admin@meil.in`
- **Olectra Greentech (Sub Admin):** `olectra@meil.in`
- **Megha City Gas (Sub Admin):** `citygas@meil.in`
- **Megha Solar & CleanTech (Sub Admin):** `solar@meil.in`
- **Drillmec S.p.A (Sub Admin):** `drillmec@meil.in`
- **Petreven Oilfield (Sub Admin):** `petreven@meil.in`
- **ICOMM Tele (Sub Admin):** `icomm@meil.in`

---

## 5. Development & Execution Commands

### Start Backend API Server
```bash
cd backend
npm start
```
The server will start at `http://localhost:5000` with the health check at `http://localhost:5000/api/health`.

### Run Automated Security & Architecture Tests
```bash
cd backend
node test_all_requirements.js
```
Validates:
- Health check & database connection
- Password verification (bcrypt only, bypasses eliminated)
- JWT expiration & rejection of bad passwords
- Main Admin restriction from Scan-to-BRSR (`403 Forbidden`)
- Sub Admin access to Scan-to-BRSR (`200 OK`)
- Multi-tenant subsidiary isolation (`403 Forbidden` on foreign tenant access)
- Project ↔ Business Unit relationship validation (`400 Bad Request`)
- SDG contribution ownership enforcement (no blind upsert)
- Evidence document protection (private uploads directory, authenticated download stream)
- CORS header policy enforcement
- Notification tenant scoping
- Request validation via Zod schemas

### Accessing the Web Application
Open your browser to:
```
http://localhost:5000/login.html
```
- Sign in as **Main Admin** (`admin@meil.in`) to access group-wide dashboards, consolidation, approval workflows, and audit logs. Notice Scan-to-BRSR is removed from the Admin module.
- Sign in as **Sub-Company Admin** (`olectra@meil.in`) to access subsidiary data entry, project ESG monitoring, SDG contributions, and operational **Scan-to-BRSR** bill/document OCR ingestion.
=======
# esg
>>>>>>> b143e739da7a3cb77441b01edddfe453ee157a9d
