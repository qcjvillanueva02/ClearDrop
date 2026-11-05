const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

const loginScreen = document.getElementById('loginScreen');
const loginBox = document.getElementById('loginBox');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const mainWebsite = document.getElementById('mainWebsite');
const accountIdDisplay = document.getElementById('accountIdDisplay');
const navLoginBtn = document.getElementById('navLoginBtn');
const accountWrap = document.getElementById('accountWrap');
const navAccountBtn = document.getElementById('navAccountBtn');
const accountDropdown = document.getElementById('accountDropdown');
const loginModalOverlay = document.getElementById('loginModalOverlay');
const loginModalBox = document.getElementById('loginModalBox');
const loginModalForm = document.getElementById('loginModalForm');
const loginModalError = document.getElementById('loginModalError');
const loginModalUser = document.getElementById('loginModalUser');
const loginModalPass = document.getElementById('loginModalPass');
const inventoryGrid = document.getElementById('inventoryGrid');
const dashboardLayout = document.querySelector('.dashboard-layout');
const orderPanel = document.getElementById('orderPanel');
const orderPanelToggle = document.getElementById('orderPanelToggle');
const basketItems = document.getElementById('basketItems');
const checkoutBtn = document.getElementById('checkoutBtn');
const orderMessage = document.getElementById('orderMessage');
const scannerOverlay = document.getElementById('scannerOverlay');
const scannerMessage = document.getElementById('scannerMessage');
const qrVideo = document.getElementById('qrVideo');
let scannerStream = null;
let scannerActive = false;
let scannerBusy = false;
let dashboardData = { materials: [], cart: [], orders: [] };

orderPanelToggle.addEventListener('click', () => {
  const isExpanded = orderPanelToggle.getAttribute('aria-expanded') === 'true';
  orderPanel.classList.toggle('is-collapsed', isExpanded);
  dashboardLayout.classList.toggle('is-panel-collapsed', isExpanded);
  orderPanelToggle.setAttribute('aria-expanded', String(!isExpanded));
  orderPanelToggle.setAttribute('aria-label', isExpanded ? 'Expand material basket' : 'Collapse material basket');
});

async function requestAuth(action, username, password){
  if (window.ClearDropAPI && typeof window.ClearDropAPI.requestAuth === 'function') {
    return window.ClearDropAPI.requestAuth(action, username, password);
  }
  const options = { method: action === 'status' ? 'GET' : 'POST', credentials:'same-origin' };
  if (action !== 'status'){
    options.headers = { 'Content-Type':'application/json' };
    options.body = JSON.stringify(action === 'google_login'
      ? { action, credential:username }
      : { action, username, password });
  }

  const response = await fetch(`auth.php${action === 'status' ? '?action=status' : ''}`, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The login API did not return JSON. Open this site using the PHP server, not a static preview.');
  }
  if (!response.ok) throw new Error(result.message || 'The login request failed.');
  return result;
}

async function requestInventory(action, payload){
  if (window.ClearDropAPI && typeof window.ClearDropAPI.requestInventory === 'function') {
    return window.ClearDropAPI.requestInventory(action, payload);
  }
  const options = { method: payload ? 'POST' : 'GET', credentials:'same-origin' };
  if (payload){
    options.headers = { 'Content-Type':'application/json' };
    options.body = JSON.stringify({ action, ...payload });
  }
  const response = await fetch(`inventory-api.php${payload ? '' : '?action=dashboard'}`, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The inventory API did not return JSON. Run the site with PHP and SQLite enabled.');
  }
  if (!response.ok) throw new Error(result.message || 'The inventory request failed.');
  return result;
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
}

function money(cents){
  return new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' }).format(Number(cents || 0) / 100);
}

function setDashboardMessage(message, isError){
  orderMessage.textContent = message;
  orderMessage.classList.toggle('is-error', Boolean(isError));
  orderMessage.classList.toggle('show', Boolean(message));
}

