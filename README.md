# Caliphate Rides

One React Native (Expo) app for Sokoto, for riders and drivers both:
- **Riding:** book a keke or car, see the fare up front (**distance × price per km**, ₦500 by default, set from the admin dashboard), and track your driver live.
- **Driving:** sign up with a keke or car, keep your licence and papers up to date on an official record, take trips and get paid.

Light and dark themes and an animated splash screen.

## Riding and driving in one app

Everyone signs in the same way (phone number and SMS code, then their name). The first time, they choose **Ride** or **Drive**. They can switch any time from **Account**:
- Riders: **Drive with Caliphate Rides**
- Drivers: **Switch to riding**

The app remembers the choice on the phone. Switching is blocked during an active ride or trip, and drivers go offline when they switch to riding.

Rider screens are in `app/(tabs)` and `app/ride`. Driver screens are in `app/driver`; their record and driving state only load in driver mode. The rules for which screens are open are in `app/_layout.tsx` (signed in, named, ride or drive) and `app/driver/_layout.tsx` (sign-up, review, approved).

Built on **Expo SDK 57** (React Native 0.86, React 19.2, TypeScript 6).

## Run it on your phone

1. Install **Node.js 20.19.4 or newer** (22 LTS recommended) on your computer.
2. In this folder:
   ```bash
   npm install
   npx expo install --fix        # confirms every package matches SDK 57
   npx expo-doctor@latest        # checks the project for problems
   cp .env.example .env
   npx expo start
   ```
3. Open it in **Expo Go** (scan the QR code). Our map works there: Expo Go draws it in a web view. For the smoothest map, use a development build (below).

### Development build (recommended)

A development build is your own copy of the app with all its native code, including MapLibre's native map engine, which is faster than the web view Expo Go uses. The project already includes `expo-dev-client`. Build it once, then `npx expo start` reloads your code changes instantly, like Expo Go. Rebuild only after adding a package with native code.

```bash
npm run build:android    # builds and installs on a connected Android phone or emulator (needs Android Studio)
npm run build:ios        # needs a Mac with Xcode 26.4+
```

Or build in the cloud without Android Studio or Xcode: `npx eas-cli@latest build --profile development --platform android`.

The app starts in **sample mode** (`EXPO_PUBLIC_USE_MOCK=true`). Any 6-digit code signs you in, a sample driver accepts your ride, drives to you, and then drives the trip, so you can see the whole flow without a server. If you're outside Sokoto, sample mode moves Sokoto's places around you (see below).

## How fares work

```
fare = distance in km (rounded to 0.1 km) × price per km
```

- The price per km comes from the server (`GET /config/pricing`), which the admin edits. The default is ₦500.
- The admin can also give **Keke** and **Car** their own price per km. When a ride type has none, it uses the main price.
- The app fetches the latest price every time a rider opens the fare screen, so admin changes apply to the next booking.
- The confirm screen shows the sum (e.g. `4.2 km × ₦500 per km = ₦2,100`) so riders can see how the fare was worked out.
- The **backend** computes the fare that is charged. The app uses the same rule (`src/lib/pricing.ts`) only to show it.

## Trying it outside Sokoto

In sample mode, if your phone is outside Sokoto, the app moves Sokoto's places (Babbar Kasuwa, UDUS, the airport and the rest) around your real location. You see your own streets on the map, with the Sokoto landmarks laid out at the same distances from each other, so fares look the same as in Sokoto. Set `EXPO_PUBLIC_DEMO_AT_MY_LOCATION=false` in `.env` to show Sokoto itself instead. Real mode never moves anything.

## Payments: in the app or directly to the driver

| How the rider pays | Where | Confirmed by |
| --- | --- | --- |
| Wallet | In the app | Taken automatically when the trip ends |
| Card | In the app (Paystack) | Paystack, when the rider pays at the end |
| Cash | Directly to the driver | The driver taps "Cash received" |
| Bank transfer | Directly to the driver's account (shown to the rider with a copy button) | The driver taps "Transfer received" |

Riders choose on the fare screen and can switch at the end of the trip. Every trip ends with a payment record either way.

## What's in the app

| Screen | File |
| --- | --- |
| Animated splash (Arewa knot draws itself, then a circle reveal) | `src/components/AnimatedSplash.tsx` |
| Phone number → SMS code → name | `app/(auth)/`, `app/name.tsx` |
| Which screens are open when signed out / without a name / signed in | `app/_layout.tsx` (protected routes) |
| Home: map, "Where are you going?", Home/Work, popular Sokoto places | `app/(tabs)/index.tsx` |
| Search places, or drop a pin for a house with no address | `app/ride/search.tsx`, `app/ride/pin.tsx` |
| Fare and ride type (Keke / Car), cash or wallet | `app/ride/confirm.tsx` |
| Live tracking: finding a driver → driver on the way → arrived → on trip, with share trip and safety (112) | `app/ride/track.tsx` |
| Trip complete, fare breakdown and rating | `app/ride/complete.tsx` |
| Activity, Wallet (Paystack top-up), Account (theme, saved places, log out) | `app/(tabs)/` |

