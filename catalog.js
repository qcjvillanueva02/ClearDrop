const catalogProducts = document.getElementById('catalogProducts');
const catalogComponents = document.getElementById('catalogComponents');
const catalogAdmin = document.getElementById('catalogAdmin');
const catalogMessage = document.getElementById('catalogMessage');
const productForm = document.getElementById('productForm');
const componentForm = document.getElementById('componentForm');
const bomForm = document.getElementById('bomForm');
const bomItemsEditor = document.getElementById('bomItemsEditor');
const productSelector = bomForm.elements.productId;
const componentSelector = componentForm.elements.existingId;
const productSelectorEditor = productForm.elements.existingId;
const catalogState = { role: '', products: [], components: [], users: [] };
const catalogRoles = [
  ['admin', 'Admin / Owner'],
  ['inventory', 'Inventory & Purchasing'],
  ['production', 'Production / Assembler'],
  ['sales', 'Sales & Orders'],
  ['partner', 'Partner / Customer'],
  ['distributor', 'Community Distributor'],
  ['customer', 'Demo Customer'],
];

function catalogEscape(value){
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
}

function catalogMoney(cents){
  return new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' })
    .format(Number(cents || 0) / 100);
}

function centsFromInput(value, field){
  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error(`${field} must be a PHP amount with up to two decimal places.`);
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents > 100000000) throw new Error(`${field} is outside the supported range.`);
  return cents;
}

function moneyInput(cents){
  return cents === null || cents === undefined ? '' : (Number(cents) / 100).toFixed(2);
}

function setCatalogMessage(message, isError = false){
  catalogMessage.textContent = message;
  catalogMessage.classList.toggle('is-error', isError);
  catalogMessage.classList.toggle('show', Boolean(message));
}

async function catalogRequest(action, payload){
  if (window.ClearDropAPI && typeof window.ClearDropAPI.requestCatalog === 'function') {
    return window.ClearDropAPI.requestCatalog(action, payload);
  }
  const options = { method:payload ? 'POST' : 'GET', credentials:'same-origin' };
  if (payload){
    options.headers = { 'Content-Type':'application/json' };
    options.body = JSON.stringify({ action, ...payload });
  }
  const response = await fetch(`catalog-api.php${payload ? '' : `?action=${encodeURIComponent(action)}`}`, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The catalog API did not return JSON. Run the site with PHP and SQLite enabled.');
  }
  if (!response.ok) throw new Error(result.message || result.error?.message || 'The catalog request failed.');
  return result;
}

function currentBom(productId){
  return catalogState.products.find(product => Number(product.id) === Number(productId))?.bom;
}

function quantityText(quantityMilli){
  return (Number(quantityMilli) / 1000).toFixed(3).replace(/\.?0+$/, '') || '0';
}