function renderInventory(){
  const materials = dashboardData.materials || [];
  const lowStockCount = materials.filter(item => Number(item.stock) <= Number(item.low_stock_at)).length;
  const totalUnits = materials.reduce((total, item) => total + Number(item.stock), 0);
  document.getElementById('stockSummary').innerHTML = `
    <div class="summary-tile"><strong>${materials.length}</strong><span>Material types</span></div>
    <div class="summary-tile"><strong>${totalUnits}</strong><span>Available units</span></div>
    <div class="summary-tile ${lowStockCount ? 'is-low' : ''}"><strong>${lowStockCount}</strong><span>Low-stock items</span></div>`;

  if (!materials.length){
    inventoryGrid.innerHTML = '<p class="empty-state">No materials are listed yet.</p>';
    return;
  }

  inventoryGrid.innerHTML = materials.map(item => {
    const stock = Number(item.stock);
    const lowStock = stock <= Number(item.low_stock_at);
    const restockControl = dashboardData.role === 'admin'
      ? `<form class="restock-form" data-material-id="${Number(item.id)}">
          <label for="restock-${Number(item.id)}">Restock</label>
          <input id="restock-${Number(item.id)}" type="number" min="1" max="10000" value="5" required>
          <button type="submit">Update stock</button>
        </form>`
      : '';
    return `
      <article class="material-card ${lowStock ? 'is-low' : ''}">
        <div class="material-card-top">
          <span class="material-kicker">${lowStock ? 'Low stock' : 'In stock'}</span>
          <span class="material-stock">${stock} <small>${escapeHtml(item.unit)}${stock === 1 ? '' : 's'}</small></span>
        </div>
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.description)}</p>
        <div class="material-code"><span>QR MATERIAL CODE</span><code>${escapeHtml(item.code)}</code></div>
        <div class="material-card-bottom">
          <strong>${money(item.price_cents)} <small>/ ${escapeHtml(item.unit)}</small></strong>
          <button type="button" class="btn btn-primary add-material-btn" data-code="${escapeHtml(item.code)}" ${stock < 1 ? 'disabled' : ''}>
            ${stock < 1 ? 'Out of stock' : 'Add 1 to basket'}
          </button>
        </div>
        ${restockControl}
      </article>`;
  }).join('');

  inventoryGrid.querySelectorAll('.add-material-btn').forEach(button => {
    button.addEventListener('click', () => addMaterial(button.dataset.code));
  });
  inventoryGrid.querySelectorAll('.restock-form').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const quantity = Number(form.querySelector('input').value);
      restockMaterial(Number(form.dataset.materialId), quantity);
    });
  });
}

function renderBasket(){
  const cart = dashboardData.cart || [];
  const totalUnits = cart.reduce((total, item) => total + Number(item.quantity), 0);
  const totalCents = cart.reduce((total, item) => total + Number(item.price_cents) * Number(item.quantity), 0);
  document.getElementById('basketCount').textContent = String(totalUnits);
  document.getElementById('basketTotal').textContent = money(totalCents);
  checkoutBtn.disabled = cart.length === 0;

  if (!cart.length){
    basketItems.innerHTML = '<p class="empty-state">Your basket is empty. Add or scan a material to begin.</p>';
    return;
  }

  basketItems.innerHTML = cart.map(item => `
    <div class="basket-line">
      <div><strong>${escapeHtml(item.name)}</strong><span>${Number(item.quantity)} × ${money(item.price_cents)}</span></div>
      <button type="button" class="basket-remove-btn" data-material-id="${Number(item.id)}" aria-label="Remove one ${escapeHtml(item.name)}">−</button>
    </div>`).join('');
  basketItems.querySelectorAll('.basket-remove-btn').forEach(button => {
    button.addEventListener('click', () => removeMaterial(Number(button.dataset.materialId)));
  });
}

function nextStatus(status){
  return { pending:'processing', processing:'ready', ready:'completed' }[status] || '';
}

