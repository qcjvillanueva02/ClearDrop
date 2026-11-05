import React from 'react';

export default function PendingOrders({ orders, role, onUpdateStatus, onRefresh, loading }) {
  const formatMoney = (cents) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(cents || 0) / 100);
  };

  const getNextStatus = (status) => {
    return { pending: 'processing', processing: 'ready', ready: 'completed' }[status] || '';
  };

  return (
    <section className="pending-orders" id="orders" aria-labelledby="pendingOrdersTitle">
      <div className="dashboard-toolbar">
        <div>
          <span className="eyebrow">Order tracking</span>
          <h3 id="pendingOrdersTitle">Pending orders</h3>
        </div>
        <button type="button" className="btn btn-ghost" id="refreshDashboardBtn" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="orders-list" id="ordersList">
        {orders.length === 0 ? (
          <p className="empty-state">No orders yet. Materials appear here after checkout.</p>
        ) : (
          orders.map((order) => {
            const itemsSummary = (order.items || [])
              .map((item) => `${item.quantity} × ${item.name || item.material_name}`)
              .join(', ');

            const next = getNextStatus(order.status);
            const isAdmin = role === 'admin';

            return (
              <article key={order.id} className="order-card">
                <div className="order-card-head">
                  <strong>
                    Order #{order.id}
                    {isAdmin && ` · ${order.username}`}
                  </strong>
                  <span className={`order-status status-${order.status}`}>{order.status}</span>
                </div>
                <p>{itemsSummary || 'No items listed'}</p>
                <div className="order-card-foot">
                  <span>{order.customer_name} · {order.contact}</span>
                  <strong>{formatMoney(order.total_cents)}</strong>
                </div>
                <small>{order.created_at}</small>

                {isAdmin && (order.status === 'pending' || order.status === 'processing') && (
                  <div className="order-actions">
                    {next && (
                      <button
                        type="button"
                        className="order-status-btn"
                        onClick={() => onUpdateStatus(order.id, next)}
                      >
                        {next === 'processing' ? 'Start preparing' : 'Mark ready'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="order-status-btn cancel-order-btn"
                      onClick={() => onUpdateStatus(order.id, 'cancelled')}
                    >
                      Cancel &amp; return stock
                    </button>
                  </div>
                )}

                {isAdmin && order.status === 'ready' && (
                  <div className="order-actions">
                    <button
                      type="button"
                      className="order-status-btn"
                      onClick={() => onUpdateStatus(order.id, 'completed')}
                    >
                      Mark complete
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
