import React from 'react';

export default function Hero() {
  return (
    <section id="home" className="hero cork">
      <div className="hero-water-effects" aria-hidden="true">
        <span className="hero-drop hero-drop-one"></span>
        <span className="hero-drop hero-drop-two"></span>
        <span className="hero-drop hero-drop-three"></span>
        <span className="hero-water-orbit hero-water-orbit-one"></span>
        <span className="hero-water-orbit hero-water-orbit-two"></span>
      </div>

      <div className="wrap hero-grid">
        <div className="hero-copy">
          <span className="hero-eyebrow">ClearDrop Gravity Filter Ordering System</span>
          <h1>
            Clean water,<br />
            without the <span className="hi">complicated</span> system.
          </h1>
          <p className="lede">
            An electricity-free, flood-ready household water filter ordering and inventory system of materials.
          </p>
          <div className="btn-row">
            <a href="#dashboard" className="btn btn-primary">Order Materials</a>
            <a href="#orders" className="btn btn-ghost">View Pending Orders</a>
          </div>

          <div className="tear-strip">
            <h3>Inside the system</h3>
            <div className="tabs">
              <div className="tab">Intake Screen</div>
              <div className="tab">Sediment Filter</div>
              <div className="tab">Carbon Layer</div>
              <div className="tab">Ceramic Membrane</div>
              <div className="tab">Storage Tank</div>
              <div className="tab">Safe Outlet</div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-illustration-frame">
            <svg
              className="filter-illustration"
              viewBox="0 0 520 460"
              role="img"
              aria-labelledby="filterTitle filterDescription"
            >
              <title id="filterTitle">ClearDrop gravity filter cutaway</title>
              <desc id="filterDescription">
                Water flows through an intake screen, gravel, sand, activated carbon, and a ceramic membrane into a clean-water reservoir.
              </desc>
              <defs>
                <linearGradient id="tank" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#B9F2FF" />
                  <stop offset="1" stopColor="#4169E1" />
                </linearGradient>
                <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#DFF7FF" />
                  <stop offset="1" stopColor="#75D8F3" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle className="illustration-orbit orbit-one" cx="260" cy="225" r="195" />
              <circle className="illustration-orbit orbit-two" cx="260" cy="225" r="165" />
              <g className="filter-unit">
                <path d="M182 42h156l-18 44H200z" fill="#fff" stroke="#102A43" strokeWidth="5" />
                <path d="M202 90h116v26H202z" fill="#DFF7FF" stroke="#102A43" strokeWidth="5" />
                <path d="M211 116h98v48h-98z" fill="#75D8F3" stroke="#102A43" strokeWidth="5" />
                <path d="M211 164h98v48h-98z" fill="#4169E1" stroke="#102A43" strokeWidth="5" />
                <path d="M211 212h98v48h-98z" fill="#B9F2FF" stroke="#102A43" strokeWidth="5" />
                <path d="M211 260h98v50h-98z" fill="#fff" stroke="#102A43" strokeWidth="5" />
                <path d="M211 310h98v66H211z" fill="url(#tank)" stroke="#102A43" strokeWidth="5" />
                <path d="M219 337c22-12 58 12 82 0v32h-82z" fill="url(#water)" className="water-level" />
                <path d="M246 376v24h46" fill="none" stroke="#102A43" strokeWidth="8" strokeLinecap="round" />
                <path d="M292 400h24" fill="none" stroke="#087EA4" strokeWidth="8" strokeLinecap="round" />
                <path d="M260 20v43" stroke="#4169E1" strokeWidth="8" strokeLinecap="round" className="water-drop" />
                <path d="M238 129h44M238 177h44M238 226h44M238 275h44" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
                <circle cx="260" cy="112" r="6" fill="#fff" filter="url(#glow)" className="bubble bubble-one" />
                <circle cx="278" cy="199" r="5" fill="#fff" filter="url(#glow)" className="bubble bubble-two" />
                <circle cx="242" cy="295" r="5" fill="#fff" filter="url(#glow)" className="bubble bubble-three" />
              </g>
              <g className="diagram-label">
                <path d="M338 104h74" stroke="#4169E1" strokeWidth="3" />
                <circle cx="338" cy="104" r="5" fill="#4169E1" />
                <text x="420" y="109">GRAVEL</text>
                <path d="M338 181h74" stroke="#087EA4" strokeWidth="3" />
                <circle cx="338" cy="181" r="5" fill="#087EA4" />
                <text x="420" y="186">SAND</text>
                <path d="M338 229h74" stroke="#4169E1" strokeWidth="3" />
                <circle cx="338" cy="229" r="5" fill="#4169E1" />
                <text x="420" y="234">CARBON</text>
                <path d="M338 277h74" stroke="#75D8F3" strokeWidth="3" />
                <circle cx="338" cy="277" r="5" fill="#75D8F3" />
                <text x="420" y="282">CERAMIC</text>
              </g>
              <text className="diagram-caption" x="260" y="437" textAnchor="middle">
                PURE WATER, POWERED BY GRAVITY
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
