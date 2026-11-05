import React from 'react';

export default function HowItWorks() {
  return (
    <section id="how">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow" style={{ color: 'var(--sun)' }}>The Process</span>
          <h2>How ClearDrop works</h2>
          <p>
            Water moves through the main filter by gravity. Optional powered disinfection is a separate add-on and requires its own maintenance.
          </p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="num">01</div>
            <h4>Water enters</h4>
            <p>
              Rainwater or unsafe water first passes through a coarse intake screen to remove leaves, floating debris, and large particles.
            </p>
          </div>
          <div className="step">
            <div className="num">02</div>
            <h4>Layers filter it</h4>
            <p>
              Gravel, sand, activated carbon, and a ceramic filter provide successive filtration stages without electricity in the basic design.
            </p>
          </div>
          <div className="step">
            <div className="num">03</div>
            <h4>Clean water is stored</h4>
            <p>
              Filtered water flows into a covered tank. Test water quality and follow local health guidance before using it for drinking.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
