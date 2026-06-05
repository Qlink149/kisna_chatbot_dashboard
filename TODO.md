# OneReside Admin Dashboard — Build Tracker

## Phase 1: Foundation
- [x] Project scaffold (Vite + React + Tailwind v4 + shadcn)
- [x] Install react-router-dom
- [x] Add shadcn components (sidebar, card, table, badge, input, select, textarea, dialog, sheet, tabs, skeleton, dropdown-menu, separator, avatar)
- [x] Set up path aliases (@/) in vite.config.js

## Phase 2: Layout & Shell
- [x] App layout (sidebar + main content area)
- [x] Sidebar with navigation links (Brands, Products, Users, Orders, Payments)
- [x] Header (page title + breadcrumb)
- [x] API client (fetch wrapper with X-API-Key header)
- [x] Overview page (stat cards)
- [x] React Router setup with routes (App.jsx wiring)
- [x] Sidebar collapse to icon-only mode with square icon boxes

## Phase 3: Brands
- [ ] Brand list page (table: brand ID, name, categories)
- [ ] Brand create form (dialog/sheet)
- [ ] Brand edit form (dialog/sheet)
- [ ] Brand delete confirmation
- [ ] Brand detail view

## Phase 4: Products
- [ ] Product list page (table: name, brand, category, type, price, status)
- [ ] Filters: brand, category, type
- [ ] Product create form
- [ ] Product edit form
- [ ] Product delete confirmation

## Phase 5: Users
- [ ] User list page (table: phone, name, last active)
- [ ] User detail view (full profile + chat history)

## Phase 6: Orders
- [ ] Order list page with filters (payment status, brand, product)
- [ ] Order detail view
- [ ] Orders by phone / by product / by brand views

## Phase 7: Payments
- [ ] Payment list page (searchable by phone)
- [ ] Payment detail view (with full Razorpay payload)

## Phase 8: Polish
- [ ] Loading states (skeletons)
- [ ] Error states
- [ ] Empty states
- [ ] Toast notifications for CRUD actions
