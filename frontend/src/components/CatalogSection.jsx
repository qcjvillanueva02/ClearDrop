import React, { useState, useEffect } from 'react';
import { catalogApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CatalogSection() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState({ products: [], components: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatMoney = (cents) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(cents || 0) / 100);
  };

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await catalogApi.getCatalog();
        setCatalog(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section id="catalog" className="catalog-section" aria-labelledby="catalogTitle">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Phase 1 · Catalog</span>
          <h2 id="catalogTitle">Products, components &amp; BOM</h2>
          <p>
            Finished-goods and cartridge estimates are planning inputs. Bill-of-material changes create a new version so prior specifications remain traceable.
          </p>
        </div>

        {error && <p className="dashboard-message is-error show">{error}</p>}

        {/* Finished Goods */}
        <div className="catalog-subsection">
          <div className="dashboard-toolbar">
            <div>
              <h3>Finished goods</h3>
              <p>Sale price, estimated unit cost, and the current material BOM.</p>
            </div>
          </div>
          <div className="catalog-grid" id="catalogProducts">
            {loading ? (
              <p className="empty-state">Loading catalog…</p>
            ) : catalog.products.length === 0 ? (
              <p className="empty-state">No products registered.</p>
            ) : (
              catalog.products.map((prod) => (
                <article key={prod.id} className="catalog-card">
                  <div className="catalog-card-head">
                    <span className="catalog-sku">{prod.sku}</span>
                    <span className="catalog-type">{prod.product_type}</span>
                  </div>
                  <h4>{prod.name}</h4>
                  <p>{prod.description}</p>
                  <div className="catalog-pricing">
                    <div>
                      <span>Sale price</span>
                      <strong>{formatMoney(prod.sale_price_cents)}</strong>
                    </div>
                    {prod.estimated_unit_cost_cents && (
                      <div>
                        <span>Est. unit cost</span>
                        <strong>{formatMoney(prod.estimated_unit_cost_cents)}</strong>
                      </div>
                    )}
                  </div>
                  {prod.bom && (
                    <div className="catalog-bom-summary">
                      <h5>BOM v{prod.bom.version}</h5>
                      <ul>
                        {(prod.bom.items || []).map((item, idx) => (
                          <li key={idx}>
                            {item.quantity_milli / 1000} {item.unit} × {item.name}
                          </li>
                        ))}
                      </ul>
                      {prod.bom.estimated_material_cost_cents > 0 && (
                        <small>
                          Est. Material: {formatMoney(prod.bom.estimated_material_cost_cents)}
                        </small>
                      )}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>

        {/* Components */}
        <div className="catalog-subsection">
          <div className="dashboard-toolbar">
            <div>
              <h3>Components &amp; raw materials</h3>
              <p>Available quantity is shown for planning. Ledger-controlled stock updates.</p>
            </div>
          </div>
          <div className="catalog-grid" id="catalogComponents">
            {loading ? (
              <p className="empty-state">Loading components…</p>
            ) : catalog.components.length === 0 ? (
              <p className="empty-state">No components registered.</p>
            ) : (
              catalog.components.map((comp) => (
                <article key={comp.id} className="catalog-card">
                  <div className="catalog-card-head">
                    <span className="catalog-sku">{comp.code}</span>
                    <span className="catalog-type">{comp.stock} in stock</span>
                  </div>
                  <h4>{comp.name}</h4>
                  <p>{comp.description}</p>
                  <div className="catalog-pricing">
                    <div>
                      <span>Customer price</span>
                      <strong>{formatMoney(comp.price_cents)}</strong>
                    </div>
                    <div>
                      <span>Reorder threshold</span>
                      <strong>{comp.low_stock_at} {comp.unit}s</strong>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
