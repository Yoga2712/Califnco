# CALIFNCO — FINAL MASTER IMPLEMENTATION PROMPT

You are the **senior software developer responsible for completing the Califnco project**.

The project has already been developed through **Phase 9**.

Your job now is to **finish the entire project according to the original Califnco Technical Assignment**, verify every required feature, fix remaining issues, and prepare the project for final submission/deployment.

---

# 🚨 SOURCE OF TRUTH

Before touching ANY code:

### 1. Re-read the ORIGINAL Califnco Technical Assignment PDF/document.

Do not rely only on our previous phase summaries.

The original assignment is the final source of truth for:

* required features
* user roles
* technologies
* Firebase requirements
* Razorpay requirements
* maps requirements
* notification requirements
* AI automation requirements
* UI expectations
* deployment requirements
* evaluation criteria

### 2. Audit the CURRENT CODEBASE.

Inspect:

* `package.json`
* `src/`
* Expo Router structure
* Firebase configuration
* Firestore services
* authentication
* FCM
* Razorpay
* customer module
* dealer module
* admin module
* order system
* product system
* n8n integration
* environment variables
* web configuration
* deployment configuration

Do NOT assume a feature is complete just because a previous phase report says "PASS".

Verify it from the actual code.

---

# CURRENT PROJECT STATUS

Treat these as already implemented, but VERIFY them before modifying:

### Phase 1

Customer app foundation/navigation

### Phase 2

Customer product catalog and product data

### Phase 3

Product browsing/filtering/responsive UI

### Phase 4

Cart

### Phase 5

Checkout/order creation

### Phase 6

Customer Orders + Order Details + Tracking Timeline

### Phase 7

Razorpay TEST MODE

### Phase 8

Firebase Authentication + Firestore + FCM

### Phase 9

Dealer functionality

### Remaining objective

## PHASE 10 — ADMIN + DEPLOYMENT + FINAL INTEGRATION

---

# DO NOT BREAK EXISTING WORK

The following customer flow MUST continue working:

```text
Customer Login
↓
Customer Home
↓
Products
↓
Product Details
↓
Add to Cart
↓
Cart
↓
Checkout
↓
Razorpay TEST MODE
↓
Order Created
↓
My Orders
↓
Order Details
↓
Order Tracking
```

Also preserve:

* Firebase Auth
* Firestore
* FCM
* Dealer module
* product images
* responsive UI
* existing order data
* existing Razorpay TEST MODE
* existing n8n automation

Do not rewrite working modules unnecessarily.

---

# PHASE 10 — ADMIN PANEL

Implement/finish the Admin Panel exactly according to the original assignment.

First determine from the document exactly what Admin functionality is required.

The Admin Panel should provide the required administrative operations, including the documented capabilities such as:

* order management
* dealer management/approval
* service desk management
* relevant dashboard information
* required administrative actions

Use the existing Firestore architecture.

Admin data must be protected by role-based access.

A customer must NOT be able to access Admin functionality.

A dealer must NOT be able to access Admin-only functionality.

---

# ADMIN ROUTING

Create a clean route structure consistent with the existing Expo Router architecture.

Example structure only — adapt to the actual project:

```text
src/
└── app/
    ├── customer/
    ├── dealer/
    └── admin/
        ├── index.tsx
        ├── orders/
        ├── dealers/
        ├── services/
        └── ...
```

Do not create routes that are not required by the assignment.

---

# ADMIN UI

Create a professional responsive Admin experience.

It must work at:

```text
320px
360px
375px
390px
tablet
desktop/web
```

Requirements:

* no horizontal scrolling
* no clipped text
* no overflowing tables
* responsive cards
* responsive navigation
* readable typography
* accessible buttons
* loading states
* empty states
* error states
* success feedback
* confirmation before destructive actions

For tables on mobile, use responsive cards or horizontal scrolling only where appropriate.

Do not sacrifice usability for desktop-only layouts.

---

# ADMIN ORDER MANAGEMENT

Connect the Admin Panel to the existing Firestore orders.

Admin should be able to perform the exact order-management operations required by the assignment.

When an order status changes:

```text
Admin
↓
Firestore
↓
Customer Orders
↓
Order Tracking Timeline
```

