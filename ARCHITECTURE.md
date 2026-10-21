# FreshGrid architecture

How FreshGrid is built, how data and (test) money move through it, and which checks happen where. For an overview, see the [README](../README.md); for setup, [SETUP.md](SETUP.md).

## 1. Overview

FreshGrid is a single **TanStack Start** app (React 19 with server functions) that can run on Cloudflare or Node. Login is **Clerk**, data is **Neon Postgres**.

| Concern                      | Where it runs                                        | Code                                                       |
| ---------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| UI, routing, language, theme | Browser                                              | `src/routes/*`, `src/components/fg/*`, `src/lib/store.tsx` |
| Every database action        | Server functions → Neon                              | `src/lib/app.functions.ts`, `src/lib/account.functions.ts` |
| Who is calling               | Clerk session on the server                          | `src/lib/session.server.ts` (`requireUserId`)              |
| Prices, slots, fares, totals | Postgres functions                                   | `neon/*.sql`                                               |
| Produce grading (AI)         | Browser, TensorFlow.js (lazy-loaded)                 | `src/components/fg/ScanTab.tsx`                            |
| FasalNiti crop advice        | Browser (pure functions)                             | `src/lib/fasalniti.ts`                                     |
| KrishiSaakh ratings          | Server scores a rating; browser shows                | `src/lib/krishisaakh.ts`, `submitRating` in app.functions  |
| Mandi prices                 | Server function → data.gov.in                        | `src/lib/mandi.functions.ts`                               |
| Assistants                   | `/api/chat` → Gemini                                 | `src/routes/api/chat.ts`, `src/lib/ai.server.ts`           |
| Emails                       | Server → Resend, respecting Settings                 | `src/lib/email.server.ts`, `emailFor()`                    |
| Live updates                 | Polling (React Query), paused when the tab is hidden | `src/lib/data.ts`                                          |

**Design principle:** the browser is not trusted with anything involving money or identity. The caller's id always comes from Clerk on the server, never from the request body, and prices, totals, capacity and payment state are worked out in Postgres functions.

## 2. App flow

```mermaid
flowchart TD
  A[Open app] --> W[Who are you?<br/>Farmer · Transporter · Buyer · Cold room owner]
  W --> B[Log in / create account (Clerk)]
  B --> D{Profile complete?}
  D -- no --> E[Profile + privacy consent]
  D -- yes --> F{Role}
  F -- farmer --> G[Home · FasalNiti · Store/Truck · Money · Help]
  F -- transporter --> T[Trips · Pay · Income · Vehicle · Help]
  F -- buyer --> H[Market · My Orders]
  F -- owner --> O[Live · Bookings · My room]
```

A role is claimed once (`claim_role()`); it decides which screens and database actions are allowed. Settings and the KrishiSaakh panel open from the profile menu for every role.

## 3. Main data

| Table                                                              | Holds                                                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `profiles`, `user_roles`                                           | Person, role, farm details (`farm`), settings (`settings`), consent               |
| `cold_rooms`, `bookings`                                           | Rooms (owner, rate, slots, palledari), bookings with gate pass, check-in, release |
| `scans`, `lots`, `lot_handover`                                    | Grade certificates, lots for sale, secret escrow codes                            |
| `districts`, `vehicle_types`, `transporters`, `transport_bookings` | Truck network, drivers, documents, trips and fares                                |
| `ks_ratings`, `ks_disputes`                                        | KrishiSaakh ratings and disputes                                                  |

## 4. Escrow and trips

- **Lots:** open → escrow (buyer orders) → settled (buyer types the farmer's 6-digit code; 5 wrong tries lock it). The code is only readable by the farmer.
- **Trips:** requested → assigned (driver accepts; documents required) → in transit → delivered → fare marked received (UPI or cash). Drivers can give a trip back, which is counted for ratings.

## 5. KrishiSaakh

Each finished deal can be rated once per side. The server computes the record-based parts (gate-pass timestamps, release dates, trip timestamps, settlement time, hand-backs) and combines them with the rater's answers using each flow's weights. Ratings stay hidden for 48 hours, or until both sides rate. Reputation = recency average `R = 0.25·S + 0.75·R_prev`, stars `1 + 4·R/100`, smoothed toward 5★ with 5 virtual deals. Upheld disputes are excluded.

## 6. Known gaps

- Payment confirmation is simulated in the browser. Before real use it must come from a payment-gateway webhook.
- ID and document numbers are format-checked only; an admin approves them.
- Mandi prices fall back to Haryana when a state returns no records.
