# ClearDrop — Gravity Water Filter Ordering & Inventory System

ClearDrop is an electricity-free, flood-ready household gravity water filter ordering and inventory system.

This project is organized into a modern full-stack architecture:
- **`frontend/`**: React + Vite single-page application with PWA mobile support
- **`backend/`**: Node.js + Express API server with JWT authentication and self-ping keep-alive
- **`database`**: PostgreSQL schema with Supabase cloud compatibility and local SQLite fallback

---

## 🚀 Free Tier Deployment Guide

You can deploy the complete system for **100% free** using:
- **Database**: [Supabase](https://supabase.com) (Free PostgreSQL tier)
- **Backend API**: [Render](https://render.com) (Free Web Service with 24/7 keep-alive)
- **Frontend App**: [Vercel](https://vercel.com) (Free React hosting with edge CDN)

```
┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
│    React Frontend    │  HTTP   │    Node.js Server    │  SQL    │       Supabase       │
│    (Hosted Vercel)   │ ──────> │    (Hosted Render)   │ ──────> │ (PostgreSQL Database)│
└──────────────────────┘         └──────────────────────┘         └──────────────────────┘
            │                                ▲
            │                                │  Keep-Alive Cron
            └────────────────────────────────┴── (Self-ping every 14 mins)
```

---

### Step 1: Set Up Supabase Database (Free)

1. Sign up or log in at **[supabase.com](https://supabase.com)**.
2. Click **"New project"**, choose an organization, give it a name (e.g. `cleardrop-db`), set a database password, and choose your preferred region.
3. Once the database is provisioned (approx. 1-2 minutes):
   - In the left sidebar, click **"SQL Editor"**.
   - Click **"New query"**.
   - Open [`backend/db/schema.sql`](file:///c:/Users/clark/Downloads/Lost%20and%20Found/backend/db/schema.sql) in this repo, copy its contents, paste them into the SQL Editor, and click **"Run"**.
   - This creates all 10 tables, sets up roles, inserts 14 inventory components, 2 products, BOM versions, and demo user accounts.
4. Go to **Project Settings** (gear icon) &rarr; **API**:
   - Copy the **Project URL** (`https://<project-ref>.supabase.co`).
   - Copy the **`service_role` secret key** (under Project API keys).

---

### Step 2: Deploy Backend to Render (Free)

1. Sign up or log in at **[render.com](https://render.com)**.
2. Click **"New +"** &rarr; **"Web Service"**.
3. Connect your GitHub repository (`Lost-and-Found` or `ClearDrop`).
4. Configure the service settings:
   - **Name**: `cleardrop-api`
   - **Region**: Choose the closest region to your Supabase database
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. In **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `<your-supabase-service-role-key>` |
   | `JWT_SECRET` | Any random 32+ character string (e.g. `cleardrop-jwt-secret-key-2026-production`) |
   | `FRONTEND_URL` | `https://<your-app>.vercel.app` (or `*` during initial testing) |
6. Click **"Deploy Web Service"**.
7. Once deployed, copy your Render URL: e.g. `https://cleardrop-api.onrender.com`.
8. Verify it by opening `https://cleardrop-api.onrender.com/api/health` in your browser.

> [!NOTE]
> **24/7 Keep-Alive Automation:** Render free-tier services normally spin down after 15 minutes of inactivity. ClearDrop has a built-in cron job in [`backend/cron/keepAlive.js`](file:///c:/Users/clark/Downloads/Lost%20and%20Found/backend/cron/keepAlive.js) that pings `/api/health` every 14 minutes, keeping your server awake 24/7 at no cost.
> Additionally, this repo includes a GitHub Actions scheduled workflow at [`.github/workflows/keepalive.yml`](file:///c:/Users/clark/Downloads/Lost%20and%20Found/.github/workflows/keepalive.yml) as an external fallback.

---

### Step 3: Deploy Frontend to Vercel (Free)

1. Sign up or log in at **[vercel.com](https://vercel.com)**.
2. Click **"Add New…"** &rarr; **"Project"**.
3. Import your GitHub repository.
4. In the configuration screen:
   - **Root Directory**: Click **Edit** and select `frontend`.
   - **Framework Preset**: `Vite` (automatically detected).
5. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://cleardrop-api.onrender.com/api` (your Render URL + `/api`) |
6. Click **"Deploy"**.
7. Your app is live! Open the generated Vercel URL on your mobile phone or desktop.

---

## 📱 Mobile Phone Access & PWA Support

1. Open your live Vercel URL on your phone's browser (Safari on iOS or Chrome on Android).
2. Tap the browser share / menu button and choose **"Add to Home Screen"**.
3. ClearDrop will install as an app with its water-drop icon, running in full-screen standalone mode.
4. You can use your phone camera to scan material QR labels directly into your ordering basket!

---

## 💻 Local Development

### 1. Run the Backend API Server

```powershell
cd backend
npm install
npm start
```
The API server starts on `http://localhost:3001`.
*If Supabase environment variables are omitted, the backend automatically uses the local `cleardrop.sqlite` database!*

### 2. Run the React Frontend

```powershell
cd frontend
npm install
npm run dev
```
The frontend dev server opens on `http://localhost:5173`.

---

## 🔑 Demo Login Accounts

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Stock Manager / Admin** | `clearadmin` | `stock123` | Full stock management, restock orders, catalog, BOM, order status |
| **Household Customer** | `clear2026` | `drop123` | Reserve materials, scan QR codes, place orders, view personal order history |
| Inventory Staff | `clearinventory` | `stock123` | Inventory viewing and updates |
| Production Assembler | `clearproduction` | `stock123` | Assembly and BOM review |
| Sales Coordinator | `clearsales` | `stock123` | Order review and tracking |
| Community Partner | `clearpartner` | `stock123` | Partner ordering portal |
| Local Distributor | `cleardistributor` | `stock123` | Distribution hub management |

---

## 🧪 Testing

Run frontend production build verification:
```powershell
cd frontend
npm run build
```

Run backend health check and integration tests:
```powershell
cd backend
npm test
```