function renderOrders(){
  const orders = dashboardData.orders || [];
  const ordersList = document.getElementById('ordersList');
  if (!orders.length){
    ordersList.innerHTML = '<p class="empty-state">No orders yet. Materials appear here after checkout.</p>';
    return;
  }

  ordersList.innerHTML = orders.map(order => {
    const items = (order.items || []).map(item =>
      `${Number(item.quantity)} × ${escapeHtml(item.name)}`
    ).join(', ');
    const next = nextStatus(order.status);
    const controls = dashboardData.role === 'admin' && (order.status === 'pending' || order.status === 'processing')
      ? `<div class="order-actions">
          ${next ? `<button type="button" class="order-status-btn" data-order-id="${Number(order.id)}" data-status="${next}">${next === 'processing' ? 'Start preparing' : 'Mark ready'}</button>` : ''}
          <button type="button" class="order-status-btn cancel-order-btn" data-order-id="${Number(order.id)}" data-status="cancelled">Cancel &amp; return stock</button>
        </div>`
      : dashboardData.role === 'admin' && order.status === 'ready'
        ? `<div class="order-actions"><button type="button" class="order-status-btn" data-order-id="${Number(order.id)}" data-status="completed">Mark complete</button></div>`
        : '';
    return `
      <article class="order-card">
        <div class="order-card-head"><strong>Order #${Number(order.id)}${dashboardData.role === 'admin' ? ` · ${escapeHtml(order.username)}` : ''}</strong><span class="order-status status-${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></div>
        <p>${items || 'No items listed'}</p>
        <div class="order-card-foot"><span>${escapeHtml(order.customer_name)} · ${escapeHtml(order.contact)}</span><strong>${money(order.total_cents)}</strong></div>
        <small>${escapeHtml(order.created_at)}</small>
        ${controls}
      </article>`;
  }).join('');

  ordersList.querySelectorAll('.order-status-btn').forEach(button => {
    button.addEventListener('click', () => updateOrderStatus(Number(button.dataset.orderId), button.dataset.status));
  });
}

async function loadDashboard(){
  try {
    dashboardData = await requestInventory('dashboard');
    renderInventory();
    renderBasket();
    renderOrders();
  } catch (error) {
    inventoryGrid.innerHTML = `<p class="empty-state is-error">${escapeHtml(error.message)}</p>`;
    document.getElementById('ordersList').innerHTML = `<p class="empty-state is-error">${escapeHtml(error.message)}</p>`;
  }
}

async function addMaterial(code){
  setDashboardMessage('', false);
  try {
    const result = await requestInventory('cart_add', { code });
    await loadDashboard();
    setDashboardMessage(result.message, false);
  } catch (error) {
    setDashboardMessage(error.message, true);
  }
}

async function removeMaterial(materialId){
  try {
    const result = await requestInventory('cart_remove', { materialId });
    await loadDashboard();
    setDashboardMessage(result.message, false);
  } catch (error) {
    setDashboardMessage(error.message, true);
  }
}

async function restockMaterial(materialId, quantity){
  try {
    const result = await requestInventory('restock', { materialId, quantity });
    await loadDashboard();
    setDashboardMessage(result.message, false);
  } catch (error) {
    setDashboardMessage(error.message, true);
  }
}

document.getElementById('checkoutForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  checkoutBtn.disabled = true;
  try {
    const result = await requestInventory('checkout', {
      customerName: document.getElementById('checkoutName').value.trim(),
      contact: document.getElementById('checkoutContact').value.trim(),
    });
    form.reset();
    await loadDashboard();
    setDashboardMessage(`Order #${result.orderId} is pending. Your reserved stock is now attached to the order.`, false);
    document.getElementById('orders').scrollIntoView({ behavior:'smooth' });
  } catch (error) {
    setDashboardMessage(error.message, true);
    checkoutBtn.disabled = dashboardData.cart.length === 0;
  }
});

async function updateOrderStatus(orderId, status){
  try {
    const result = await requestInventory('order_status', { orderId, status });
    await loadDashboard();
    setDashboardMessage(result.message, false);
  } catch (error) {
    setDashboardMessage(error.message, true);
  }
}

document.getElementById('refreshDashboardBtn').addEventListener('click', loadDashboard);

