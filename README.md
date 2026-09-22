# Yoyiyo

Predictive travel timing for humans — not another price or itinerary bot.

## The idea

Most travel apps predict **fares** or generate **generic day plans**. Yoyiyo predicts **when an experience will fit you**: energy, jet lag, light, crowds, regret weight, and the chance you’ll abandon the stop (**drift risk**).

That stack is the **Kairos / Temporal Fit Engine** — the product’s unique algorithm.

## MVP flow

1. Travel DNA (chronotype, pace, crowds, priorities, walking, fatigue)
2. Trip setup (destination, length, arrival hour, home timezone)
3. Day-by-day forecast with Kairos scores, energy curve, and drift warnings

Seed destinations: Lisbon, Tokyo, Florence.

## Stack

- Expo SDK 57 + Expo Router (`src/app`)
- TypeScript
- Reanimated motion
- EAS-ready (`eas.json`) for App Store & Google Play

## Commands

```bash
npm install
npm start          # Expo dev server
npm run web        # Web preview
npm test           # Algorithm unit tests
npm run typecheck
```

## Store path

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform all
```

Bundle IDs: `app.yoyiyo.travel`