## Driver mode: what a driver goes through

1. **Sign in** like everyone else, then choose **Drive** (or switch from Account).
2. **Sign up** in 7 steps. Each step saves as they go, so they can stop and come back.
   1. Keke or car, and whether they own it
   2. About you: full name, date of birth, gender, home address, LGA (all 23 Sokoto LGAs), NIN, email (optional)
   3. Vehicle details: make, model, year, colour, plate number (checked against the ABC 123 XY format)
   4. Documents and photos (camera or gallery):
      - Driver's licence, front and back, with licence number and expiry
      - Profile photo
      - Vehicle photo showing the plate
      - Vehicle licence, with expiry
      - Proof of ownership, or the owner's letter
      - Insurance certificate, with policy number and expiry
      - Roadworthiness certificate (cars), with expiry
      - Keke operating permit (optional)
   5. Guarantor: name, phone, relationship, address
   6. Bank account for payouts and for riders who pay by transfer
   7. Check everything, agree to the declaration and sign by typing their name
3. **Under review:** a status screen with their record number, documents and history. They can't drive yet.
4. **Approved:** the Drive, Earnings, Documents and Account tabs open.

In sample mode, the review screen has buttons to **approve** the driver or **ask for a change**. In the real system, your team does this from the admin dashboard.

## The official driver record

Every driver gets a record number (`CR-DRV-2026-123456`). The record keeps:
- every detail they entered, plus the signed declaration with name and time
- **every version** of every document. A renewed licence is added and the old one stays, so you can see what was valid on any date.
- a dated **history**: started, submitted, approved, changes requested, licence updated, and who did each one

Drivers see it under **Account → Official driver record**. The admin dashboard will show the same record.

## Licence and document updates

- The Documents tab shows each document's status: approved, being checked, expires in N days, or expired.
- The app warns drivers **30 days before** a document expires, on the Drive tab and in Documents.
- **Update** uploads the renewed document. It goes back to review, and the driver keeps driving until the old one expires.
- If the licence, vehicle licence, insurance or roadworthiness certificate expires without an approved replacement, the driver **can't go online**. If they're online when it happens, they're taken offline.

