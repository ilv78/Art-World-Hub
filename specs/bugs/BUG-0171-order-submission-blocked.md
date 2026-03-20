# BUG-0171: Order cannot be submitted at checkout

**Status:** Resolved
**Severity:** High
**Last Updated:** 2026-03-20
**Reporter:** ilv78

## Description

Buyers cannot submit orders at checkout. The checkout dialog shows "Failed to place order — Please try again later."

**Expected:** Any buyer (authenticated or not) should be able to place an order by filling out the checkout form.

## Root Cause

`POST /api/orders` was guarded by `isAuthenticated` middleware, but the checkout flow is designed for unauthenticated buyers who provide their name, email, and shipping address via the form. The route handler never used `req.user` — all buyer info comes from the request body. Unauthenticated requests received a 401 response, which the frontend surfaced as a generic error.

## Fix

1. Removed `isAuthenticated` from `POST /api/orders` — checkout does not require login.
2. Added server-side validation: artwork must exist and `isForSale` must be true.
3. Server now uses the actual database price for `totalAmount` instead of trusting the client-sent value (prevents price manipulation).
4. Server forces `status` to `"pending"` regardless of what the client sends.

**Files changed:**
- `server/routes.ts` — order creation endpoint
- `server/__tests__/routes.test.ts` — updated and added tests for new validation
