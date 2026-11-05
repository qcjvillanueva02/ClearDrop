import React, { useState } from 'react';

export default function OrderBasket({ cart, onRemove, onCheckout, isCheckingOut, message, isError }) {
  const [collapsed, setCollapsed] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');

  const totalUnits = cart.reduce((total, item) => total + Number(item.quantity), 0);
  const totalCents = cart.reduce((total, item) => total + Number(item.price_cents) * Number(item.quantity), 0);

  const formatMoney = (cents) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(cents || 0) / 100);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim() || !contact.trim()) return;
    onCheckout(customerName.trim(), contact.trim());
    setCustomerName('');
    setContact('');
  };

  return (
    <aside className={`order-panel ${collapsed ? 'is-collapsed' : ''}`} id="orderPanel" aria-labelledby="basketTitle">
      <div className="order-panel-head">
        <div>
          <span className="eyebrow">Your order</span>
          <h3 id="basketTitle">Material basket</h3>
        </div>
        <span className="basket-count" id="basketCount">{totalUnits}</span>
        <button
          type="button"
          className="order-panel-toggle"
          id="orderPanelToggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand material basket' : 'Collapse material basket'}
          onClick={() => setCollapsed(!collapsed)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
      </div>

      <div className="order-panel-content" id="orderPanelContent">
        <div className="basket-items" id="basketItems">
          {cart.length === 0 ? (
            <p className="empty-state">Your basket is empty. Add or scan a material to begin.</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="basket-line">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.quantity} × {formatMoney(item.price_cents)}</span>
                </div>
                <button
                  type="button"
                  className="basket-remove-btn"
                  aria-label={`Remove one ${item.name}`}
                  onClick={() => onRemove(item.id)}
                >
                  −
                </button>
              </div>
            ))
          )}
        </div>

        <div className="basket-total">
          <span>Estimated total</span>
          <strong id="basketTotal">{formatMoney(totalCents)}</strong>
        </div>

        <form id="checkoutForm" className="checkout-form" onSubmit={handleFormSubmit}>
          <div className="field">
            <label htmlFor="checkoutName">Name</label>
            <input
              id="checkoutName"
              name="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="name"
              placeholder="e.g. Maria Santos"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="checkoutContact">Contact number</label>
            <input
              id="checkoutContact"
              name="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              autoComplete="tel"
              placeholder="e.g. 0917-123-4567"
              required
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            id="checkoutBtn"
            disabled={cart.length === 0 || isCheckingOut}
          >
            {isCheckingOut ? 'Placing order…' : 'Checkout — place pending order'}
          </button>
        </form>

        {message && (
          <p className={`dashboard-message show ${isError ? 'is-error' : ''}`} id="orderMessage" role="status">
            {message}
          </p>
        )}
      </div>
    </aside>
  );
}