function parseQrCode(rawValue){
  const value = String(rawValue || '').trim();
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed.code === 'string') return parsed.code;
    if (typeof parsed.materialCode === 'string') return parsed.materialCode;
  } catch {}
  try {
    const url = new URL(value);
    const code = url.searchParams.get('code') || url.searchParams.get('material');
    if (code) return code;
  } catch {}
  return value;
}

function stopQrScanner(){
  scannerActive = false;
  scannerBusy = false;
  if (scannerStream){
    scannerStream.getTracks().forEach(track => track.stop());
    scannerStream = null;
  }
  qrVideo.srcObject = null;
  scannerOverlay.classList.remove('open');
  scannerOverlay.setAttribute('aria-hidden', 'true');
}

async function scanQrFrames(detector){
  if (!scannerActive || scannerBusy || qrVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  scannerBusy = true;
  try {
    const results = await detector.detect(qrVideo);
    if (results.length){
      const code = parseQrCode(results[0].rawValue);
      stopQrScanner();
      await addMaterial(code);
      return;
    }
  } catch (error) {
    scannerMessage.textContent = `Camera scan error: ${error.message}`;
  } finally {
    scannerBusy = false;
  }
  if (scannerActive) window.setTimeout(() => scanQrFrames(detector), 200);
}

async function openQrScanner(){
  scannerOverlay.classList.add('open');
  scannerOverlay.setAttribute('aria-hidden', 'false');
  scannerMessage.textContent = 'Starting camera scanner…';
  if (!('BarcodeDetector' in window)){
    scannerMessage.textContent = 'Camera scanner not available in this browser. Tap any sample material below or type code.';
    return;
  }
  try {
    const supportedFormats = await BarcodeDetector.getSupportedFormats();
    if (!supportedFormats.includes('qr_code')){
      scannerMessage.textContent = 'QR scanning is unavailable. Tap a sample material below or enter code.';
      return;
    }
    const detector = new BarcodeDetector({ formats:['qr_code'] });
    scannerStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:'environment' } }, audio:false });
    qrVideo.srcObject = scannerStream;
    await qrVideo.play();
    scannerActive = true;
    scannerMessage.textContent = 'Point camera at a ClearDrop material QR code.';
    scanQrFrames(detector);
  } catch (error) {
    scannerMessage.textContent = `Camera unavailable (${error.message}). Tap a quick code below.`;
  }
}

document.getElementById('openScannerBtn').addEventListener('click', openQrScanner);
document.getElementById('closeScannerBtn').addEventListener('click', stopQrScanner);
scannerOverlay.addEventListener('click', event => {
  if (event.target === scannerOverlay) stopQrScanner();
});
document.getElementById('manualQrForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = document.getElementById('manualQrCode');
  const code = parseQrCode(input.value);
  try {
    await requestInventory('cart_add', { code });
    input.value = '';
    stopQrScanner();
    await loadDashboard();
    setDashboardMessage('One unit added by QR code and reserved in your basket.', false);
  } catch (error) {
    scannerMessage.textContent = error.message;
  }
});

// Fast QR Chip buttons for easy testing on mobile phones
document.querySelectorAll('.qr-quick-chip').forEach(chip => {
  chip.addEventListener('click', async () => {
    const code = chip.dataset.code;
    const input = document.getElementById('manualQrCode');
    input.value = code;
    try {
      await requestInventory('cart_add', { code });
      input.value = '';
      stopQrScanner();
      await loadDashboard();
      setDashboardMessage(`One unit of ${code} added and reserved in basket!`, false);
    } catch (err) {
      scannerMessage.textContent = err.message;
    }
  });
});

document.getElementById('navSearchBtn').addEventListener('click', event => {
  const button = event.currentTarget;
  const panel = document.getElementById('searchPanel');
  const isOpen = panel.classList.toggle('open');
  button.classList.toggle('active', isOpen);
  button.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) setTimeout(() => document.getElementById('searchInput').focus(), 200);
});