The customer should see the updated status through the existing order tracking system.

Do not duplicate order data unnecessarily.

---

# DEALER MANAGEMENT

Connect Admin to the existing Dealer system.

Implement the documented dealer-management functionality.

For example, where required:

```text
Pending Dealer
↓
Admin Review
↓
Approve / Reject
↓
Dealer Access
```

Make sure role information is securely stored and checked.

Never trust a role value supplied only by the client.

---

# SERVICE DESK

Implement the Admin service-desk functionality required by the original assignment.

Admin should be able to view/manage service requests using Firestore.

Maintain proper status handling.

Example:

```text
New
↓
Assigned
↓
In Progress
↓
Completed
```

Use the exact statuses required by the assignment if specified.

---

# FIREBASE SECURITY

Audit Firestore security rules.

Ensure:

### Customer

Can access only their own private data/orders.

### Dealer

Can access only the data permitted by the assignment.

### Admin

Can perform documented administrative operations.

Never expose Firebase Admin credentials in the frontend.

Never hard-code private credentials.

---

# RAZORPAY

Preserve the existing:

**Razorpay TEST MODE**

implementation.

Do NOT switch to live mode.

Do NOT expose:

```text
RAZORPAY_KEY_SECRET
```

to the client.

Do not modify the existing payment implementation unless required to fix a verified issue.

---

# FCM

Preserve the Firebase Cloud Messaging implementation.

Where required by the assignment, ensure notifications can be triggered for relevant events such as:

```text
Order Placed
Order Confirmed
Out for Delivery
Delivered
```

Do not break the existing FCM setup.

---

# MAPS / ADDRESS

Check the original assignment for the required map/address functionality.

If it is already implemented, verify it.

If incomplete, implement the documented requirement using the specified/free map approach.

Do NOT introduce a paid map service unnecessarily.

Ensure:

* address selection works
* address data is stored correctly
* checkout receives the selected address
* Admin/order details can display the address

---

# EMAIL + SMS

Check the original assignment for the exact Email/SMS requirement.

If incomplete, implement it using the services specified by the assignment.

Do not expose service credentials in frontend code.

Use backend/n8n/server-side execution where required.

---

# AI AUTOMATION

I already have a working **n8n Instagram Reels automation**.

The automation must NOT be rewritten into React.

Preserve the existing n8n architecture:

```text
Schedule
↓
Google Sheets
↓
Gemini
↓
Cloudinary
↓
Instagram/Facebook Graph API
↓
Update Status
```

Integrate it into the Admin Panel only through a secure API/webhook approach if the assignment requires Admin control.

Admin should be able to see the automation status and trigger it if required by the specification.

Do NOT expose:

* Gemini API keys
* Instagram/Facebook access tokens
* Google credentials
* Cloudinary credentials

in frontend code.

---

# ENVIRONMENT VARIABLES

Audit `.env`.

Use appropriate variable names.

Client-safe variables may use:

```text
EXPO_PUBLIC_...
```

Private server-side secrets MUST NOT use `EXPO_PUBLIC_`.

Never commit `.env` secrets to Git.

Check `.gitignore`.

---

# PRODUCT IMAGES

Preserve the existing product-image architecture.

Products must have images relevant to the actual product.

Do not replace working product images with:

* random stock photos
* unrelated images
* broken URLs
* placeholder images

Maintain:

```text
LOCAL_PRODUCT_IMAGES
```

where it is already used.

---

# CODE QUALITY

The final project must use strict TypeScript.

Run:

```bash
npx tsc --noEmit
```

Required:

```text
0 errors
```

Also search the project for:

```text
any
as any
```

Remove unnecessary occurrences.

Do NOT hide errors using:

```text
as any
@ts-ignore
@ts-nocheck
```

---

# DEPENDENCIES

Do NOT install packages unnecessarily.

Before adding any dependency:

1. Check whether the project already has an equivalent.
2. Check Expo compatibility.
3. Check whether the dependency works on web.
4. Ensure it does not break the current build.

---

# WEB / VERCEL DEPLOYMENT

Prepare the project for the required Vercel web deployment.

First inspect the current Expo web configuration.

Verify:

```bash
npx expo export --platform web
```

works successfully.

