# ResaleRadar Web

Light-mode inventory dashboard for resale operations. One continuous, sortable,
filterable table replaces per-month spreadsheets, with summary metrics driven by
an explicit weeks/months range control.

- **Web app:** React 19 + TypeScript + Vite (`src/`)
- **Shared money & fee domain logic:** `shared/` (used by both the app and Cloud Functions)
- **Backend:** Firestore (reads) + Cloud Functions v2 (validated writes) (`functions/`)

## Local setup

```bash
cd ResaleRadar-Web
npm install
npm --prefix functions install
cp .env.example .env.local   # fill in your Firebase web app config
npm run dev
```

UI-only development without Firebase:

```bash
VITE_USE_DEMO_DATA=true npm run dev
```

Demo mode uses the clearly-labelled in-memory source in `src/data/demoRepository.ts`
and renders a banner. It is never used when `VITE_USE_DEMO_DATA` is unset.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | TypeScript project build (no emit) |
| `npm run lint` | oxlint |
| `npm test` | Vitest unit tests for money, fees, validation, summaries, ranges |
| `npm run emulators` | Firebase emulators (functions, firestore, hosting) |
| `npm run deploy` | Build web + functions and `firebase deploy` |

## Firebase configuration

No project id, key, or service-account file is committed. Configuration comes from:

1. **Web app:** `VITE_FIREBASE_*` variables in `.env.local` (see `.env.example`).
2. **CLI/project selection:** `firebase use --add` writes a local, git-ignored `.firebaserc`.
   In CI, use `firebase deploy --project "$FIREBASE_PROJECT_ID"`.
3. **Functions runtime:** optional `INVENTORY_COLLECTION` and `FUNCTIONS_REGION`
   environment variables (defaults `inventoryItems`, `us-central1`).

Deployment requires the **Blaze** plan (Cloud Functions v2). Deploy with:

```bash
firebase login
firebase use --add                     # select your project
npm run deploy                         # or: firebase deploy --only functions,firestore,hosting
```

Deployment has **not** been run from this repository — no project credentials are available here.

## Data model — `inventoryItems/{id}`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Document id |
| `title` | string | Trimmed, ≤ 200 chars |
| `platform` | enum | `ebay`, `mercari`, `poshmark`, `depop`, `etsy`, `facebook`, `other` |
| `listPriceCents` | integer | Money is always integer cents |
| `cogsCents` | integer | Defaults to `0` |
| `feeRate` | number | Snapshot of the rate applied at write time |
| `feeCents` | integer | `round(listPriceCents * feeRate)` |
| `netProceedsCents` | integer | `listPriceCents - feeCents` |
| `profitCents` | integer | `netProceedsCents - cogsCents` |
| `listedAt` | ISO string | The single date field used by all range filters and metrics |
| `createdAt` / `updatedAt` | ISO string | Audit timestamps |

## Cloud Function endpoint

Callable `createItem` and HTTPS `createItemHttp` accept the same payload:

```jsonc
{
  "title": "Nikon FE 35mm Camera Body",
  "listPrice": "189.99",   // or "listPriceCents": 18999
  "platform": "ebay",
  "cogs": "60.00",         // optional, defaults to $0.00
  "listedAt": "2026-03-01T00:00:00.000Z", // optional, defaults to now
  "clientRequestId": "uuid" // optional idempotency key
}
```

Invalid input returns a structured error and writes nothing:

```jsonc
{ "error": { "code": "invalid-argument", "message": "Invalid inventory item.",
  "errors": [{ "field": "platform", "code": "unsupported_platform", "message": "…" }] } }
```

Repeating a `clientRequestId` returns the original item (`deduplicated: true`)
rather than creating a duplicate.

## Business rules and assumptions

These were not defined in the codebase; change them in `shared/inventory.ts` if wrong.

- eBay fee rate is `0.136` (13.6%) of list price. All other platforms are `0`
  until a rate is supplied.
- Fees round half up to the nearest cent.
- Cost of goods defaults to `$0.00` when omitted.
- Shipping, shipping labels, promoted-listing fees, and sales tax are **not** modeled.
- Net proceeds = list price − fees; profit = net proceeds − COGS. There is no
  "sold" lifecycle yet, so metrics describe listed inventory, not settled sales.
- `listedAt` is the only date used for the range filter and summary metrics.

## Security notes

- Firestore rules make `inventoryItems` client-read-only; every write goes
  through the Cloud Function so fee math cannot be forged from the browser.
- `createItemHttp` is public with CORS enabled. Put App Check or Firebase Auth in
  front of it before exposing it beyond your own tooling.
