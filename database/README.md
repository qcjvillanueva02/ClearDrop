# ClearDrop Database Directory

This directory contains database schemas, migrations, and local storage engines for the ClearDrop system.

## Files

- `schema.sql`: Complete Supabase PostgreSQL schema with all 10 tables, roles, and initial seed data. Copy-paste this into the Supabase SQL Editor.
- `postgres-schema.sql`: Reference PostgreSQL schema specification.
- `cleardrop.sqlite`: Local SQLite database file for offline/local testing.

## Tables

1. `roles`: Role definitions (admin, inventory, production, sales, partner, distributor, customer)
2. `users`: User authentication records with bcrypt password hashes
3. `components`: Filter materials, replacement parts, and raw media stock
4. `products`: Finished goods and replacement cartridge catalog
5. `bom_versions`: Immutable product bill of materials revisions
6. `bom_items`: Component quantities (thousandths/milli) per BOM version
7. `audit_logs`: Audit trail for catalog and security events
8. `orders`: Customer orders and fulfillment status
9. `order_items`: Order line items with historical snapshot pricing
10. `order_reservations`: Real-time stock reservations in customer shopping baskets