document.getElementById('searchInput').addEventListener('input', event => {
  const query = event.currentTarget.value.trim().toLowerCase();
  let count = 0;
  document.querySelectorAll('#browse .grid .card').forEach(card => {
    const visible = card.textContent.toLowerCase().includes(query);
    card.style.display = visible ? '' : 'none';
    if (visible) count++;
  });
  document.getElementById('searchNoResults').classList.toggle('show', count === 0);
  if (query.length > 2) {
    const browseSection = document.getElementById('browse');
    if (browseSection && window.scrollY < 300) {
      browseSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

document.getElementById('searchClearBtn').addEventListener('click', () => {
  const input = document.getElementById('searchInput');
  input.value = '';
  document.querySelectorAll('#browse .grid .card').forEach(card => card.style.display = '');
  document.getElementById('searchNoResults').classList.remove('show');
  input.focus();
});

// Category filter chips in #browse
const filterChips = document.querySelectorAll('.filter-row .chip');
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const category = chip.textContent.trim().toLowerCase();
    document.querySelectorAll('#browse .grid .card').forEach(card => {
      const cardCat = (card.dataset.category || '').toLowerCase();
      const show = category === 'all' || cardCat === category;
      card.style.display = show ? '' : 'none';
    });
  });
});

// Stage Detail Information Modal
const STAGE_DETAILS = {
  intake: {
    title: 'Stage 1 · Raw Water Intake',
    subtitle: 'Pre-Screen Inlet & Coarse Filtration',
    description: 'The first line of defense in the ClearDrop system. Raw water from rainwater collection or untreated sources passes through a washable 304 stainless or food-grade HDPE mesh screen.',
    benefits: ['Intercepts leaves, twigs, insects, and large debris', 'Protects deeper sand & ceramic stages from premature clogging', 'Easily rinsed with clean water without disassembling the main tank']
  },
  sediment: {
    title: 'Stage 2 · Sediment Trap',
    subtitle: 'Graded Sand & Gravel Bed',
    description: 'A multi-density physical filtration bed consisting of clean washed graded gravel (bottom) and fine quartz filter sand (top). Silt and particulate matter are trapped within the granular pores.',
    benefits: ['Removes suspended soil, turbidity, and fine cloudiness', 'Utilizes slow gravity settlement for maximum particle capture', 'Long-lasting natural mineral media that can be backwashed or replaced']
  },
  carbon: {
    title: 'Stage 3 · Activated Carbon',
    subtitle: 'Coconut-Shell Adsorption Layer',
    description: 'High-iodine activated carbon granules produced from sustainable coconut shells. Provides an enormous internal surface area that chemically adsorbs dissolved contaminants.',
    benefits: ['Eliminates objectionable odors, chlorine, and swampy taste', 'Adsorbs volatile organic compounds (VOCs) and pesticides', 'Leaves water clear, fresh, and naturally palatable']
  },
  membrane: {
    title: 'Stage 4 · Ceramic Membrane',
    subtitle: 'Sub-Micron Porous Microfilter Element',
    description: 'High-fired diatomaceous ceramic candle element with micro-porous filtration structure. As water percolates through the ceramic walls, micro-organisms and protozoan cysts are barred.',
    benefits: ['Sub-micron mechanical barrier against micro-particulates', 'Washable outer surface: scrub with a soft brush when flow rate slows', 'Gravity-powered without pumps, electricity, or chemical additives']
  },
  sterilizer: {
    title: 'Optional · UV Disinfection Add-on',
    subtitle: 'Germicidal Ultra-Violet Disinfection',
    description: 'An optional modular add-on for installations where low-voltage DC solar power or battery backup is available. Destroys the DNA of bacteria and viruses in passing water.',
    benefits: ['Secondary disinfection without adding chlorine or leaving taste', 'Instant biological neutralization before storage', 'Easy retrofitting onto the ClearDrop gravity outlet pipe']
  },
  storage: {
    title: 'Final Stage · Clean Water Storage',
    subtitle: 'Food-Grade HDPE Reservoir with Safe Tap',
    description: 'The purified water collects in a sealed, food-grade HDPE lower container equipped with an airtight gasket, insect-proof vent, and a sanitary dispensing outlet tap.',
    benefits: ['Protects treated water from re-contamination and mosquitoes', 'Food-grade certified, BPA-free polymer construction', 'Ergonomic dispensing tap designed for daily family drinking containers']
  }
};

