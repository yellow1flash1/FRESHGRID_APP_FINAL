# Setting up FreshGrid

Payments are **not** included: escrow, UPI and transport fares are simulated (test mode).

## 1. Accounts and keys

Copy `.env.example` to `.env` and fill it in. **Never commit `.env`** (it is in `.gitignore`).

| Variable                                         | Needed?  | Where from                                                 |
| ------------------------------------------------ | -------- | ---------------------------------------------------------- |
| `DATABASE_URL`                                   | Yes      | Neon → Connection string (pooled)                          |
| `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Yes      | Clerk dashboard → API keys                                 |
| `RESEND_API_KEY`, `RESEND_FROM`, `OPS_EMAIL`     | Optional | Resend; `OPS_EMAIL` gets "driver needed" emails            |
| `GEMINI_API_KEY` (`GEMINI_MODEL` optional)       | Optional | Google AI Studio; powers Kisan / Safar Sahayak             |
| `DATA_GOV_IN_API_KEY`                            | Optional | data.gov.in; live mandi prices                             |
| `R2_*`                                           | Optional | Cloudflare R2 for crate photos (leave empty to switch off) |
| `ADMIN_EMAILS`                                   | Optional | Comma-separated login emails allowed into `/admin`         |
| `VITE_SUPPORT_PHONE`, `VITE_SUPPORT_EMAIL`       | Optional | Shown in Settings → Help                                   |

In the Clerk dashboard, set the application name to **FreshGrid** (it appears on the sign-in box).

## 2. Database

Run these in the Neon SQL Editor, **in this order, one file at a time, each once**. Make sure the editor is on the same project, branch and database as `DATABASE_URL`.

| File                                   | What it adds                                                                |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `neon/schema.sql`                      | Profiles, roles, cold rooms, scans, bookings, lots, escrow handover codes   |
| `neon/002_transport.sql`               | Districts, vehicle types, transporters, truck bookings, fare quotes         |
| `neon/003a_owner_role.sql`             | The `owner` role (**run alone** and wait for success)                       |
| `neon/003b_owner.sql`                  | Cold room owners: registration, check-in, release, pause                    |
| `neon/004a_transporter_role.sql`       | The `transporter` role (**run alone**)                                      |
| `neon/004b_transporter.sql`            | Driver accounts: nearby loads, accept, trip status, fare received           |
| `neon/005_transporter_quick_setup.sql` | More vehicle types, operating radius, "verify later" document gate          |
| `neon/006_krishisaakh.sql`             | KrishiSaakh ratings with the 48-hour double-blind reveal                    |
| `neon/007_farm_profile.sql`            | Farmer's saved FasalNiti farm details                                       |
| `neon/008_settings.sql`                | Settings, privacy consent, palledari, driver online switch, rating disputes |

Optional, for testing only: `neon/demo_transporters.sql` (fake drivers; delete before real use).

## 3. Run locally

```bash
bun install
```

```bash
bun run dev
```

Open http://localhost:8080. Checks: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`. GitHub Actions runs all four on every push (`.github/workflows/ci.yml`).

## 4. Admin tasks

Most are in the admin console at `/admin` (verify drivers and cold rooms, resolve rating disputes). Others in the SQL Editor:

- Give a demo room an owner: `UPDATE cold_rooms SET owner_id = 'user_xxx' WHERE name = '...';`
- Add a driver by hand: `INSERT INTO transporters (name, phone, vehicle_key, vehicle_no, base_district) VALUES (...);`
- Change fares: edit the rows in `vehicle_types`.

## 5. Deploy (Cloudflare)

```bash
bun run build
```

Add every variable from `.env.example` as a Worker/Pages secret, enable the `nodejs_compat` flag, and add your live domain in Clerk (allowed origins / redirect URLs).
