# FreshGrid demo walkthrough (about 5 minutes)

**Live app:** https://freshgrid-app-final.vercel.app

You'll need **two accounts** to see the whole flow: one **farmer** and one **buyer**. Use two browsers, or one normal window and one private window.

> All payments are test payments and no money moves. Please don't enter real Aadhaar or bank details.

## Farmer side

1. **Create an account** → choose **"I am a Farmer"**, then complete the profile (any village name, a 10-digit mobile number starting with 6–9, any UPI ID such as `test@sbi`, and an ID number of any 4 or more characters).
2. Tap **हिंदी** (or **English**) in the top bar to switch the whole app between Hindi and English.
3. **Scan tab** → allow camera access → point it at an **apple, tomato or potato** → **Scan Crate**.
   - The AI model's label and confidence are shown, and a grade certificate (A/B/C) is created.
   - Without a camera, the app clearly says it is using a *simulated scan*.
4. From the certificate, **List for Buyer Sale**: enter a quantity and price per kg.
5. **Store tab** → see sample cold rooms and real nearby cold stores and mandis from OpenStreetMap → **Book Slot & Pay** for some crates. The price and free slots are checked on the server.
6. **Pay tab** → see the new lot and its **6-digit delivery code**, plus any storage dues.
7. **Income tab** → compare a traditional mandi sale with the FreshGrid route (the assumptions are listed in the README).
8. **Help tab** → ask Kisan Sahayak something like *"मेरे टमाटर कितने दिन कोल्ड स्टोर में रख सकते हैं?"* ("How many days can I keep my tomatoes in cold storage?"). It answers using your own scans and lots.

## Buyer side

9. In the second window, **create an account** → choose **"I am a Buyer"** → enter a business name and phone number.
10. **Market** → the farmer's lot appears (live, with no refresh needed) next to today's mandi price → **Order & Pay into Escrow** → complete the *test* UPI step.
11. **My Orders** → **Confirm Delivery** → type a wrong code once (the app shows how many attempts are left) → then enter the farmer's real 6-digit code → payment is marked **released** with a test reference number.
12. Back in the farmer window, the lot now shows as **settled**.

## What to look for

- The browser can't change prices, totals or payment state. These are decided by Postgres functions (see [ARCHITECTURE.md](ARCHITECTURE.md#5-security-model)).
- The delivery code is never sent to the buyer's app. It is checked on the server, with a lockout after 5 wrong tries.
- The README section [What's real and what's simulated](../README.md#-whats-real-and-whats-simulated) lists every mocked part.
