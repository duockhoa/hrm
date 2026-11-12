# Items list query parameters

Supported endpoints (same query contract):

- `GET /items`
- `GET /items/finished-products`
- `GET /items/semi-finished-products`
- `GET /items/raw-materials`

All routes retain JWT authentication, `items.list` permission and network policy checks.
Responses remain JSON arrays. Existing requests without pagination continue returning all matching items.

| Parameter | Behavior |
| --- | --- |
| `skip` | Non-negative integer offset, maximum 2147483647. With no `top`, page size defaults to 50. |
| `top` | Integer page size, 1–200. With no `skip`, starts at the first record. If both are omitted, no pagination is applied. |
| `search` | Trimmed contains search on `item_code`, `item_name`, `dk_code`; maximum 200 characters. Empty search is ignored. Case/accent matching follows database collation. |
| `codePrefix` | Alphabetical code prefix; trimmed and uppercased. Existing behavior is retained. Empty prefix is ignored. |
| `series` | Up to 100 comma-separated non-negative integer IDs, e.g. `108,109`. Duplicates are removed. |
| `registrationId` | Positive integer registration ID. An unknown ID produces an empty result. |
| `hasRegistration` | Exactly `true` or `false`; filters `registration_id` as non-null or null. |
| `select` | Comma-separated scalar fields from the list below. Only the requested fields are returned; relations must be requested via `expand`. |
| `orderBy` | Comma-separated `field:asc` or `field:desc` using allowed scalar fields. Defaults to `item_code:asc`; appends `item_code:asc` when absent to stabilize paging. |
| `count` | Exactly `true` or `false` (default false). When true, adds `X-Total-Count` containing the filtered total before pagination, including when the page is empty. |
| `expand` | Comma-separated `registration`, `productionSpecification`, or the standalone value `none`. Controls returned relations. |

Allowed scalar fields for `select` and `orderBy`:

`item_code`, `item_name`, `unit`, `dk_code`, `series`, `registration_id`, `created_at`, `update_at`, `deleted_at`.

If neither `select` nor `expand` is present, the existing default relations are retained:
`registration` and `productionSpecification` (including its product line and updater summary).
`expand=none` returns scalar fields only. An explicit `select` does not automatically add `item_code`.
Deleted production specifications continue to be returned as null.

All filters are combined with AND, while IDs within `series` use OR/IN.
Category-specific routes always retain their existing code-prefix restrictions;
additional filters cannot override them. Contradictory filters return no records.
Filters do not bypass existing authorization or network policy.

Unknown params, repeated param keys, nested objects, invalid numbers, invalid booleans and unsupported fields return HTTP 400.
`filter`, `$filter`, `$select` and `$top` are not supported; use the documented parameter names.
This contract applies to list endpoints, not item detail or the Series catalogue endpoints.

Examples:

```http
GET /items?skip=0&top=50&series=108,109&select=item_code,item_name,series&orderBy=item_name:asc&count=true
GET /items?search=Midkid&hasRegistration=false&top=20&expand=none
GET /items/finished-products?registrationId=12&select=item_code,item_name&expand=registration
GET /items/semi-finished-products?skip=50&count=true
```

Clients can read the total with `response.headers['x-total-count']`.
`X-Total-Count` is exposed through the application's CORS configuration.
Offset pagination reflects the data at request time; a later SAP sync can change subsequent pages.

The `(series, item_code)` database index supports Series filtering and code-ordered lookups.
