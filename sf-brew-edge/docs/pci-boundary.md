# PCI Boundary

Plain-English rule: this cockpit is **not** a payment app and must stay outside card-data scope.

## Prohibited data
- PAN
- CVV
- Magstripe / track data
- PIN / PIN block
- Token secrets

## Allowed payment-safe references
- external_transaction_id
- processor_name
- payment_status
- amount_authorized
- amount_captured
- tip_amount
- last4 (processor-supplied only)
- card_brand (processor-supplied only)
- created_at

## Future approach
Use semi-integrated terminals where card capture stays in processor-managed flows.
