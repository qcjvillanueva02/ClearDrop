const assert = require('assert');
const db = require('./db');
const { generateToken } = require('./middleware/auth');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('Running ClearDrop backend tests...');

  // 1. Test user lookup
  const user = await db.getUserByUsername('clear2026');
  assert(user, 'User clear2026 should exist');
  assert.strictEqual(user.username, 'clear2026');
  console.log('✔ User lookup passed');

  // 2. Test password verification
  const isMatch = await bcrypt.compare('drop123', user.password_hash);
  assert.strictEqual(isMatch, true, 'drop123 password should match');
  console.log('✔ Password verification passed');

  // 3. Test token generation
  const token = generateToken({ userId: user.id, username: user.username, role: user.role_key });
  assert(token && typeof token === 'string', 'Token should be a signed string');
  console.log('✔ JWT generation passed');

  // 4. Test dashboard query
  const dash = await db.getDashboardData('clear2026', 'customer');
  assert(Array.isArray(dash.materials), 'Materials should be an array');
  assert(dash.materials.length > 0, 'Materials should have items');
  console.log(`✔ Dashboard loaded (${dash.materials.length} materials)`);

  // 5. Test catalog query
  const catalog = await db.getCatalogData(true);
  assert(catalog.products.length > 0, 'Products should exist');
  assert(catalog.components.length > 0, 'Components should exist');
  console.log(`✔ Catalog loaded (${catalog.products.length} products, ${catalog.components.length} components)`);

  console.log('\nAll ClearDrop backend tests passed successfully! 🎉');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
