# VaultPay Financial Core

Enterprise-grade financial transaction and invoice management platform, built for **Nexus Corporate Services**. Admins issue invoices to clients; clients log in, view only their own invoices, pay by card through Stripe, and automatically receive a PDF receipt by email.

Built as a zero-trust system: every sensitive decision (who a resource belongs to, what a payment's real amount is, whether an invoice is actually paid) is re-derived and enforced **server-side**, never taken on the frontend's word.

---

## 1. Features

- Email/password authentication with short-lived JWT access tokens + rotating, httpOnly refresh tokens
- Two enforced roles — **ADMIN** and **CLIENT** — checked on every protected route, independent of anything the client claims
- IDOR-safe data access: every invoice/payment/receipt/client lookup is scoped to `{_id, ownerId}`, never a bare `findById`
- Admin: create clients, create invoices (server computes the total from line items), dashboard with revenue/status breakdown, payment history, audit log
- Client: dashboard of outstanding/paid invoices, Stripe Checkout payment, receipt download via short-lived signed URL
- Stripe Checkout + webhook integration — **only a verified webhook event can mark an invoice PAID**, never a frontend redirect
- Idempotent webhook processing (Stripe's at-least-once delivery is handled safely)
- MongoDB transactions for the payment→invoice state transition
- Automated, branded PDF receipts (PDFKit) uploaded to private storage (S3 or local fallback) and emailed (Nodemailer)
- Centralized error handling, rate limiting, Helmet security headers, Mongo operator-injection sanitization
- Audit log covering logins, invoice/payment lifecycle events, and admin actions

## 2. Tech stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 18, TypeScript, Vite, React Router, Axios, Tailwind CSS |
| Backend    | Node.js, Express, TypeScript, Mongoose |
| Auth       | JWT (access + refresh), bcrypt |
| Validation | Zod |
| Payments   | Stripe (Checkout Sessions + Webhooks) |
| Storage    | AWS S3 (falls back to local disk for development) |
| Email      | Nodemailer |
| PDF        | PDFKit |
| Deployment | Vercel (frontend) · Render (backend) · MongoDB Atlas |

## 3. Architecture

See [`docs/architecture.md`](docs/architecture.md) for diagrams of the request flow and the routes → middleware → controllers → services → database layering.

## 4. Authentication flow

1. `POST /api/auth/login` — verifies bcrypt password hash, issues a short-lived **access token** (returned in the JSON body, kept in memory on the frontend — never localStorage) and a **refresh token** (set as an `httpOnly`, `Secure`, `SameSite=Strict` cookie scoped to `/api/auth`).
2. The frontend attaches the access token as `Authorization: Bearer <token>` on every request.
3. On a `401`, the frontend calls `POST /api/auth/refresh`, which validates the refresh token, checks it against the hash stored server-side, **rotates** it (issues a new one, invalidates the old), and returns a fresh access token.
4. Refresh-token reuse (an old, already-rotated token presented again) is treated as a stolen-token signal and immediately revokes the session.
5. Five consecutive failed logins lock the account for 15 minutes.

**Token lifetime reasoning:** access tokens are short-lived (default 15m) so a leaked token has a small blast radius; refresh tokens are longer-lived (default 7d) but rotate on every use and are stored server-side only as a hash, so a database leak alone can't be replayed as a live session.

## 5. RBAC model

Two roles, enforced by `authenticate` (verifies the JWT and re-reads the user's **current** role/status from the database) followed by `authorize(...)` (checks the role against an explicit allow-list per route). Role and resource ownership are checked separately — see `docs/architecture.md`.

| Capability | ADMIN | CLIENT |
|---|:---:|:---:|
| Create clients | ✅ | ❌ |
| Create invoices | ✅ | ❌ |
| View all invoices | ✅ | ❌ (own only) |
| View own invoices | — | ✅ |
| Pay an invoice | ❌ | ✅ (own only) |
| View payment history | ✅ (all) | — (own via invoice) |
| View admin analytics / audit log | ✅ | ❌ |

## 6. IDOR prevention strategy

Every resource that belongs to a client is fetched with an **ownership-aware query**, not a bare ID lookup:

```ts
// ❌ never done for client-accessible resources:
Invoice.findById(req.params.id)

// ✅ always done instead:
Invoice.findOne({ _id: req.params.id, clientId: theAuthenticatedClientsId })
```

If the invoice exists but belongs to someone else, this returns `null`, and the API responds `404 Not Found` — the same response as if the resource didn't exist at all, so the API never confirms or denies that another client's invoice ID is valid. Admin routes layer on an explicit, separate `authorize('ADMIN')` check rather than relying on the absence of an ownership filter to imply admin access.

This pattern is applied consistently to invoices, payments, and receipts (`invoiceService`, `paymentService`, `receiptService`).

## 7. Stripe payment flow

```
Client → GET own invoice → click Pay
       → POST /api/payments/checkout { invoiceId }
Server → verify JWT + CLIENT role
       → fetch invoice by {_id, clientId: mine}        (ownership)
       → verify invoice.status is PENDING/OVERDUE       (payable state)
       → read invoice.amount from MongoDB                (never from the request body)
       → stripe.checkout.sessions.create({ amount: invoice.amount, ... })
       → redirect client to Stripe-hosted Checkout
Stripe → client pays → Stripe fires a webhook (not a frontend redirect)
Server → verifies webhook signature → finalizes payment (see §8)
```

The frontend's `success_url` after Checkout is a **UX convenience only** — it shows a "confirming your payment" message and does not itself mark anything paid. The invoice only flips to `PAID` once the webhook has been processed.

## 8. Webhook security

- Mounted at `POST /api/webhooks/stripe`, parsed with `express.raw({ type: 'application/json' })` — **mounted before** the app's global `express.json()` middleware, so the exact bytes Stripe signed reach `stripe.webhooks.constructEvent()` untouched. (Running the JSON parser first is a classic integration mistake that silently breaks signature verification — see `app.ts` and `webhookController.ts` for the comment explaining the ordering.)
- Signature verified with `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` before any event data is trusted.
- **Idempotency:** every event's `event.id` is inserted into a uniquely-indexed `ProcessedWebhookEvent` collection before processing; a duplicate delivery hits the unique-index conflict and is dropped as a no-op.
- **Atomicity:** the Payment→`SUCCEEDED` and Invoice→`PAID` writes happen inside a single MongoDB transaction (`webhookService.finalizePayment`), so they can never partially apply.
- Receipt generation and email sending happen *after* the transaction commits (they involve external I/O and shouldn't hold a DB transaction open or roll back financial state if SMTP is briefly down); failures there are logged but don't affect the already-committed payment state.

## 9. PDF generation

`pdfService.generateReceiptPdf` renders a branded PDF (PDFKit) with Nexus/VaultPay branding, invoice + payment details, line items, and a "PAID" stamp. Only ever called from the webhook-triggered `receiptService.generateAndDeliverReceipt`, after a payment has been verified and finalized — never from a client-facing endpoint.

## 10. Storage & document access

Receipts are uploaded to a **private** S3 bucket (`ACL: private`, server-side encryption) if AWS credentials are configured, or to local disk in development if not. The `Receipt` document stores only an internal storage key — **never a public URL**. Downloads always go through `getSignedDownloadUrl()`, which issues a short-lived (5 minute) signed URL — a native S3 pre-signed URL in production, or an HMAC-signed local token in the development fallback — generated fresh for the requesting, authenticated, owning user.

## 11. Email system

Nodemailer with a shared branded HTML template (`emailService.ts`) sends three emails: invoice-created, payment-confirmed, and receipt-delivered (with the PDF attached). Email failures are logged and swallowed — they never fail the business operation that triggered them.

## 12. Database schema

See the models in `server/src/models/`: `User`, `Client`, `Invoice`, `Payment`, `Receipt`, `AuditLog`, `ProcessedWebhookEvent`. Key points:

- `User.passwordHash` and `refreshTokenHash` use `select: false` — never returned unless explicitly requested by the auth service, and stripped again in `toJSON` as defense in depth.
- `Invoice.amount` is recomputed from `items` in a `pre('validate')` hook, so it can't silently drift from the line items even via a direct DB write.
- Indexes on `email`, `invoiceNumber`, `clientId`, invoice `status`, and Stripe IDs support the common query patterns.
- Invoice numbers (`VP-2026-000001`) are generated via an atomic `findOneAndUpdate($inc)` counter, safe under concurrent invoice creation.

## 13. Environment variables

See [`.env.example`](.env.example) at the repo root. Copy it to `server/.env` and fill in real values. **Never commit a real `.env` file.**

## 14. Local setup

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Configure environment
cp ../.env.example server/.env
cp .env.example client/.env      # from client/, if VITE_API_URL needs to change
# edit server/.env with your MongoDB URI, JWT secrets, Stripe test keys, SMTP creds

# 3. (Optional) create an initial admin user
cd ../server && npm run seed

# 4. Run both apps
cd server && npm run dev          # http://localhost:5000
cd ../client && npm run dev       # http://localhost:5173

# 5. Forward Stripe webhooks to your local server during development
stripe listen --forward-to localhost:5000/api/webhooks/stripe
# copy the printed whsec_... into server/.env as STRIPE_WEBHOOK_SECRET
```

## 15. API documentation (summary)

All responses use the shape `{ success: boolean, message: string, data?: ... }`.

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Log in, returns access token + sets refresh cookie |
| POST | `/api/auth/register` | Public | Self-service client signup |
| POST | `/api/auth/refresh` | Public (cookie) | Rotate tokens |
| POST | `/api/auth/logout` | Authenticated | Invalidate refresh token |
| GET | `/api/auth/me` | Authenticated | Current user |
| POST | `/api/clients` | ADMIN | Create a client |
| GET | `/api/clients` | ADMIN | List clients |
| GET | `/api/clients/me` | CLIENT | Own client profile |
| PATCH | `/api/clients/:id/status` | ADMIN | Activate/deactivate a client |
| POST | `/api/invoices` | ADMIN | Create an invoice |
| GET | `/api/invoices` | ADMIN | List/search/filter all invoices |
| GET | `/api/invoices/:id` | ADMIN | Get any invoice |
| GET | `/api/invoices/me` | CLIENT | List own invoices |
| GET | `/api/invoices/me/:id` | CLIENT | Get own invoice (IDOR-safe) |
| POST | `/api/payments/checkout` | CLIENT | Start Stripe Checkout for own invoice |
| GET | `/api/payments` | ADMIN | Payment history |
| POST | `/api/webhooks/stripe` | Stripe only (signature) | Finalize payments |
| GET | `/api/receipts/invoice/:invoiceId` | CLIENT | List receipts for own invoice |
| GET | `/api/receipts/me/:id/download-url` | CLIENT | Signed receipt download URL |
| GET | `/api/admin/overview` | ADMIN | Dashboard analytics |
| GET | `/api/admin/audit-logs` | ADMIN | Audit trail |

## 16. Deployment instructions

- **Frontend → Vercel**: set the project root to `client/`, build command `npm run build`, output `dist/`. Set `VITE_API_URL` to your deployed backend's `/api` URL.
- **Backend → Render** (or any Node host): set the root to `server/`, build command `npm run build`, start command `npm start`. Set all variables from `.env.example` in the host's environment variable settings — never in code.
- **Database → MongoDB Atlas**: create a cluster, restrict network access, use a dedicated database user with least-privilege permissions.
- **Stripe**: switch from test to live keys only once ready; register your production webhook endpoint in the Stripe dashboard and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
- Ensure HTTPS is enforced end-to-end, `CORS` origin is restricted to your real frontend domain (no wildcards), and `NODE_ENV=production` so verbose error details are suppressed.

**Full step-by-step walkthrough** (GitHub push → MongoDB Atlas → Render → Vercel → Stripe webhook → smoke test → troubleshooting) is in [`docs/deployment.md`](docs/deployment.md).

## 17. Security considerations

Summarized here; see inline comments throughout `server/src/` for the reasoning at each decision point:

- Zero-trust: every protected route re-verifies the JWT and re-reads the user's current role/status from the database — a suspended user or an old token can't slip through.
- IDOR prevention via ownership-aware queries everywhere a client touches their own data (§6).
- Payment amounts are always re-derived server-side from the invoice record, never accepted from the client (§7).
- Only a verified Stripe webhook can transition an invoice to `PAID` (§7–8).
- Passwords hashed with bcrypt (cost factor 12), never logged, never returned in any API response.
- Refresh tokens stored server-side only as a SHA-256 hash and rotated on every use; reuse of an old token revokes the session.
- Strict Zod validation (`.strict()`) on every input surface rejects unexpected/extra fields before they reach a query or a Stripe call.
- `express-mongo-sanitize` strips Mongo operator keys (`$where`, `$ne`, etc.) from all request input as defense in depth.
- Helmet security headers, CORS restricted to known origins, request body size limits, rate limiting (tighter on `/auth` and `/payments/checkout`).
- Centralized error handler: no stack traces or internal details in production responses.
- Receipts are never publicly accessible — only via short-lived, per-user signed URLs.
- Full audit trail for logins, invoice/payment lifecycle events, and admin actions.

## 18. Testing instructions

See §21 of the original technical brief for the full test matrix. Suggested manual verification checklist:

**Auth**
- [ ] Login with wrong password → `401`, generic message (doesn't reveal whether the email exists)
- [ ] 5 failed logins → account locks for 15 minutes
- [ ] Expired/missing/malformed JWT on a protected route → `401`

**Authorization / IDOR**
- [ ] Log in as Client A, note an invoice ID belonging to Client B (e.g. from an admin view) → `GET /api/invoices/me/:thatId` → `404`, not the data
- [ ] Client token against an admin-only route (e.g. `POST /api/invoices`) → `403`
- [ ] Client attempts `POST /api/payments/checkout` for another client's invoice ID → `404`

**Payments**
- [ ] Full flow: admin creates invoice → client pays with Stripe test card `4242 4242 4242 4242` → webhook fires → invoice flips to `PAID` → receipt email arrives
- [ ] Re-send the same webhook event (e.g. via the Stripe CLI's `stripe events resend`) → no duplicate payment/receipt/email
- [ ] Attempt to pay an already-`PAID` invoice → `409 Conflict`
- [ ] Webhook with an invalid/missing signature → `400`, no state change

**Validation**
- [ ] Extra/unexpected fields in a request body → rejected by the `.strict()` Zod schema
- [ ] Invalid ObjectId in a URL param → `400`, not a Mongoose cast error leaking a stack trace

## 19. Project structure

```
vaultpay-financial-core/
├── client/            React + TypeScript + Vite frontend
│   └── src/
│       ├── components/   AppShell, ProtectedRoute, StatusBadge, ...
│       ├── context/      AuthContext (in-memory access token, silent refresh)
│       ├── pages/
│       │   ├── admin/    Overview, Invoices, Invoice create/detail, Clients, Payments
│       │   └── client/   Dashboard, Invoice detail (pay + receipts)
│       ├── services/     api.ts (axios + refresh interceptor), resources.ts
│       └── types/
├── server/            Node + Express + TypeScript backend
│   └── src/
│       ├── config/       env.ts, db.ts, stripe.ts
│       ├── models/       User, Client, Invoice, Payment, Receipt, AuditLog, ProcessedWebhookEvent
│       ├── middleware/    authenticate, authorize, validate, rateLimiter, errorHandler
│       ├── validators/    Zod schemas per resource
│       ├── services/      business logic + ownership-aware queries (see §6)
│       ├── controllers/   thin HTTP ↔ service glue
│       ├── routes/
│       └── utils/
├── docs/
│   └── architecture.md
├── .env.example
├── .gitignore
└── README.md
```

## 20. AI transparency note

This codebase was generated with AI assistance in a single pass, based on a detailed technical specification. Areas that are notoriously easy to get subtly wrong — Stripe webhook signature verification (raw-body ordering), webhook idempotency, and PDF buffer generation/streaming — were implemented with explicit inline comments explaining *why* each safeguard exists, not just what it does, so a reviewer can verify the reasoning rather than taking it on faith. Before any real deployment, this code should go through a human security review and the manual test matrix in §18, exactly as the project brief requires.