The rules (what's required for keke vs car, the minimum age of 18, the 30-day warning) are in `src/driver/config/requirements.ts`.

## Driving and payments

- **Go online** to get requests. Each request shows the fare (km × price per km), how far the pickup is, and how the rider pays. The driver has 20 seconds to accept.
- **Trip steps:** Directions (opens Google Maps or Apple Maps) → I've arrived → Start trip → Complete trip → payment
- **Payment, depending on how the rider pays:**
  - Wallet: paid automatically
  - Card: waits for the rider to pay through Paystack
  - Cash: the driver taps **Cash received**
  - Bank transfer: the app shows the driver's own account, and the driver taps **Transfer received** once the alert arrives
- **Earnings** splits money paid in the app (paid out to the driver's bank) from money collected directly (cash and transfers), for today and this week.

In sample mode, a sample rider sends a request about 6 seconds after you go online. If you're outside Sokoto, Sokoto's places are moved around you, the same as when riding.

Location is shared while the app is open. Sharing it with the screen off needs a background task in a development build; that comes with the backend.

## Backend contract: driver side

Sign-in is shared with riders; one account can ride and drive.

**Driver record**

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/drivers/me/application` | | `{ application }` |
| PUT | `/drivers/me/application` | personal, vehicle, guarantor, bank, vehicleType | `{ application }` |
| POST | `/drivers/me/documents` | multipart: `kind`, `number?`, `expiry?`, `files[]` | `{ application }` (adds a version) |
| POST | `/drivers/me/application/submit` | `{ signedName }` | `{ application }` |

**Trips**

| Method | Path | Body |
| --- | --- | --- |
| POST | `/driver/rides/:id/accept` · `/decline` · `/arrived` · `/start` · `/complete` | |
| POST | `/driver/rides/:id/payment-received` | `{ received: true }` |
| GET | `/driver/earnings` | → `{ trips }` |

**Socket.IO** (`auth: { token }`)

- App sends `driver:online { online, vehicleType }`
- App sends `driver:position { location, heading, at }` every few seconds while online
- Server sends `ride:request`, `ride:cancelled { rideId }` and `ride:paid { rideId }`

Shapes are in `src/driver/types.ts`.

## Change the brand

- Name, tagline, support number: `src/config/brand.ts` and `app.config.ts`
- Colours, fonts, spacing: `src/theme/tokens.ts` (light and dark palettes)
- Map design (roads, water, parks, labels, place colours, light and dark): `src/map/style.ts`
- Popular places in Sokoto (30 landmarks with coordinates): `src/data/landmarks.ts`

## Connecting the backend (next step)

Set `EXPO_PUBLIC_USE_MOCK=false` and `EXPO_PUBLIC_API_URL` in `.env`. The app expects:

**REST** (JSON, `Authorization: Bearer <token>`)

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/auth/otp/request` | `{ phone }` | `{ expiresIn }` |
| POST | `/auth/otp/verify` | `{ phone, code }` | `{ token, user, isNewUser }` |
| GET | `/me` | | `{ user }` |
| PATCH | `/me` | `{ name }` | `{ user }` |
| GET | `/config/pricing` | | `{ currency, ratePerKm, rideTypes[] }` |
| POST | `/rides/quote` | `{ pickup, destination }` | `{ quotes[] }` |
| POST | `/rides` | `{ pickup, destination, rideType, paymentMethod }` | `{ ride }` |
| POST | `/rides/:id/cancel` | `{ reason? }` | `{ ride }` |
| POST | `/rides/:id/rate` | `{ stars, comment? }` | `{ ok }` |
| GET | `/rides/history` | | `{ trips[] }` |
| GET | `/wallet` | | `{ balance, transactions[] }` |
| POST | `/wallet/topup` | `{ amount }` | `{ authorizationUrl }` (Paystack) |
| PATCH | `/rides/:id/payment` | `{ paymentMethod }` | `{ ride }` |
| POST | `/rides/:id/pay` | | `{ authorizationUrl }` (card, Paystack) |

**Real-time** (Socket.IO, `auth: { token }`)

- App sends `ride:subscribe { rideId }`
- Server sends `ride:updated <Ride>` on every status change: `searching → accepted → arrived → in_progress → completed` (or `cancelled` / `no_drivers`), and again when `paymentStatus` becomes `paid`
- Server sends `driver:position { location, heading, at }` every 3–5 seconds while a driver is assigned

Shapes are in `src/types.ts`; error messages from the server (`{ message }`) are shown to riders as written.

## Our map

The app has its own map. It doesn't use Google Maps or Apple Maps, and needs no map keys.

- **Map:** OpenStreetMap data drawn by [MapLibre](https://maplibre.org) in our own white-and-green style, in light and dark (`src/map/style.ts`). In your own build it uses MapLibre's native engine; in Expo Go the same map is drawn in a web view (`src/components/map/`). Both look the same and the screens don't need to know which one is running. Our 30 Sokoto places are drawn on it in their category colours: markets amber, mosques teal, hospitals red, and so on.
- **Routes:** real road routes from OSRM (`src/services/routing.ts`). They give every trip its distance, time and the green route line. If the routing server can't be reached, the app falls back to an estimate.
- **Search:** our Sokoto places first, then OpenStreetMap places from Photon, limited to the service area (`src/services/places.ts`). Google Places is optional: set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to add it.
- **Servers:** out of the box the app uses free public servers (OpenFreeMap tiles, the OSRM demo server, Photon's public server). They're fine for testing. Before launch, run our own map server (the `caliphate-map-server` folder, with step-by-step instructions) and set the four `EXPO_PUBLIC_MAP_*`, `ROUTING_URL` and `SEARCH_URL` values in `.env`.
- **Credit:** OpenStreetMap's licence requires "© OpenStreetMap contributors" to be shown. MapLibre's small (i) button on the map shows it. Keep it visible.

## Project layout

```
app/(auth)/            phone number and code (everyone)
app/name.tsx           your name (everyone)
app/start.tsx          first time: Ride or Drive
app/(tabs)/            rider: Ride, Activity, Wallet, Account
app/ride/              rider: search, drop a pin, fare, live tracking, trip complete
app/driver/            driver mode
  onboarding/          the 7 sign-up steps
  application.tsx      application status and the official record
  document/[kind].tsx  add or update a document (with version history)
  (tabs)/              Drive, Earnings, Documents, Account
  trip.tsx             pickup → trip → payment
src/components/        shared UI, map (MapLibre), splash, tab bar
src/driver/            driver-only code: requirements, validation, record, trips, forms
src/services/          rider API calls, live tracking, routing, places (sample + real modes)
src/store/             session, ride/drive mode, current ride, saved places
src/lib/               pricing, payments, geo maths, service area, phone formatting
src/map/               our map style (light and dark)
src/theme/             colour tokens, theme provider
assets/                icon, adaptive icon, splash
```
