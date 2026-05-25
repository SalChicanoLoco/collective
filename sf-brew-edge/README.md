# Santa Fe Brew Edge — Taproom Cockpit

A mobile-first, POS-adjacent taproom cockpit for demo and intake workshops. This app is intentionally offline-capable and uses local deterministic rules (no backend, no external AI API).

## Run
```bash
npm install
npm run dev
npm run build
```

## Android / Samsung demo flow
1. Start `npm run dev` on laptop.
2. Open the dev URL on your Samsung/Android browser.
3. Keep phone-width layout and use bottom nav tabs.

## What is mocked
- Tap/keg telemetry
- Ops events
- Trigger recommendations
- Copilot recommendations (local rules engine)

## PCI-safe boundary
This app must **never** process raw cardholder data. Allowed payment-safe references only:
- external_transaction_id
- processor_name
- payment_status
- amount_authorized
- amount_captured
- tip_amount
- last4 (if compliant processor supplies it)
- card_brand (if compliant processor supplies it)
- created_at

Never store/request PAN, CVV, magstripe/track data, PIN data, or token secrets.

## 90-second Brian demo script
1. Open Cockpit: “This is not replacing your payment system today. This is an edge layer that gives managers visibility without touching raw card data.”
2. Open Intake: “We run intake sessions with managers and staff. The app compiles around actual brewery pain points instead of forcing your staff into generic POS workflows.”
3. Select pain points: Rush line friction, Keg/tap changes, Manager visibility, PCI/payment risk.
4. Compile: “Now the cockpit shifts priorities: staff mode, keg protection, rush simplification, manager reporting, and PCI boundary.”
5. Open Staff: “During a rush, staff need one-tap signals, not admin software.”
6. Open AI Trigger Engine: “The AI layer does not autonomously change pricing. It suggests manager-approved moves only.”
7. Close: “The first paid step is an audit and intake sprint. Then we wire this to real data safely.”

## Next production steps
1. Add POS read-only adapter contract and schema validation.
2. Add deterministic unit tests for compiler/rules/promo guardrails.
3. Add audit logging/export for manager review.
