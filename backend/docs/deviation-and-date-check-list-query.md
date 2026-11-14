# Deviation and date check list queries

These endpoints support optional server-side search, filters and pagination:

- `GET /production-order-deviations`
- `GET /production-orders/date-checks`

Existing frontend callers require no changes. Without `page` and `limit`, both
endpoints still return arrays with their existing item fields. A search/filter
without pagination also returns an array. Supplying either pagination parameter
returns `{ data, total, page, limit }`, as with the finished/semi-finished lot APIs.

## Common query parameters

| Parameter | Meaning |
| --- | --- |
| `search` | Literal partial search, at most 200 characters and 10 distinct whitespace-separated words. |
| `production_order_id` | Exact positive SAP document ID (32-bit integer). Empty input is ignored, preserving the existing deviation filter behavior. |
| `item_code` | Exact item code on the related production order. |
| `from_date`, `to_date` | Inclusive date bounds in strict `YYYY-MM-DD` format. Either can be omitted. |
| `date_field` | Field to apply the date range to; defaults to `created_at`. Allowed fields differ by endpoint below. |
| `page` | Integer 1–1,000,000. Defaults to 1 when only `limit` is supplied. |
| `limit` | Integer 1–200. Defaults to 50 when only `page` is supplied. |

Inputs are validated and transformed at the controller. Invalid supported values,
too many search words and reversed date ranges return HTTP 400. Unknown query
parameters are stripped. Date bounds use midnight UTC through exclusive midnight
of the day after `to_date`, matching the lot list API's date range convention.

All filters combine with AND. Search is applied in the database before pagination;
each word must match at least one searchable field, and words can match different
fields in any order. Input is trimmed and normalized to Unicode NFC; duplicate
words are ignored. `%`, `_` and backslash are literal characters, not SQL LIKE
wildcards. Prisma parameterizes search values. Use `URLSearchParams` to encode
query values, including Vietnamese text and `%`, `+`, `&` characters.

Case/accent comparison for stored text follows MySQL column collation
(`utf8mb4_unicode_ci` in the repository migrations). No fuzzy matching is added.
Dates are searched through the date filters rather than formatted display strings.

Both lists use `created_at DESC, id DESC` for stable pagination. `total` counts
matching records before pagination, using the same filters and access scope as
`data`. Page and count reads share a repeatable-read transaction. An out-of-range
page returns an empty `data` array with the matching total. Requests without
pagination do not run a count query.

## Deviations

Additional exact filters: `reporter_id`, `approver_id` (positive 32-bit integers),
`cause_classification`. `date_field` accepts `created_at` or `updated_at`.

Searchable fields:

- Deviation content, handling plan/result, cause and cause classification.
- Related lot number, production order code, item code, product description/name.
- Reporter/approver name, username and email.
- Numeric words additionally match the exact deviation ID or production order ID.

Soft-deleted deviations are always excluded, including from `total`. Images retain
their authenticated paths and existing `deviation_images`/`deviation_image` fields.
The existing production order existence/access check is preserved when filtering
by `production_order_id`; a missing or inaccessible order still returns HTTP 404.

```text
GET /production-order-deviations?search=aspirin%20001&page=1&limit=20
GET /production-order-deviations?production_order_id=2031&reporter_id=7
GET /production-order-deviations?date_field=updated_at&from_date=2026-11-01&to_date=2026-11-14&page=1
```

## Date printing checks

Additional filters:

| Parameter | Meaning |
| --- | --- |
| `approval_status` | Exactly `pending`, `approved` or `rejected`. |
| `package_type` | Exact stored package code, e.g. `goi`, `lo`, `chai`, `hop`, `thung`, `ong_be`, `tui_nhom`, `tuyp`. |
| `created_by_id`, `approved_by_id` | Exact positive 32-bit user IDs. |
| `has_images` | Exactly `true` or `false`; filters whether the check has uploaded images. |

`date_field` accepts `created_at`, `updated_at`, `checked_at` or `approved_at`.

Search covers package type, approval status, related lot/order/product fields,
creator/approver name, username and email. Numeric words additionally match the
exact check ID or production order ID. Vietnamese package and status labels are
also supported, with or without accents: for example `túi nhôm`, `tui nhom`,
`Đã duyệt`, `da duyet`, `Chờ duyệt`, `Từ chối`. These words follow the same AND
semantics as other search terms. Use exact filters for unambiguous status selection.
File paths, formatted dates and latest-image uploader names are not search fields.

The existing last-upload metadata (`last_image_uploaded_at`,
`last_image_uploaded_by`) is preserved. Upload metadata queries only load IDs in
the resulting page. The per-production-order detail endpoint
`GET /production-orders/:id/date-checks` is unchanged.

```text
GET /production-orders/date-checks?search=aspirin%20001&page=1&limit=20
GET /production-orders/date-checks?approval_status=pending&package_type=hop&has_images=true&page=1
GET /production-orders/date-checks?production_order_id=2031&date_field=checked_at&from_date=2026-11-01
```
