# FreshGrid 🌾 Scan · Store · Move · Sell

FreshGrid is a phone app that connects the four people a harvest passes through in India: **farmers**, **transporters**, **cold storage owners** and **buyers**. A farmer can plan what to sow, grade a crate with the camera, book a cold room or a truck, check today's mandi price and sell the lot with the payment held in escrow until delivery. Every partner rates the others after each deal. It works in Hindi and English.

**Docs:** [Setup](docs/SETUP.md) · [Architecture](docs/ARCHITECTURE.md) · [Demo walkthrough](docs/DEMO.md)

> This is a prototype. No real money moves: every payment is a test payment, and a few steps are simulated. They are all listed [further down](#whats-real-and-whats-simulated).

## Team

| Name                                                              | Role               |
| ----------------------------------------------------------------- | ------------------ |
| Rahul Rajpal ([@yellow1flash1](https://github.com/yellow1flash1)) | Backend developer  |
| Anmol                                                             | App UI             |
| Parth                                                             | Database manager   |
| Anirudh                                                           | Frontend developer |

## Why we built it

A lot of what small farmers grow spoils before it's sold, and what's left often goes cheap. There's usually no cold storage nearby (or no easy way to book it), no truck when you need one, no fair way to prove produce is good quality, little idea of the going rate, and a long chain of middlemen who pay late. We wanted one app that covers the whole trip from sowing decision to buyer, and that rewards everyone in the chain for being reliable.

## What it does

The app opens on **"Who are you?"**: Farmer, Transporter, Buyer, or Cold room / Warehouse owner. Then log in or create an account (Clerk).

**Farmers** (Home · FasalNiti · Store/Truck · Money · Help)

- **Home:** quick actions, today's mandi prices for your crops, price alerts, money in escrow, storage dues, trips in progress and your FasalNiti top pick.
- **FasalNiti:** a pre-sowing crop and profit advisor. A 3-stage model (hard feasibility gates → six 0–100 sub-scores → three weighted cards: _Safe & Guaranteed_, _High Profit_, _Short-Duration Cash Crop_) ranks 20 crops for the farmer's own land, budget, water, soil and previous crop. Includes a Rabi benchmark example and a live simulator. See [`src/lib/fasalniti.ts`](src/lib/fasalniti.ts).
- **Scan:** point the camera at a crate and an AI model grades it A, B or C and saves a certificate. Tomato, potato and apple are trained models; a searchable crop menu pins them first.
- **Cold rooms and trucks:** book a cold room on a live map, or book a truck with a fare quote by distance and vehicle type.
- **Money:** escrow sales with a secret 6-digit delivery code, storage dues, a passbook and an income estimator.
- **Kisan Sahayak:** a Gemini chat assistant that answers in Hindi or English using the farmer's own data.

**Transporters** (Trips · Pay · Income · Vehicle · Help)

- Quick setup (vehicle type, number, payload, base and radius); documents (RC, licence, insurance, fitness, Aadhaar) can be added later but are required before accepting a trip.
- Nearby loads with a sound alert, accept → picked up → delivered, collect the fare by UPI QR or cash, earnings charts, an Online/Offline switch and the Safar Sahayak assistant.

**Buyers:** a market of graded lots sorted by their preferred crops and districts, escrow orders, and delivery confirmation with the farmer's code.

**Cold room owners:** register a room, live capacity, gate check-in by pass number, release, cash received, earnings, palledari rate and a pause-bookings switch.

**KrishiSaakh ratings (all roles):** six rating flows (e.g. driver → farmer "Shipper Readiness", farmer → cold store "Custody & Preservation") that mix app records with 3-tap partner answers. Scores use a recency average and Bayesian stars (everyone starts at 5★), tiers (Gold needs 4.5★ and 3+ ratings), a 48-hour double-blind reveal, an IMD weather-delay shield and disputes. See [`src/lib/krishisaakh.ts`](src/lib/krishisaakh.ts).

**Settings (all roles):** account, language, text size, light/dark theme, automatic phone/computer layout, read-aloud, email notification choices and quiet hours, UPI IDs, payment history download, ratings received and disputes, role preferences, privacy (location, download my data, delete my account) and help.

**Admin console** at `/admin` for verifying drivers and cold rooms and resolving rating disputes (allowed emails are set in `ADMIN_EMAILS`).

## What's real and what's simulated

| Area                                              | Status         | Notes                                                                                 |
| ------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| Sign-in, roles, profiles, settings                | ✅ Real        | Clerk login; data in Neon Postgres, every action checked on the server                |
| AI grading for tomato, potato, apple              | ✅ Real model  | Small training sets; not checked against official AGMARK grading                      |
| AI grading for other crops, or with no camera     | 🟡 Simulated   | Random grade, and the app says so                                                     |
| Mandi prices                                      | ✅ Real        | Agmarknet API (needs `DATA_GOV_IN_API_KEY`); otherwise fixed fallback rates           |
| FasalNiti crop data                               | 🟡 Indicative  | 2025-26 MSPs and estimated costs/yields; live mandi prices are used when available    |
| Cold stores and mandis on the map                 | ✅ Real        | OpenStreetMap                                                                         |
| Bookable cold rooms (demo ones)                   | 🟡 Sample data | A few demo listings; real owners can register their own rooms                         |
| Prices, slots, fares, totals                      | ✅ Real logic  | Calculated in Postgres functions, so the browser can't change them                    |
| UPI / QR / KCC payments and escrow                | 🔴 Simulated   | No payment gateway yet; UTRs are random test numbers                                  |
| Farmer ID, driver documents                       | 🟡 Format only | Number formats and the Aadhaar checksum are checked; an admin approves documents      |
| Rating telemetry (arrival, dwell, weighbridge)    | 🟡 Partly      | From gate-pass and trip timestamps; waiting time and weight are reported by the rater |
| Emails                                            | ✅ Real        | Resend (optional); each user chooses topics in Settings                               |
| WhatsApp / SMS alerts, bank payouts, staff logins | 🔴 Not yet     | Shown as "coming soon" in Settings                                                    |

## Tech stack

- **Frontend:** React 19, TanStack Start / Router / Query, Tailwind CSS 4, Recharts, Leaflet
- **Login:** Clerk · **Database:** Neon serverless Postgres (SQL in [`neon/`](neon)) · **Email:** Resend · **Photos (optional):** Cloudflare R2
- **AI:** TensorFlow.js + Teachable Machine in the browser (loaded only when scanning), Google Gemini for the assistants
- **Data:** Agmarknet prices from [data.gov.in](https://data.gov.in), OpenStreetMap
- **Tooling:** Bun, Vite, TypeScript, Vitest, ESLint, Prettier, GitHub Actions CI

## Running it locally

Full steps, including the database files, are in [docs/SETUP.md](docs/SETUP.md). In short:

```bash
bun install
```

```bash
cp .env.example .env
```

Fill in `.env` (Neon `DATABASE_URL` and Clerk keys at minimum), run the SQL files in `neon/` in order, then:

```bash
bun run dev
```

Other scripts: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run format`.

## Where things are

```
src/
├─ routes/            # index (welcome → login → profile → role app), privacy, admin, api/chat
├─ components/fg/     # screens: Shell (farmer), TransporterShell, BuyerShell, OwnerShell, HomeTab, FasalNitiTab, Settings, KrishiSaakh …
├─ lib/               # server functions (*.functions.ts, *.server.ts), FasalNiti and KrishiSaakh engines, crops, data hooks
├─ components/ui/     # shadcn/ui pieces
└─ test/              # Vitest tests (income, routing, FasalNiti, KrishiSaakh)
neon/                 # database SQL, run in order
```

## Known gaps and what's next

1. A real UPI gateway (e.g. Razorpay or Cashfree) with escrow confirmed by webhook, and bank payouts.
2. WhatsApp / SMS alerts, and GPS from the driver's phone to replace self-reported timings.
3. Bigger, AGMARK-aligned training data for grading, and more crops.
4. Enforcing KrishiSaakh tier perks (e.g. refundable deposit for Probation tier).
5. Offline support for weak signal areas, and more Indian languages.

## Credits and notes

- **AI tools:** we used Claude to help write code and documentation. The idea, the grading models and the product decisions are ours.
- **Open data and services:** [Agmarknet / data.gov.in](https://data.gov.in), [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), [Teachable Machine](https://teachablemachine.withgoogle.com/), Google Gemini, Clerk, Neon, Resend.
- **Privacy:** only the last 4 Aadhaar digits are stored for drivers; see the in-app [privacy policy](src/routes/privacy.tsx). It's a prototype, so please don't enter real ID numbers.
- **Not affiliated** with NPCI, e-NAM, Agmarknet, IMD or any government body.
