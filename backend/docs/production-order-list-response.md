# Production order list responses

`GET /production-orders/finished-products` and
`GET /production-orders/semi-finished-products` return lightweight lot lists.
Their item-code filters, ordering and existing access scope remain unchanged.
No pagination is introduced.

The list response contains lot identifiers, description, status, planned quantity,
unit, creation/start/manufacture/expiry dates, item code/name/unit, four document
handover timestamps and `pyclm.isSent`. The latter uses the latest sampling
request with the same `sent_at` ordering as the detail response. An absent
request produces `false`; absent document control remains `null`.

The Prisma query selects these fields directly. It does not load production
specifications, registrations, specification/feature snapshots, sampling records,
sampling request documents or user profiles. The raw sampling request is not
included in the response.

Reviewed consumers:

- Semi-finished and finished lot sidebars: display, search and grouping by date.
- Production order overview: status, manufacture/expiry dates, PYCLM and all four
  document handover indicators.
- Finished product output chart: planned quantity and report dates, including
  `start_date` as a fallback.
- Post-secondary packaging summary form: lot selection by product, lot number
  and production order code.

`GET /production-orders/:id` keeps the full detail response. The generic
`GET /production-orders` endpoint is unchanged because other reports and forms
also consume it. Frontend list fetchers use `ProductionOrderListItem` to make the
compact response contract explicit.