function renderCatalog(){
  const admin = catalogState.role === 'admin';
  catalogAdmin.hidden = !admin;
  if (!catalogState.products.length){
    catalogProducts.innerHTML = '<p class="empty-state">No products are listed yet.</p>';
  } else {
    catalogProducts.innerHTML = catalogState.products.map(product => {
      const bom = product.bom;
      const profitCents = product.estimated_unit_cost_cents === null
        ? null
        : Number(product.sale_price_cents) - Number(product.estimated_unit_cost_cents);
      const marginBasisPoints = profitCents === null || !Number(product.sale_price_cents)
        ? null
        : Math.round(profitCents * 10000 / Number(product.sale_price_cents));
      const currentMaterialsCost = bom ? catalogMoney(bom.estimated_material_cost_cents) : 'Not estimated';
      const bomRows = bom?.items?.length
        ? bom.items.map(item => `<li>${catalogEscape(quantityText(item.quantity_milli))} ${catalogEscape(item.unit)} · ${catalogEscape(item.name)}</li>`).join('')
        : '<li>No BOM defined yet.</li>';
      return `<article class="catalog-card ${Number(product.active) ? '' : 'is-inactive'}">
        <div class="catalog-card-top"><code>${catalogEscape(product.sku)}</code><span>${Number(product.active) ? 'Active' : 'Inactive'}</span></div>
        <h4>${catalogEscape(product.name)}</h4>
        <p>${catalogEscape(product.description)}</p>
        <dl>
          <div><dt>Sale price</dt><dd>${catalogMoney(product.sale_price_cents)}</dd></div>
          <div><dt>Estimated unit cost</dt><dd>${product.estimated_unit_cost_cents === null ? 'Not set' : `${catalogMoney(product.estimated_unit_cost_cents)}${Number(product.cost_is_estimate) ? ' · estimate' : ''}`}</dd></div>
          ${profitCents === null ? '' : `<div><dt>Estimated profit / margin</dt><dd>${catalogMoney(profitCents)} · ${(marginBasisPoints / 100).toFixed(1)}%</dd></div>`}
          <div><dt>BOM material subtotal</dt><dd>${currentMaterialsCost}${bom ? ` · v${Number(bom.version)}` : ''}</dd></div>
        </dl>
        <ul class="bom-preview">${bomRows}</ul>
        ${admin ? `<div class="catalog-card-actions">
          <button type="button" class="btn btn-ghost edit-product" data-id="${Number(product.id)}">Edit product</button>
          <button type="button" class="btn btn-primary edit-bom" data-id="${Number(product.id)}">New BOM version</button>
        </div>` : ''}
      </article>`;
    }).join('');
  }

  const listedComponents = catalogState.components.filter(component => admin || Number(component.active));
  if (!listedComponents.length){
    catalogComponents.innerHTML = '<p class="empty-state">No components are listed yet.</p>';
  } else {
    catalogComponents.innerHTML = listedComponents.map(component => `
      <article class="catalog-card ${Number(component.active) ? '' : 'is-inactive'}">
        <div class="catalog-card-top"><code>${catalogEscape(component.code)}</code><span>${Number(component.active) ? 'Active' : 'Inactive'}</span></div>
        <h4>${catalogEscape(component.name)}</h4>
        <p>${catalogEscape(component.description)}</p>
        <dl>
          <div><dt>Unit / stock</dt><dd>${catalogEscape(component.unit)} · ${Number(component.stock)} available</dd></div>
          <div><dt>Estimated unit cost</dt><dd>${component.estimated_unit_cost_cents === null ? 'Not set' : `${catalogMoney(component.estimated_unit_cost_cents)}${Number(component.cost_is_estimate) ? ' · estimate' : ''}`}</dd></div>
          <div><dt>Customer ordering</dt><dd>${Number(component.orderable) ? catalogMoney(component.price_cents) : 'Not orderable'}</dd></div>
        </dl>
        ${admin ? `<button type="button" class="btn btn-ghost edit-component" data-id="${Number(component.id)}">Edit component</button>` : ''}
      </article>`).join('');
  }

  if (admin){
    populateProductForms();
    populateComponentForm();
    catalogProducts.querySelectorAll('.edit-product').forEach(button => {
      button.addEventListener('click', () => editProduct(Number(button.dataset.id)));
    });
    catalogProducts.querySelectorAll('.edit-bom').forEach(button => {
      button.addEventListener('click', () => {
        productSelector.value = button.dataset.id;
        renderBomEditor(Number(button.dataset.id));
        bomForm.scrollIntoView({ behavior:'smooth', block:'center' });
      });
    });
    catalogComponents.querySelectorAll('.edit-component').forEach(button => {
      button.addEventListener('click', () => editComponent(Number(button.dataset.id)));
    });
  }
}

function populateProductForms(){
  const options = catalogState.products.map(product =>
    `<option value="${Number(product.id)}">${catalogEscape(product.sku)} · ${catalogEscape(product.name)}${Number(product.active) ? '' : ' (inactive)'}</option>`
  ).join('');
  productSelectorEditor.innerHTML = '<option value="">Create new</option>' + options;
  productSelector.innerHTML = '<option value="">Choose a product</option>' + catalogState.products
    .filter(product => Number(product.active))
    .map(product => `<option value="${Number(product.id)}">${catalogEscape(product.sku)} · ${catalogEscape(product.name)}</option>`)
    .join('');
  if (productSelector.value) renderBomEditor(Number(productSelector.value));
}

function populateComponentForm(){
  componentSelector.innerHTML = '<option value="">Create new</option>' + catalogState.components.map(component =>
    `<option value="${Number(component.id)}">${catalogEscape(component.code)} · ${catalogEscape(component.name)}${Number(component.active) ? '' : ' (inactive)'}</option>`
  ).join('');
}

function editProduct(id){
  const product = catalogState.products.find(item => Number(item.id) === id);
  if (!product) return;
  productForm.elements.id.value = product.id;
  productSelectorEditor.value = String(product.id);
  productForm.elements.sku.value = product.sku;
  productForm.elements.name.value = product.name;
  productForm.elements.productType.value = product.product_type;
  productForm.elements.salePrice.value = moneyInput(product.sale_price_cents);
  productForm.elements.estimatedCost.value = moneyInput(product.estimated_unit_cost_cents);
  productForm.elements.costIsEstimate.checked = Boolean(Number(product.cost_is_estimate));
  productForm.elements.active.checked = Boolean(Number(product.active));
  productForm.elements.description.value = product.description;
  productForm.scrollIntoView({ behavior:'smooth', block:'center' });
}

