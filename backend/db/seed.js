require('dotenv').config();
const { supabase, isSupabaseConfigured } = require('./index');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('--- ClearDrop Database Seeder ---');

  if (!isSupabaseConfigured) {
    console.log('[seed] SUPABASE_URL and key are not configured in .env.');
    console.log('[seed] Local SQLite database already has default roles, users, and components seeded.');
    console.log('[seed] To seed Supabase, copy the contents of "backend/db/schema.sql" into the Supabase SQL Editor.');
    return;
  }

  console.log('[seed] Seeding Supabase database at:', process.env.SUPABASE_URL);

  // Hash passwords
  const stockHash = await bcrypt.hash('stock123', 10);
  const dropHash = await bcrypt.hash('drop123', 10);

  // 1. Roles
  const roles = [
    { id: 1, role_key: 'admin', name: 'Admin / Owner', description: 'Full access to inventory, catalog, and users' },
    { id: 2, role_key: 'inventory', name: 'Inventory & Purchasing', description: 'Manages materials and stock' },
    { id: 3, role_key: 'production', name: 'Production / Assembler', description: 'Builds units based on BOM' },
    { id: 4, role_key: 'sales', name: 'Sales & Orders', description: 'Manages orders and customer requests' },
    { id: 5, role_key: 'partner', name: 'Partner / Customer', description: 'Community partner access' },
    { id: 6, role_key: 'distributor', name: 'Community Distributor', description: 'Community distribution hub' },
    { id: 7, role_key: 'customer', name: 'Demo Customer', description: 'Orders filter materials' }
  ];

  const { error: rErr } = await supabase.from('roles').upsert(roles);
  if (rErr) console.warn('[seed] Roles upsert note:', rErr.message);
  else console.log('[seed] Roles seeded successfully.');

  // 2. Demo Users
  const users = [
    { id: 1, username: 'clearadmin', display_name: 'ClearDrop Demo Admin', password_hash: stockHash, role_id: 1, active: 1 },
    { id: 2, username: 'clearinventory', display_name: 'Inventory Specialist', password_hash: stockHash, role_id: 2, active: 1 },
    { id: 3, username: 'clearproduction', display_name: 'Production Assembler', password_hash: stockHash, role_id: 3, active: 1 },
    { id: 4, username: 'clearsales', display_name: 'Sales Coordinator', password_hash: stockHash, role_id: 4, active: 1 },
    { id: 5, username: 'clearpartner', display_name: 'Community Partner', password_hash: stockHash, role_id: 5, active: 1 },
    { id: 6, username: 'cleardistributor', display_name: 'Local Distributor', password_hash: stockHash, role_id: 6, active: 1 },
    { id: 7, username: 'clear2026', display_name: 'Demo Household Customer', password_hash: dropHash, role_id: 7, active: 1 }
  ];

  const { error: uErr } = await supabase.from('users').upsert(users);
  if (uErr) console.warn('[seed] Users upsert note:', uErr.message);
  else console.log('[seed] Users seeded successfully.');

  console.log('[seed] Done! See backend/db/schema.sql for the full initial schema.');
}

seed().catch(console.error);
