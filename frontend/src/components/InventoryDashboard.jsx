import React, { useState } from 'react';
import OrderBasket from './OrderBasket';
import PendingOrders from './PendingOrders';

export default function InventoryDashboard({
  dashboardData,
  onAddMaterial,
  onRemoveMaterial,
  onRestockMaterial,
  onCheckout,
  onUpdateOrderStatus,
  onRefresh,
  onOpenScanner,
  basketMessage,
  isBasketError,
  loading
}) {
  const { materials = [], cart = [], orders = [], role = 'customer' } = dashboardData;
  const [restockQty, setRestockQty] = useState({});

  const lowStockCount = materials.filter(
    (item) => Number(item.stock) <= Number(item.low_stock_at)
  ).length;
  const totalUnits = materials.reduce((total, item) => total + Number(item.stock), 0);

  const formatMoney = (cents) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(cents || 0) / 100);
  };

  const handleRestockSubmit = (e, materialId) => {
    e.preventDefault();
    const qty = Number(restockQty[materialId] || 5);
    onRestockMaterial(materialId, qty);
  };

  return (
    <section id="dashboard" className="ordering-dashboard">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Customer Dashboard</span>
          <h2>ClearDrop Gravity Filter</h2>
          <p>
            An electricity-free, flood-ready household water filter ordering system of materials.
            Add a material to reserve one unit from stock, scan its QR label, then check out to create a pending order.
          </p>
        </div>

        {/* Stock Summary Tiles */}
        <div className="dashboard-summary" id="stockSummary" aria-live="polite">
          <div className="summary-tile">
            <strong>{materials.length}</strong>
            <span>Material types</span>
          </div>
          <div className="summary-tile">
            <strong>{totalUnits}</strong>
            <span>Available units</span>
          </div>
          <div className={`summary-tile ${lowStockCount > 0 ? 'is-low' : ''}`}>
            <strong>{lowStockCount}</strong>
            <span>Low-stock items</span>
          </div>
        </div>

        {/* Dashboard Toolbar */}
        <div className="dashboard-toolbar">
          <div>
            <h3>Materials and stock</h3>
            <p>Each Add click reserves one unit. Removing a basket item returns one unit to stock.</p>
          </div>
          <button type="button" className="btn btn-primary" id="openScannerBtn" onClick={onOpenScanner}>
            Scan QR to add
          </button>
        </div>

        {/* Dashboard Main Layout */}
        <div className="dashboard-layout">
          <div className="inventory-grid" id="inventoryGrid" aria-live="polite">
            {materials.length === 0 ? (
              <p className="empty-state">No materials found.</p>
            ) : (
              materials.map((item) => {
                const stock = Number(item.stock);
                const isLow = stock <= Number(item.low_stock_at);

                return (
                  <article key={item.id} className={`material-card ${isLow ? 'is-low' : ''}`}>
                    <div className="material-card-top">
                      <span className="material-kicker">{isLow ? 'Low stock' : 'In stock'}</span>
                      <span className="material-stock">
                        {stock} <small>{item.unit}{stock === 1 ? '' : 's'}</small>
                      </span>
                    </div>
                    <h4>{item.name}</h4>
                    <p>{item.description}</p>
                    <div className="material-code">
                      <span>QR MATERIAL CODE</span>
                      <code>{item.code}</code>
                    </div>
                    <div className="material-card-bottom">
                      <strong>
                        {formatMoney(item.price_cents)} <small>/ {item.unit}</small>
                      </strong>
                      <button
                        type="button"
                        className="btn btn-primary add-material-btn"
                        disabled={stock < 1}
                        onClick={() => onAddMaterial(item.code)}
                      >
                        {stock < 1 ? 'Out of stock' : 'Add 1 to basket'}
                      </button>
                    </div>

                    {role === 'admin' && (
                      <form
                        className="restock-form"
                        onSubmit={(e) => handleRestockSubmit(e, item.id)}
                      >
                        <label htmlFor={`restock-${item.id}`}>Restock</label>
                        <input
                          id={`restock-${item.id}`}
                          type="number"
                          min="1"
                          max="10000"
                          value={restockQty[item.id] ?? 5}
                          onChange={(e) =>
                            setRestockQty({ ...restockQty, [item.id]: e.target.value })
                          }
                          required
                        />
                        <button type="submit">Update stock</button>
                      </form>
                    )}
                  </article>
                );
              })
            )}
          </div>

          <OrderBasket
            cart={cart}
            onRemove={onRemoveMaterial}
            onCheckout={onCheckout}
            message={basketMessage}
            isError={isBasketError}
          />
        </div>

        <PendingOrders
          orders={orders}
          role={role}
          onUpdateStatus={onUpdateOrderStatus}
          onRefresh={onRefresh}
          loading={loading}
        />
      </div>
    </section>
  );
}
