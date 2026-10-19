# FreshGrid 🌾 Scan · Store · Sell

FreshGrid is a phone app for small farmers and FPOs (Farmer Producer Organisations) in India. A farmer can grade a crate of produce with the camera, book a cold room nearby, check today's mandi price, and sell the lot to a buyer, with the payment held in escrow until delivery. It works in Hindi and English.

**Live demo:** https://freshgrid-app-final.vercel.app
**More docs:** [Architecture](docs/ARCHITECTURE.md) · [Demo walkthrough for judges](docs/DEMO.md)

> This is a hackathon prototype. No real money moves: every payment is a test payment, and a few steps are simulated. We list them all [further down](#whats-real-and-whats-simulated).

## Team

| Name | Role |
|---|---|
| Rahul Rajpal ([@yellow1flash1](https://github.com/yellow1flash1)) | Backend developer |
| Anmol | App UI |
| Parth | Database manager |
| Anirudh | Frontend developer |

## Why we built it

A lot of what small farmers grow spoils before it's sold, and what's left often goes cheap. There's usually no cold storage nearby (or no easy way to book it), no fair way to prove produce is good quality, little idea of the going rate, and a long chain of middlemen who pay late. We wanted one app that covers the whole trip from field to buyer.

## What it does

**For farmers**
- **Scan:** point the camera at a crate and an AI model grades it A, B or C, then saves a grade certificate. The models (apple, and tomato/potato) were trained with [Teachable Machine](https://teachablemachine.withgoogle.com/) and run in the browser with TensorFlow.js. See [`ScanTab.tsx`](src/components/fg/ScanTab.tsx).
- **Store:** a map of cold rooms nearby with prices and free slots, plus real cold stores and mandis pulled from OpenStreetMap. Prices and capacity are checked on the server.
- **Price:** live Agmarknet prices from data.gov.in for the farmer's state.
- **Sell and pay:** list graded lots, pay storage dues, and share a secret 6-digit delivery code with the buyer.
- **Income estimator:** compares selling at the mandi the usual way with going through FreshGrid.
- **Kisan Sahayak:** a chat assistant (Google Gemini) that answers in Hindi or English using the farmer's own scans, bookings and prices.

**For buyers**
- A market of open graded lots you can filter by crop, with today's mandi price shown next to each one.
- Escrow orders: the buyer pays first, and the money is released only once they enter the farmer's delivery code. The code is checked on the server, and you're locked out after 5 wrong tries.
- New lots show up right away (Supabase Realtime).

Other bits: email or Google sign-in, separate farmer and buyer roles, adjustable text size, and layouts for phone and desktop.

## What's real and what's simulated

We'd rather be upfront about this than have judges find out later.

| Area | Status | Notes |
|---|---|---|
| Sign-in, roles, profiles | ✅ Real | Supabase Auth with row-level security |
| AI grading for apple, tomato, potato | ✅ Real model | Trained on small datasets and not checked against official grading standards |
| AI grading for other crops, or with no camera | 🟡 Simulated | Gives a random grade and says so on screen |
| Certificate details (uniformity, spoilage, shelf life) | 🟡 Derived | Fixed values for each grade, not measured |
| Mandi prices | ✅ Real | Agmarknet API (needs `DATA_GOV_IN_API_KEY`); falls back to fixed rates in [`crops.ts`](src/lib/crops.ts) |
| Cold stores and mandis on the map | ✅ Real | OpenStreetMap, so only as complete as OSM is for that area |
| Bookable cold rooms | 🟡 Sample data | Demo listings in a few Haryana and Delhi districts. Not real businesses, and badges like "FPO Certified" are just for show |
| Booking amounts, slots, lot totals | ✅ Real logic | Calculated in Postgres, so the browser can't change prices |
| UPI / QR / KCC payments | 🔴 Simulated | No payment gateway. "Paying" is an animation and the UTR is a random number |
| Escrow | 🟡 Logic only | Open → escrow → settled, with the handover code. No money is actually held |
| Farmer ID (Aadhaar / KCC / PM-Kisan) | 🔴 Not verified | We only store the number; no government API is called |
| UPI ID check | 🔴 Format only | Doesn't contact NPCI |
| Kisan Sahayak | ✅ Real | Gemini (needs `GEMINI_API_KEY`), told not to make up numbers |
| Income estimator | 🟡 Assumptions | Uses our own estimated rates, below |

### Income estimator assumptions

From [`src/lib/income.ts`](src/lib/income.ts):

| | Usual mandi sale | FreshGrid |
|---|---|---|
| Post-harvest loss | 38% | 8% |
| Commission | 12% | 8% |
| Transport | ₹3.5/kg | ₹2.2/kg |
| Other fees | ₹1.058/kg | — |
| Cold storage | — | ₹18 per 20 kg crate per day |
| Escrow fee | — | ₹104 flat |

For example, 1,000 kg of tomato at ₹30/kg stored for 3 days comes out at ₹11,810 the usual way and ₹20,388 with FreshGrid (+73%). That case has a test in [`src/test/income.test.ts`](src/test/income.test.ts). These are our guesses for the demo and would need checking against real FPO numbers.

## Tech stack

- **Frontend:** React 19, TanStack Start / Router / Query, Tailwind CSS 4, shadcn/ui, Recharts
- **AI:** TensorFlow.js + Teachable Machine in the browser, Google Gemini for the assistant
- **Maps:** Leaflet, OpenStreetMap, Overpass API
- **Backend:** Supabase (Postgres, Auth, Realtime, row-level security, PL/pgSQL functions)
- **Data:** Agmarknet daily prices from [data.gov.in](https://data.gov.in)
- **Tooling and hosting:** Vite, TypeScript, Vitest, ESLint, Prettier, Bun, Vercel

How the pieces fit together, plus the data model and money flow, is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Running it locally

You'll need Node.js 20+ (or Bun) and a Supabase project.

```bash
git clone https://github.com/yellow1flash1/FRESHGRID_APP_FINAL.git
```

```bash
cd FRESHGRID_APP_FINAL && npm install
```

```bash
cp .env.example .env
```

Fill in `.env`, run the SQL files in [`drizzle/migrations/`](drizzle/migrations) on your Supabase database in order, then:

```bash
npm run dev
```

| Variable | Needed? | For |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Yes | Supabase in the browser |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | Yes | Server-side checks, e.g. sign-in for `/api/chat` |
| `GEMINI_API_KEY` | Optional | Kisan Sahayak |
| `DATA_GOV_IN_API_KEY` | Optional | Live mandi prices ([free key](https://data.gov.in)) |

The Supabase publishable key is fine to be public since row-level security protects the data. Don't commit a `service_role` key or the Gemini / data.gov.in keys.

Other scripts: `npm run build`, `npm test` (income model and routing tests), `npm run lint`.

## Where things are

```
src/
├─ routes/          # index.tsx (sign-in → setup → farmer or buyer app), api/chat.ts
├─ components/fg/   # FreshGrid screens: Shell (farmer), BuyerShell, ScanTab, ColdTab, PayTab, IncomeTab, AssistTab
├─ lib/             # crops, income model, mandi prices, OpenStreetMap lookup, Gemini chat, data hooks
├─ components/ui/   # shadcn/ui pieces
└─ test/            # Vitest tests
drizzle/migrations/ # Postgres schema, RLS policies, functions, seed data
```

## Known gaps and what's next

Right now grading only covers apple, tomato and potato on small datasets, there's no real payment gateway, ID and UPI checks aren't connected to any official system, the cold rooms are sample data, the profile form only lists six states, and there aren't many tests yet.

Next, we'd like to:
1. Hook up a real UPI gateway, with escrow confirmed by webhook (see the note in `drizzle/migrations/0001_secure_money_flows.sql`).
2. Train the grading models on bigger labelled datasets that follow AGMARK rules, and add more crops.
3. Bring on real cold storage partners through FPOs, with live sensor data for slots and temperature.
4. Add voice input in Hindi and regional languages, and offline support.
5. Connect to e-NAM so graded lots can be listed on the national market.

## Credits and notes

- **AI tools:** we used Claude to help draft this documentation. The idea, the grading models and the product decisions are ours.
- **Open data and services:** [Agmarknet / data.gov.in](https://data.gov.in), [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), [Teachable Machine](https://teachablemachine.withgoogle.com/), Google Gemini, Supabase.
- **Privacy:** profile details (phone, village, ID number, UPI ID) are stored in Supabase, and each user can only read their own rows. It's a prototype, so please don't enter a real Aadhaar number.
- **Not affiliated** with NPCI, e-NAM, Agmarknet or any government body. Scheme names are only used to describe what the app is meant to work with.
