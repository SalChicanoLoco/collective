# Santa Fe Brew Edge — Taproom Cockpit
POS-adjacent edge cockpit demo for taproom operators. No payment processing and no raw card data handling.
## Run
npm install
npm run dev
npm run build
## Android/Samsung demo
Use mobile browser, open localhost from dev machine tunnel, keep phone-width viewport and bottom nav.
## Mocked
All telemetry, events, promos, and AI recommendations are local deterministic rules.
## PCI-safe
Only reference fields (external_transaction_id, processor_name, payment_status, amount_authorized, amount_captured, tip_amount, optional last4/card_brand, created_at).
Never connect raw PAN/CVV/track/PIN/token secrets.
## 90-second Brian demo script
1. Open Cockpit: “This is not replacing your payment system today. This is an edge layer that gives managers visibility without touching raw card data.”
2. Open Intake: “We run intake sessions with managers and staff. The app compiles around actual brewery pain points instead of forcing your staff into generic POS workflows.”
3. Select pain points: Rush line friction, Keg/tap changes, Manager visibility, PCI/payment risk.
4. Compile: “Now the cockpit shifts priorities: staff mode, keg protection, rush simplification, manager reporting, and PCI boundary.”
5. Open Staff: “During a rush, staff need one-tap signals, not admin software.”
6. Open AI Trigger Engine: “The AI layer does not autonomously change pricing; it suggests manager-approved moves.”
7. Close: “The first paid step is an audit and intake sprint. Then we wire this to real data safely.”