function editComponent(id){
  const component = catalogState.components.find(item => Number(item.id) === id);
  if (!component) return;
  componentForm.elements.id.value = component.id;
  componentSelector.value = String(component.id);
  componentForm.elements.code.value = component.code;
  componentForm.elements.name.value = component.name;
  componentForm.elements.unit.value = component.unit;
  componentForm.elements.estimatedCost.value = moneyInput(component.estimated_unit_cost_cents);
  componentForm.elements.orderPrice.value = moneyInput(component.price_cents);
  componentForm.elements.lowStockAt.value = component.low_stock_at;
  componentForm.elements.orderable.checked = Boolean(Number(component.orderable));
  componentForm.elements.active.checked = Boolean(Number(component.active));
  componentForm.elements.description.value = component.description;
  componentForm.scrollIntoView({ behavior:'smooth', block:'center' });
}

function addBomRow(componentId = '', quantity = ''){
  const row = document.createElement('div');
  row.className = 'bom-item-row';
  const options = catalogState.components.filter(component => Number(component.active))
    .map(component => `<option value="${Number(component.id)}">${catalogEscape(component.code)} · ${catalogEscape(component.name)} (${catalogEscape(component.unit)})</option>`)
    .join('');
  row.innerHTML = `<label>Component <select class="bom-component" required><option value="">Choose component</option>${options}</select></label>
    <label>Quantity <input class="bom-quantity" inputmode="decimal" type="number" min="0.001" step="0.001" required value="${catalogEscape(quantity)}"></label>
    <button class="btn btn-ghost remove-bom-item" type="button" aria-label="Remove component">Remove</button>`;
  row.querySelector('.bom-component').value = String(componentId);
  row.querySelector('.remove-bom-item').addEventListener('click', () => row.remove());
  bomItemsEditor.append(row);
}

function renderBomEditor(productId){
  const product = catalogState.products.find(item => Number(item.id) === Number(productId));
  bomItemsEditor.replaceChildren();
  if (!product) return;
  (product.bom?.items || []).forEach(item => addBomRow(item.component_id, quantityText(item.quantity_milli)));
  if (!product.bom?.items?.length) addBomRow();
  bomForm.elements.notes.value = product.bom?.notes || '';
}

function centsToMilliQuantity(value){
  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) throw new Error('BOM quantity must have up to three decimal places.');
  const [whole, fraction = ''] = normalized.split('.');
  const milli = Number(whole) * 1000 + Number((fraction + '000').slice(0, 3));
  if (!Number.isSafeInteger(milli) || milli < 1 || milli > 100000000) throw new Error('BOM quantity is outside the supported range.');
  return milli;
}

