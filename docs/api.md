# ClearDrop API

This file documents the Phase 1 implementation and the versioned REST contract for later phases. The current local application is PHP/SQLite and exposes the implemented endpoints as small PHP scripts. Paths beginning `/api/v1` are the target contract and do not imply that later-phase handlers already exist. The complete route inventory, roles, and ER diagram are in [system-design.md](./system-design.md).

## Conventions

- JSON request and response bodies; UTF-8; no-store responses for account/catalog data.
- The Phase 1 implementation uses a PHP session cookie. The planned API retains session auth for the local deployment; deployments that need distributed services can introduce short-lived access tokens with refresh rotation as a separately reviewed change.
- Money is integer Philippine peso cents, e.g. `350000` means PHP 3,500.00. PHP backend calculations use integer cents.
- BOM quantities are integer thousandths of the component's unit: `2000` means two pieces; `500` means 0.5 kg.
- Admin-only writes are checked server-side. Hiding a form in the browser is not authorization.
- Current catalog errors include the compatibility `message` field plus an `error` object. The target `/api/v1` error envelope is:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request is invalid.",
    "details": [{"field": "sku", "message": "Already in use."}]
  }
}
```

- Target list responses include `data` and `pagination: {page, pageSize, total}`. Page size is capped at 100. Phase 1 catalog responses are small seeded lists and are not paginated.

## Phase 1 implemented endpoints

### Authentication — `auth.php`

| HTTP | Request | Result |
|---|---|---|
| `GET auth.php?action=status` | No body | `200 {"authenticated":false}` or current username, display name, and database-resolved role |
| `GET auth.php?action=google_config` | No body | `200 {"enabled":false}` or configured public client ID and a session-bound nonce |
| `POST auth.php` | `{"action":"login","username":"clearadmin","password":"stock123"}` | `200 {"authenticated":true,"username":"clearadmin","displayName":"ClearDrop Demo Admin","role":"admin"}` |
| `POST auth.php` | `{"action":"google_login","credential":"<Google ID token>"}` | Verifies the Google RS256 signature and issuer, audience, expiry, verified email, and one-time session nonce before signing in |
| `POST auth.php` | `{"action":"logout"}` | Clears session and cookie; `200 {"authenticated":false}` |

Invalid credentials or Google identity tokens return `401`; malformed JSON/action returns `400`; unsupported methods return `405`. Google identities are associated by Google's stable subject ID only, and newly created accounts receive the Customer role. Email matches do not auto-link existing accounts. Password hashes are stored using PHP's password hashing API. Demo credentials are for local classroom use only.

Google sign-in requires `GOOGLE_CLIENT_ID` configured for a Google OAuth Web application client, with the app's exact origin allowlisted. Google controls its own 2-Step Verification prompts; ClearDrop does not receive or store Google codes. See the Google sign-in setup in [README.md](../README.md#enable-google-sign-in).

### Catalog, BOM, and accounts — `catalog-api.php`

| HTTP | Request | Permission | Result |
|---|---|---|---|
| `GET catalog-api.php?action=catalog` | No body | Any authenticated role | `{products:[...],components:[...]}` with current BOM version and estimate fields |
| `GET catalog-api.php?action=users` | No body | Admin | Active and deactivated user records, without password hashes |
| `POST catalog-api.php` | `save_product` | Admin | Creates/updates product master data, estimate, price, or active state |
| `POST catalog-api.php` | `save_component` | Admin | Creates/updates component master data, estimated cost, reorder threshold, and orderable state; does not adjust stock |
| `POST catalog-api.php` | `save_bom` | Admin | Validates and creates an immutable next BOM version in a transaction |
| `POST catalog-api.php` | `create_user` | Admin | Creates an account with a password hash and one seeded role |
| `POST catalog-api.php` | `update_user_role` | Admin, not self | Changes an account role and audits the old and new roles |
| `POST catalog-api.php` | `deactivate_user` | Admin, not self | Soft-deactivates an account; historical records remain |

Example new product:

```json
{
  "action": "save_product",
  "sku": "CD-UNIT-002",
  "name": "ClearDrop Gravity Filter Unit",
  "productType": "finished_good",
  "description": "Prototype revision; estimates require validation.",
  "salePriceCents": 350000,
  "estimatedCostCents": 275000,
  "costIsEstimate": true,
  "active": true
}
```

Example BOM revision:

```json
{
  "action": "save_bom",
  "productId": 1,
  "notes": "Prototype revision: validate media weights",
  "items": [
    {"componentId": 5, "quantityMilli": 2000},
    {"componentId": 4, "quantityMilli": 1000}
  ]
}
```

Successful BOM creation returns `201 {"message":"A new BOM version was created.","version":2,"productId":1}`. Repeated component IDs, invalid/nonpositive quantities, a missing product, inactive components, and non-admin attempts are rejected before a new version is written.

### Existing ordering-demo API — `inventory-api.php`

`GET inventory-api.php?action=dashboard` returns the orderable component subset, the signed-in user's basket and orders, and the current role. The following POST actions preserve the existing classroom order flow:

- `cart_add` with a component `code`
- `cart_remove` with `materialId`
- `restock` with `materialId` and positive integer `quantity` (Admin demo account only)
- `checkout` with `customerName` and `contact`
- `order_status` with `orderId` and an allowed next `status`

These operations are intentionally not represented as the manufacturing inventory API. Phase 2 will route stock changes through the append-only ledger instead of treating a customer-facing reservation as a manufacturing stock movement.

## Versioned REST target by module

The endpoint list in [system-design.md](./system-design.md#3-api-contract-and-endpoint-inventory) is grouped by phase and role. The stable public prefix is `/api/v1`; JSON body fields use camelCase at the HTTP boundary and normalized database columns use snake_case. Responses must not expose password hashes, internal session IDs, or private survey notes outside authorized roles.

Target order creation requires an `Idempotency-Key` request header. It validates customer scope, order type, channel, item snapshots, reserved/available finished stock, and payment terms in one transaction. A bulk order may be confirmed with a shortfall only after an authorized user chooses to create the linked production order. Delivery quantities cannot exceed the undelivered order quantity.

Target inventory and production writes are transactions: a production completion checks BOM version and QC-passed FIFO lots, creates all component-consumption and output ledger entries, updates inventory projections, and assigns unique serials together or rolls back entirely. A stock adjustment requires a reason and creates a ledger movement; no API permits direct setting of stock quantity.
