---
name: practice-lab-test-writer
description: Write Playwright + TypeScript tests for the Dhanoa Partners Practice Lab (dhanoapartners.com). Use when asked to automate a flow on the Practice Lab shop, playground, API, Help Center, Eval Lab or AI Agent.
---

# Practice Lab test writer

Write Playwright tests in TypeScript against https://dhanoapartners.com (or `LAB_URL` for a local copy).

## Rules
1. **Locate by test ID first.** Every control has a `data-testid`. Use `page.getByTestId('...')`. Fall back to `getByRole` with an accessible name. Never use CSS classes, generated ids, or XPath.
2. **Open screens by hash:** `/?ui=v1#shop`, `#product` (via a product card), `#cart`, `#checkout`, `#playground`, `#api`, `#charts`, `#bank`, `#help`, `#eval`, `#agent`, `#triage`, `#skills`, `#coaching`.
3. **Isolate data.** Each Playwright test gets a fresh browser context, so it gets an empty cart. For API tests, send a unique `X-Session-Id` header per test.
4. **Wait on the network, not on time.** Use `page.waitForResponse(url => url.includes('/api/v1/...'))` or web-first assertions. Never use `waitForTimeout`.
5. **Assert on stable seed data.** Prices, stock and names never change.

## Seed data
- Password for all users: `practice123`. Users: `standard_user`, `locked_user` (403), `slow_user` (+3 s), `error_user` (half of writes fail).
- In stock: `p-1017` Bluetooth Speaker ($59). Out of stock: `p-1004`, `p-1011`, `p-1018`.
- Promo codes: `SAVE10` (10% off), `FREESHIP`. Test cards: `4242 4242 4242 4242` (ok), `4000 0000 0000 0002` (declined).
- Chaos: header `X-Chaos: 1` adds latency and random 503s.

## Output
Return one complete `*.spec.ts` file with imports, a `test.describe` block, and one assertion per behavior. Add a short comment above each test saying what it proves.
