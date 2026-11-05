import React from 'react';

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <h5>ClearDrop</h5>
            <p style={{ maxWidth: '320px' }}>
              A gravity-based water filtration concept designed to make water treatment simpler for homes, schools, and local communities.
            </p>
          </div>
          <div>
            <h5>Quick Links</h5>
            <p><a href="#browse">Inside the System</a></p>
            <p><a href="#how">How It Works</a></p>
            <p><a href="#orders">Pending Orders</a></p>
          </div>
          <div>
            <h5>Deployment &amp; Cloud</h5>
            <p>React Frontend on Vercel</p>
            <p>Node.js Backend on Render</p>
            <p>PostgreSQL on Supabase</p>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 ClearDrop Project</span>
          <span>Affordable Clean Water Initiative</span>
        </div>
      </div>
    </footer>
  );
}
