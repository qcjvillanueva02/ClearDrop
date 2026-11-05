import React from 'react';

export default function About() {
  return (
    <section id="about">
      <div className="wrap about-grid">
        <div className="about-visual">
          <svg className="petal-big" viewBox="0 0 40 40" fill="none">
            <g fill="#4169E1">
              <ellipse cx="20" cy="8" rx="5" ry="9" />
              <ellipse cx="20" cy="32" rx="5" ry="9" />
              <ellipse cx="8" cy="20" rx="9" ry="5" />
              <ellipse cx="32" cy="20" rx="9" ry="5" />
              <ellipse cx="11.5" cy="11.5" rx="5" ry="9" transform="rotate(45 11.5 11.5)" />
              <ellipse cx="28.5" cy="28.5" rx="5" ry="9" transform="rotate(45 28.5 28.5)" />
              <ellipse cx="28.5" cy="11.5" rx="5" ry="9" transform="rotate(-45 28.5 11.5)" />
              <ellipse cx="11.5" cy="28.5" rx="5" ry="9" transform="rotate(-45 11.5 28.5)" />
            </g>
            <circle cx="20" cy="20" r="7" fill="#FFFFFF" />
          </svg>
        </div>
        <div className="about-copy">
          <span
            className="eyebrow"
            style={{
              color: 'var(--alert)',
              fontFamily: "'IBM Plex Mono',monospace",
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            About ClearDrop
          </span>
          <h2 style={{ margin: '12px 0 16px' }}>
            A simple gravity filter built for real communities
          </h2>
          <p>
            ClearDrop was designed to solve a common problem: many families and small communities still rely on unsafe or inconsistent water sources. The system uses natural gravity to clean water without heavy electricity use or expensive machinery.
          </p>
          <p>
            We built it because clean water should be practical, affordable, and easy to maintain. With a compact layered design, ClearDrop can provide better water quality for households, schools, and rural community centers.
          </p>
          <ul className="fact-list">
            <li>Low-cost filtration system using gravity flow</li>
            <li>Built with sediment, carbon, ceramic, and storage stages</li>
            <li>Designed for households, schools, and barangay use</li>
            <li>Made to support clean water access and sustainability</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