The production web build should generate the appropriate output directory, normally:

```text
dist
```

Verify:

* Expo Router routes
* dynamic routes
* Firebase
* images/assets
* environment variables
* Admin routes
* Customer routes
* Dealer routes

work correctly on web.

Do not expose private credentials during the web build.

---

# RESPONSIVENESS

Perform a final responsive audit.

Test:

```text
320px
360px
375px
390px
414px
768px
1024px
1440px
```

Check every major module:

### Customer

* Home
* Products
* Product details
* Cart
* Checkout
* Orders
* Order details

### Dealer

* Login
* Dashboard
* Products
* Bulk order
* Orders

### Admin

* Dashboard
* Orders
* Dealers
* Service desk
* Any other required admin screens

There must be no unexpected:

* horizontal scrolling
* clipping
* overlapping
* broken images
* unreadable text
* inaccessible buttons

---

# FINAL END-TO-END TEST

Perform a complete regression test.

### Customer

```text
Login
→ Products
→ Filter
→ Product Details
→ Add to Cart
→ Cart
→ Checkout
→ Address
→ Razorpay TEST MODE
→ Successful Payment
→ Order
→ My Orders
→ Order Details
→ Tracking
```

### Dealer

```text
Dealer Login
→ Dealer Dashboard
→ Wholesale Products
→ Bulk Order
→ Order History
```

### Admin

```text
Admin Login
→ Admin Dashboard
→ Orders
→ Dealer Management
→ Service Desk
→ Required Admin Actions
```

### Automation

```text
Admin / Scheduler
→ n8n
→ Google Sheets
→ Gemini
→ Cloudinary
→ Instagram
→ Status Update
```

---

# FINAL SECURITY AUDIT

Before declaring completion:

Search for accidental secrets/API keys in the repository.

Check:

```text
.env
.env.local
.env.production
Git tracked files
Frontend source
Logs
Console statements
```

Make sure private credentials are not exposed.

---

# FINAL BUILD CHECK

Run all appropriate checks.

At minimum:

```bash
npx tsc --noEmit
npx expo export --platform web
```

If the project has tests, run them.

Fix every error that is caused by your changes.

Do not claim success merely because TypeScript passes.

The actual application must run.

---

# FINAL REPORT

When everything is complete, provide:

## CALIFNCO FINAL STATUS

### 1. Assignment Requirements

List every requirement from the original document and mark:

```text
PASS
PARTIAL
FAIL
```

Do not hide incomplete requirements.

### 2. Phases

```text
Phase 1 — PASS
Phase 2 — PASS
Phase 3 — PASS
Phase 4 — PASS
Phase 5 — PASS
Phase 6 — PASS
Phase 7 — PASS
Phase 8 — PASS
Phase 9 — PASS
Phase 10 — PASS
```

Only mark PASS if actually verified.

### 3. Files Created

List them.

### 4. Files Modified

List them.

### 5. Firebase

Report Auth / Firestore / FCM status.

### 6. Razorpay

Report TEST MODE status.

### 7. Dealer

Report Dealer functionality.

### 8. Admin

Report Admin functionality.

### 9. Maps

Report map/address status.

### 10. Notifications

Report Email/SMS/FCM status.

### 11. AI Automation

Report n8n/Instagram automation integration status.

### 12. Responsive Testing

Report tested screen sizes.

### 13. TypeScript

Report:

```text
npx tsc --noEmit
```

result.

### 14. Web Build

Report:

```text
npx expo export --platform web
```

result.

### 15. Remaining Issues

List every remaining issue honestly.

---

# 🚨 FINAL STOP CONDITION

Do NOT start any new phase after Phase 10.

Do NOT rewrite completed functionality simply to change its implementation style.

Do NOT claim the project is finished if any mandatory assignment requirement is missing.

If you encounter a requirement that cannot be completed because an external credential, account, API, native build, or deployment configuration is required, **STOP and clearly tell me exactly what I need to provide/configure.**

Otherwise, fix the issue yourself.

The ultimate goal is:

**A fully functional, responsive, secure, assignment-compliant Califnco application ready for demonstration and submission.**

Proceed systematically. Verify before modifying. Test after modifying. Preserve everything that already works.
