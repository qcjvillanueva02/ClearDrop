# ClearDrop Ordering & Inventory System

ClearDrop is an electricity-free, flood-ready household gravity water filter ordering and inventory system.

## Access on Mobile Phone via GitHub Pages

This system is configured to work directly on mobile devices (smartphones, tablets) and desktops via **GitHub Pages**.

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Update ClearDrop system, enable mobile access and GitHub Pages"
   git push origin master
   ```
2. In your GitHub repository:
   - Go to **Settings** &rarr; **Pages**.
   - Under **Build and deployment** &rarr; **Source**, select **GitHub Actions** (or deploy directly from branch `master` / `/root`).
3. Visit the generated GitHub Pages URL on your phone:
   `https://<username>.github.io/<repository>/`
4. On your mobile phone, you can also select **"Add to Home Screen"** in Safari or Chrome to use ClearDrop as a full-screen mobile web app!

### Standalone Live Demo Mode
When accessed via GitHub Pages or static preview, ClearDrop runs in **Live Demo Mode** powered by an in-browser storage engine:
- Full demo login with customer and staff roles
- Material ordering, stock decrement, basket management, and checkout
- Admin tools: restock inventory, edit products and components, new BOM versions, user account management
- All data is saved in your device's storage and persists across refreshes

---

## Run Locally with PHP

Requirements: PHP 8.0+ with `pdo_sqlite` and `openssl` enabled (configured in `php.ini`).

```powershell
php -S 127.0.0.1:8000
```

Open <http://127.0.0.1:8000/index.html> in your browser. The SQLite database is automatically initialized and seeded at `cleardrop.sqlite`.

### Enable Google Sign-In (Optional)

Google sign-in uses Google OAuth Web Application credentials. Configure your authorized origin (`http://127.0.0.1:8000`) and set the environment variable:

```powershell
$env:GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com"
php -S 127.0.0.1:8000
```

---

## Run with Docker Compose

```powershell
docker compose up --build
```

Open <http://127.0.0.1:8000/index.html>.

---

## Demo Accounts

| Role | Username | Password |
|---|---|---|
| Admin / Owner | `clearadmin` | `stock123` |
| Inventory & Purchasing | `clearinventory` | `inventory123` |
| Production / Assembler | `clearproduction` | `production123` |
| Sales & Orders | `clearsales` | `sales123` |
| Partner / Customer | `clearpartner` | `partner123` |
| Community Distributor | `cleardistributor` | `distributor123` |
| Demo Customer | `clear2026` | `drop123` |

---

## System Checks

Run the Phase 1 catalog and security checks:

```powershell
php tests/phase1-catalog.php
php tests/google-oidc.php
node --check cleardrop-api.js
node --check script.js
node --check catalog.js
node --check google-auth.js
```
