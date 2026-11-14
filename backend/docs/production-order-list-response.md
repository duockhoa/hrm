# Production order list responses

`GET /production-orders/finished-products` and
`GET /production-orders/semi-finished-products` return lightweight lot lists.
Their item-code filters, ordering and existing access scope remain unchanged.
Requests without `page` and `limit` continue to return an array, without pagination.
No frontend change is required for existing callers.

## Optional query parameters

Both endpoints accept the same parameters:

| Parameter | Meaning |
| --- | --- |
| `search` | Literal partial search across lot number, production order code, item code, description and item name. Numeric terms additionally match the exact document ID. Maximum 200 characters and 10 distinct words. |
| `item_code` | Exact item code, intersected with the endpoint's existing finished/semi-finished restriction. |
| `status` | Exact SAP production order status, for example `boposReleased`. |
| `from_date`, `to_date` | Inclusive calendar date bounds, strictly `YYYY-MM-DD`. Either bound may be omitted. Reversed ranges return HTTP 400. |
| `date_field` | `creation_date` (default), `start_date`, or `date_manufacture`. |
| `page` | Integer from 1 to 1,000,000. Defaults to 1 when only `limit` is supplied. |
| `limit` | Integer from 1 to 200. Defaults to 50 when only `page` is supplied. |

Blank searches are ignored. Search input is trimmed and normalized to Unicode NFC.
Words are separated by whitespace; **every word must match at least one searchable
field**, and different words may match different fields. Word order does not matter.
For example, `search=aspirin%20001` can match an item named Aspirin with lot 001.
Duplicate words are ignored. `%`, `_` and backslash are escaped for SQL LIKE;
they do not broaden a query as wildcards. Search values are parameterized by Prisma.
URL-encode query values (`URLSearchParams` on the frontend), especially `%`, `+`,
`&` and Vietnamese text.

Case and accent comparison follows the MySQL column collation. The repository's
tables use `utf8mb4_unicode_ci`, which supports case/accent-insensitive comparison;
deployments with a different collation need to align it for the same behavior.
The API does not implement fuzzy matching, spelling correction or relevance ranking.
All results remain ordered by document `id` descending, including search results.

DateTime bounds use midnight UTC, consistent with the connector's date-only SAP
conversion; the upper bound is exclusive midnight of the following day.
`date_manufacture` is stored as a string and is compared as an ISO date prefix;
it requires SAP values in `YYYY-MM-DD` or ISO datetime format. Missing values
do not match a date range.

When **either `page` or `limit` is supplied**, the response is:

```json
{ "data": [], "total": 123, "page": 2, "limit": 50 }
```

`total` counts all matching, accessible lots before pagination. A page beyond the
last result has an empty `data` array and retains the matching `total`. Count and
page reads share a repeatable-read transaction. Without pagination parameters,
even a filtered/search request returns the existing array shape. Filters combine
with AND and preserve the user's existing access scope.

Examples:

```text
GET /production-orders/finished-products?search=aspirin%20001&page=1&limit=20
GET /production-orders/semi-finished-products?item_code=BTP001&status=boposReleased
GET /production-orders/finished-products?date_field=start_date&from_date=2026-11-01&to_date=2026-11-14&page=1
```

Invalid supported parameter values return HTTP 400. Unknown query parameters
are stripped, consistent with the controller's whitelist validation.

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