function renderUsers(){
  const users = document.getElementById('catalogUsers');
  if (!catalogState.users.length){
    users.innerHTML = '<p class="empty-state">No user accounts found.</p>';
    return;
  }
  users.innerHTML = catalogState.users.map(user => `
    <div class="catalog-user-row">
      <div><strong>${catalogEscape(user.display_name)}</strong><span>${catalogEscape(user.username)} · ${catalogEscape(user.role_name)}</span></div>
      <span>${Number(user.active) ? 'Active' : 'Inactive'}</span>
      ${Number(user.active) && user.username !== window.clearDropUsername
        ? `<div class="catalog-user-actions">
            <select class="user-role" aria-label="Role for ${catalogEscape(user.username)}">
              ${catalogRoles.map(([role, label]) => `<option value="${role}" ${user.role_key === role ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
            <button class="btn btn-ghost update-user-role" data-id="${Number(user.id)}" type="button">Save role</button>
            <button class="btn btn-ghost deactivate-user" data-id="${Number(user.id)}" type="button">Deactivate</button>
          </div>` : ''}
    </div>`).join('');
  users.querySelectorAll('.update-user-role').forEach(button => {
    button.addEventListener('click', async () => {
      const role = button.closest('.catalog-user-row').querySelector('.user-role').value;
      try {
        const result = await catalogRequest('update_user_role', { userId:Number(button.dataset.id), role });
        setCatalogMessage(result.message);
        await loadCatalog();
      } catch (error) {
        setCatalogMessage(error.message, true);
      }
    });
  });
  users.querySelectorAll('.deactivate-user').forEach(button => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Deactivate this account? Existing records will be retained.')) return;
      try {
        const result = await catalogRequest('deactivate_user', { userId:Number(button.dataset.id) });
        setCatalogMessage(result.message);
        await loadCatalog();
      } catch (error) {
        setCatalogMessage(error.message, true);
      }
    });
  });
}

async function loadCatalog(){
  if (!catalogState.role) return;
  catalogProducts.innerHTML = '<p class="empty-state">Loading catalog…</p>';
  catalogComponents.innerHTML = '<p class="empty-state">Loading components…</p>';
  try {
    const data = await catalogRequest('catalog');
    catalogState.products = data.products || [];
    catalogState.components = data.components || [];
    renderCatalog();
    if (catalogState.role === 'admin'){
      const result = await catalogRequest('users');
      catalogState.users = result.users || [];
      renderUsers();
    }
  } catch (error) {
    catalogProducts.innerHTML = `<p class="empty-state is-error">${catalogEscape(error.message)}</p>`;
    catalogComponents.innerHTML = `<p class="empty-state is-error">${catalogEscape(error.message)}</p>`;
    setCatalogMessage(error.message, true);
  }
}

productSelectorEditor.addEventListener('change', () => {
  if (!productSelectorEditor.value){
    productForm.reset();
    productForm.elements.id.value = '';
    return;
  }
  editProduct(Number(productSelectorEditor.value));
});

componentSelector.addEventListener('change', () => {
  if (!componentSelector.value){
    componentForm.reset();
    componentForm.elements.id.value = '';
    return;
  }
  editComponent(Number(componentSelector.value));
});

productSelector.addEventListener('change', () => renderBomEditor(Number(productSelector.value)));
document.getElementById('addBomItem').addEventListener('click', () => addBomRow());

productForm.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  try {
    const cost = form.elements.estimatedCost.value.trim();
    const result = await catalogRequest('save_product', {
      id:form.elements.id.value ? Number(form.elements.id.value) : null,
      sku:form.elements.sku.value.trim(),
      name:form.elements.name.value.trim(),
      productType:form.elements.productType.value,
      description:form.elements.description.value.trim(),
      salePriceCents:centsFromInput(form.elements.salePrice.value, 'Sale price'),
      estimatedCostCents:cost ? centsFromInput(cost, 'Estimated unit cost') : null,
      costIsEstimate:form.elements.costIsEstimate.checked,
      active:form.elements.active.checked,
    });
    setCatalogMessage(result.message);
    form.reset();
    form.elements.id.value = '';
    await loadCatalog();
  } catch (error) {
    setCatalogMessage(error.message, true);
  }
});

componentForm.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  try {
    const cost = form.elements.estimatedCost.value.trim();
    const result = await catalogRequest('save_component', {
      id:form.elements.id.value ? Number(form.elements.id.value) : null,
      code:form.elements.code.value.trim(),
      name:form.elements.name.value.trim(),
      description:form.elements.description.value.trim(),
      unit:form.elements.unit.value.trim(),
      estimatedUnitCostCents:cost ? centsFromInput(cost, 'Estimated unit cost') : null,
      priceCents:centsFromInput(form.elements.orderPrice.value, 'Customer order price'),
      lowStockAt:Number(form.elements.lowStockAt.value),
      orderable:form.elements.orderable.checked,
      active:form.elements.active.checked,
    });
    setCatalogMessage(result.message);
    form.reset();
    form.elements.id.value = '';
    await loadCatalog();
  } catch (error) {
    setCatalogMessage(error.message, true);
  }
});

bomForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!bomForm.reportValidity()) return;
  try {
    const items = Array.from(bomItemsEditor.querySelectorAll('.bom-item-row')).map(row => ({
      componentId:Number(row.querySelector('.bom-component').value),
      quantityMilli:centsToMilliQuantity(row.querySelector('.bom-quantity').value),
    }));
    const result = await catalogRequest('save_bom', {
      productId:Number(productSelector.value),
      notes:bomForm.elements.notes.value.trim(),
      items,
    });
    setCatalogMessage(`${result.message} Version ${result.version}.`);
    await loadCatalog();
    productSelector.value = String(result.productId || productSelector.value);
    renderBomEditor(Number(productSelector.value));
  } catch (error) {
    setCatalogMessage(error.message, true);
  }
});

document.getElementById('newUserForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  try {
    const result = await catalogRequest('create_user', {
      username:form.elements.username.value.trim(),
      displayName:form.elements.displayName.value.trim(),
      role:form.elements.role.value,
      password:form.elements.password.value,
    });
    setCatalogMessage(result.message);
    form.reset();
    await loadCatalog();
  } catch (error) {
    setCatalogMessage(error.message, true);
  }
});

window.addEventListener('cleardrop:authenticated', event => {
  catalogState.role = event.detail.role || '';
  window.clearDropUsername = event.detail.username || '';
  loadCatalog();
});
window.addEventListener('cleardrop:loggedout', () => {
  catalogState.role = '';
  catalogState.products = [];
  catalogState.components = [];
  catalogState.users = [];
  catalogAdmin.hidden = true;
});