const stageModal = document.getElementById('stageModal');
const stageModalClose = document.getElementById('stageModalClose');
if (stageModalClose) {
  stageModalClose.addEventListener('click', () => {
    stageModal.classList.remove('open');
    document.body.style.overflow = '';
  });
}
if (stageModal) {
  stageModal.addEventListener('click', event => {
    if (event.target === stageModal) {
      stageModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

document.querySelectorAll('#browse .grid .card').forEach(card => {
  const detailBtn = card.querySelector('.btn-primary');
  if (detailBtn) {
    detailBtn.addEventListener('click', () => {
      const cat = card.dataset.category || 'intake';
      const info = STAGE_DETAILS[cat] || STAGE_DETAILS.intake;
      document.getElementById('stageModalTitle').textContent = info.title;
      document.getElementById('stageModalSubtitle').textContent = info.subtitle;
      document.getElementById('stageModalDesc').textContent = info.description;
      const benefitsList = document.getElementById('stageModalBenefits');
      benefitsList.innerHTML = info.benefits.map(b => `<li>${escapeHtml(b)}</li>`).join('');
      stageModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }
});

// Profile Modal
const profileModal = document.getElementById('profileModal');
const profileModalClose = document.getElementById('profileModalClose');
const navProfileLink = document.getElementById('navProfileLink');
if (navProfileLink) {
  navProfileLink.addEventListener('click', event => {
    event.preventDefault();
    accountDropdown.classList.remove('open');
    navAccountBtn.classList.remove('active');
    navAccountBtn.setAttribute('aria-expanded', 'false');

    const currentUser = window.clearDropCurrentUser || { username: accountIdDisplay.textContent, role: 'customer' };
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileDisplayName').textContent = currentUser.displayName || currentUser.username;
    document.getElementById('profileRole').textContent = roleTitle(currentUser.role);
    const mode = window.ClearDropAPI?.getMode() === 'php' ? 'Live PHP & SQLite Server' : 'GitHub Live Demo (Standalone)';
    document.getElementById('profileMode').textContent = mode;

    profileModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
}
if (profileModalClose) {
  profileModalClose.addEventListener('click', () => {
    profileModal.classList.remove('open');
    document.body.style.overflow = '';
  });
}
if (profileModal) {
  profileModal.addEventListener('click', event => {
    if (event.target === profileModal) {
      profileModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

// Reset Demo Data button
const resetDemoBtn = document.getElementById('resetDemoBtn');
if (resetDemoBtn) {
  resetDemoBtn.addEventListener('click', () => {
    if (window.confirm('Reset all demo inventory, orders, and catalog back to initial values?')) {
      window.ClearDropAPI.resetDemoData();
    }
  });
}

function showLoginError(element, message, box){
  element.textContent = message;
  element.classList.add('show');
  if (box){
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
  }
}

function updateNavbar(isLoggedIn){
  navLoginBtn.style.display = isLoggedIn ? 'none' : 'inline-block';
  accountWrap.style.display = isLoggedIn ? 'block' : 'none';
  if (!isLoggedIn){
    accountDropdown.classList.remove('open');
    navAccountBtn.classList.remove('active');
    navAccountBtn.setAttribute('aria-expanded', 'false');
  }
}

function roleTitle(role){
  return {
    admin:'Admin / Owner',
    inventory:'Inventory & Purchasing',
    production:'Production / Assembler',
    sales:'Sales & Orders',
    partner:'Partner / Customer',
    distributor:'Community Distributor',
    customer:'Demo Customer',
  }[role] || 'ClearDrop Account';
}

function showWebsite(username, role, displayName){
  window.clearDropCurrentUser = { username, role, displayName: displayName || username };
  accountIdDisplay.textContent = username;
  document.querySelector('.account-dropdown-title').textContent = roleTitle(role);
  loginScreen.style.display = 'none';
  mainWebsite.classList.add('revealed');
  document.body.style.overflow = '';
  updateNavbar(true);
  window.dispatchEvent(new CustomEvent('cleardrop:authenticated', {
    detail:{ username, role, displayName:displayName || username }
  }));
  loadDashboard();
}

function showLoginScreen(){
  stopQrScanner();
  loginScreen.style.display = 'flex';
  mainWebsite.classList.remove('revealed');
  document.body.style.overflow = '';
  loginForm.reset();
  loginError.classList.remove('show');
  updateNavbar(false);
  window.dispatchEvent(new CustomEvent('cleardrop:loggedout'));
  setTimeout(() => loginUser.focus(), 50);
}

function unavailableMessage(error){
  return error instanceof TypeError && error.message === 'Failed to fetch'
    ? 'Login service unavailable. Verify connection or refresh to use standalone demo mode.'
    : error.message;
}

async function checkLoginState(){
  try {
    const result = await requestAuth('status');
    if (result && result.authenticated){
      showWebsite(result.username, result.role, result.displayName);
    } else {
      updateNavbar(false);
      setTimeout(() => loginUser.focus(), 100);
    }
  } catch (error) {
    showLoginError(loginError, unavailableMessage(error));
  }
}

window.addEventListener('DOMContentLoaded', checkLoginState);

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const result = await requestAuth('login', loginUser.value.trim(), loginPass.value);
    loginError.classList.remove('show');
    showWebsite(result.username, result.role, result.displayName);
  } catch (error) {
    showLoginError(loginError, unavailableMessage(error), loginBox);
  }
});

window.addEventListener('cleardrop:googleCredential', async event => {
  const modalLogin = loginModalOverlay.classList.contains('open');
  const errorElement = modalLogin ? loginModalError : loginError;
  const errorContainer = modalLogin ? loginModalBox : loginBox;
  try {
    const result = await requestAuth('google_login', event.detail.credential);
    errorElement.classList.remove('show');
    if (modalLogin) closeLoginModal();
    showWebsite(result.username, result.role, result.displayName);
  } catch (error) {
    showLoginError(errorElement, unavailableMessage(error), errorContainer);
    window.dispatchEvent(new Event('cleardrop:googleRefresh'));
  }
});

navLoginBtn.addEventListener('click', () => {
  loginModalError.classList.remove('show');
  loginModalForm.reset();
  loginModalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => loginModalUser.focus(), 150);
});

function closeLoginModal(){
  loginModalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('loginModalClose').addEventListener('click', closeLoginModal);
loginModalOverlay.addEventListener('click', event => {
  if (event.target === loginModalOverlay) closeLoginModal();
});
loginModalForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const result = await requestAuth('login', loginModalUser.value.trim(), loginModalPass.value);
    loginModalError.classList.remove('show');
    accountIdDisplay.textContent = result.username;
    document.querySelector('.account-dropdown-title').textContent = roleTitle(result.role);
    updateNavbar(true);
    window.dispatchEvent(new CustomEvent('cleardrop:authenticated', {
      detail:{ username:result.username, role:result.role, displayName:result.displayName || result.username }
    }));
    closeLoginModal();
    loadDashboard();
  } catch (error) {
    showLoginError(loginModalError, unavailableMessage(error), loginModalBox);
  }
});

navAccountBtn.addEventListener('click', event => {
  event.stopPropagation();
  const isOpen = accountDropdown.classList.toggle('open');
  navAccountBtn.classList.toggle('active', isOpen);
  navAccountBtn.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', event => {
  if (!accountWrap.contains(event.target)){
    accountDropdown.classList.remove('open');
    navAccountBtn.classList.remove('active');
    navAccountBtn.setAttribute('aria-expanded', 'false');
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await requestAuth('logout');
    showLoginScreen();
  } catch (error) {
    window.alert(`Could not log out: ${unavailableMessage(error)}`);
  }
});
