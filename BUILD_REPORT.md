# KISNA Dashboard Build Report

Generated after completing Phases 1–8 of the KISNA admin dashboard build plan.

---

## COMPLETED

### Phase 1 — Fork and setup
- Fork already existed at `kisna_chatbot_dashboard/` (identical NKL copy)
- Updated `package.json` name to `kisna-chatbot-dashboard`
- Created `.env.local` with `VITE_API_URL=https://kisna-chatbot.vercel.app`
- Updated `vite.config.js` dev proxy to target `VITE_API_URL`
- Added CORS origins to `kisna-chatbot/kisna_chatbot/main.py`: `https://kisna-dashboard.vercel.app`, `https://dash.kisna-wa.claraai.tech`
- Confirmed `vercel.json` SPA rewrites unchanged

### Phase 2 — Full KISNA rebrand
- Replaced all Nilkamal/NKL branding with KISNA Diamond & Gold
- Login page: navy panel (#0F172A), Diamond icon, gold Sign In button (#C9A84C)
- Sidebar: KISNA / Diamond & Gold subtext, Diamond logo, gold accents
- Replaced emerald accent colors with gold (#C9A84C) across UI
- Updated `index.html` title, ChatMessages empty state, Layout mobile header

### Phase 3 — Schema field mapping
- `api.js`: added `client_id=kisna` on all relevant GET requests
- `ComplaintsPage.jsx`: mapped `case_id`, `type`, `issue` fields; added Status column with badge colors; KISNA complaint type labels (8 types)

### Phase 4 — Conversations module
- Removed sleep profile, cart_url, nkl_product_cache, last_shown_product panels
- Added `jewellery_profile` banner (UsersPage) and detail panel (UserProfilePanel)
- Added `last_viewed_product` panel (title + price)
- Renamed Nilkamal AI → KISNA AI
- Preserved takeover/release/SSE/polling/Agent Requested unchanged

### Phase 5 — Dashboard home / analytics
- Renamed Store Visits → Store Visit Requests; updated complaint description
- Growth charts fetch separate endpoints and merge into chart state
- Placeholder "Analytics coming soon" when growth endpoints fail
- Date picker disabled with tooltip "Date filtering coming soon"
- User growth bar color changed to #C9A84C

### Phase 6 — Auth hardening
- JWT persisted in `localStorage` key `kisna_dashboard_token`
- Created `ProtectedRoute.jsx`; wrapped all routes except `/login` in App.jsx

### Phase 7 — Backend /system routes
- Added `client_id` query param to all routes in `users.py` (list, search, get)
- Confirmed existing endpoints: `/system/user`, `/system/damage`, `/system/dashboard/*`, `/system/conversation/*`

### Phase 8 — Post-order flows → complaints
- Created `ReturnsRefundAgent` + `ReturnsRefundPipeline`; registers complaints with type `5_Return_Refund_Request`
- Updated `get_order_tracking_url()` to use `KISNA_ORDER_TRACKING_URL` / `KISNA_TRACK_ORDER_URL`
- Order tracking sends generic track-order CTA URL (no complaint per query)
- Updated `json/damage_complaint.json` with 8 KISNA complaint types
- Complaint flow (ComplaintAgent) already saves MongoDB docs with KISNA field names
- human_handoff unchanged (live_agent_required flag only)

---

## DASHBOARD PAGES WORKING

| Page | Route | Status |
|------|-------|--------|
| Login | `/login` | Rebranded, JWT persistence |
| Dashboard Home | `/` | Stats + growth charts (separate API calls) |
| Conversations | `/users` | Jewellery profile, last viewed product, SSE/takeover intact |
| Complaints | `/complaints` | KISNA schema + Status column |
| 404 | `*` | Unchanged |

---

## BACKEND ENDPOINTS CONFIRMED

| Endpoint | Status |
|----------|--------|
| `POST /system/auth/login` | Exists |
| `GET /system/user?client_id=kisna` | Exists — client_id param added |
| `GET /system/user/search?client_id=kisna` | Exists — client_id param added |
| `GET /system/user/{phone}?client_id=kisna` | Exists — client_id param added |
| `GET /system/damage?client_id=kisna` | Exists |
| `GET /system/dashboard/stats?client_id=kisna` | Exists |
| `GET /system/dashboard/ratings?client_id=kisna` | Exists |
| `GET /system/dashboard/users/growth?client_id=kisna` | Exists |
| `GET /system/dashboard/store-visits/growth?client_id=kisna` | Exists |
| `GET /system/conversation/{phone}/stream` | Exists (SSE, token query param) |
| `POST /system/conversation/{phone}/takeover` | Exists |
| `POST /system/conversation/{phone}/release` | Exists |
| `POST /system/conversation/{phone}/send` | Exists |
| `POST /system/conversation/{phone}/resolve-agent` | Exists |

Note: Dashboard uses `/system/user` and `/system/damage` (not `/system/users` or `/system/complaints`).

---

## KISNA COMPLAINT TYPES WIRED

| Flow | Complaint creation | Status |
|------|-------------------|--------|
| WhatsApp complaint flow (all 8 types) | ComplaintAgent → MongoDB | Wired |
| `returns_refund` intent | ReturnsRefundAgent → type `5_Return_Refund_Request` | Wired |
| `order_tracking` intent | Tracking CTA only — no complaint | Wired (as specified) |
| `1_Order_Cancellation` / `6_Modification_Request` via flow | ComplaintAgent | Wired (after Gupshup flow re-deploy) |
| `human_handoff` | live_agent_required only — no complaint | Wired (unchanged) |
| `7_Order_Tracking_Escalation` | Available in flow JSON — manual submission only | Pending escalation logic |

---

## ENV VARS NEEDED

### Dashboard (`kisna_chatbot_dashboard/.env.example`)
```
VITE_API_URL=https://kisna-chatbot.vercel.app
```

### Backend (`kisna-chatbot/.env.example`)
```
KISNA_ORDER_TRACKING_URL=https://www.kisna.com/pages/track-order
KISNA_TRACK_ORDER_URL=   # fallback alias
VITE_API_URL=            # not used by backend; dashboard only
```

Plus existing backend vars: `MONGO_URI`, `JWT_SECRET_KEY`, `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_PASSWORD`, Gupshup keys, etc.

---

## STILL PENDING (requires separate work)

1. **jewellery_profile backend population** — Dashboard displays the field when present; product search agent does not yet write `jewellery_profile` to user documents
2. **Gupshup flow re-deploy** — Run `python scripts/setup_gupshup_flow.py` after updating `damage_complaint.json` so WhatsApp shows new complaint types
3. **Date filtering on dashboard stats** — UI disabled; backend `/dashboard/stats` does not accept `from_date`/`to_date` yet
4. **Order tracking escalation complaints** — Spec deferred; no auto-complaint on repeated tracking queries yet
5. **Pre-existing test failure** — `test_logging.py::test_webhook_stub_logs_request_id` (401 signature) unrelated to this work

---

## DEPLOY INSTRUCTIONS

### Dashboard (Vercel)

1. Push `kisna_chatbot_dashboard/` to GitHub
2. In Vercel: **Add New Project** → import the repo
3. Framework preset: **Vite**
4. Root directory: `kisna_chatbot_dashboard` (if monorepo) or repo root
5. Environment variable: `VITE_API_URL` = `https://kisna-chatbot.vercel.app`
6. Deploy
7. Confirm SPA routing: `vercel.json` rewrites all paths to `/index.html`
8. Add production URL to backend CORS in `kisna_chatbot/main.py` if using a custom domain

### Backend (if not already deployed)

1. Ensure `kisna-chatbot` is deployed to Vercel with all env vars set
2. Verify CORS includes dashboard URLs
3. Re-upload WhatsApp complaint flow via `scripts/setup_gupshup_flow.py`

### Local dev

```bash
cd kisna_chatbot_dashboard
npm install
# .env.local already has VITE_API_URL
npm run dev
```

Dev server proxies `/system/*` to `VITE_API_URL`.

---

## END OF REPORT
