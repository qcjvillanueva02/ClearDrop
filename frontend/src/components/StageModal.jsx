import React from 'react';

const STAGE_DETAILS = {
  intake: {
    title: 'Stage 1 · Raw Water Intake',
    subtitle: 'Pre-Screen Inlet & Coarse Filtration',
    description:
      'The first line of defense in the ClearDrop system. Raw water from rainwater collection or untreated sources passes through a washable 304 stainless or food-grade HDPE mesh screen.',
    benefits: [
      'Intercepts leaves, twigs, insects, and large debris',
      'Protects deeper sand & ceramic stages from premature clogging',
      'Easily rinsed with clean water without disassembling the main tank'
    ]
  },
  sediment: {
    title: 'Stage 2 · Sediment Trap',
    subtitle: 'Graded Sand & Gravel Bed',
    description:
      'A multi-density physical filtration bed consisting of clean washed graded gravel (bottom) and fine quartz filter sand (top). Silt and particulate matter are trapped within the granular pores.',
    benefits: [
      'Removes suspended soil, turbidity, and fine cloudiness',
      'Utilizes slow gravity settlement for maximum particle capture',
      'Long-lasting natural mineral media that can be backwashed or replaced'
    ]
  },
  carbon: {
    title: 'Stage 3 · Activated Carbon',
    subtitle: 'Coconut-Shell Adsorption Layer',
    description:
      'High-iodine activated carbon granules produced from sustainable coconut shells. Provides an enormous internal surface area that chemically adsorbs dissolved contaminants.',
    benefits: [
      'Eliminates objectionable odors, chlorine, and swampy taste',
      'Adsorbs volatile organic compounds (VOCs) and pesticides',
      'Leaves water clear, fresh, and naturally palatable'
    ]
  },
  membrane: {
    title: 'Stage 4 · Ceramic Membrane',
    subtitle: 'Sub-Micron Porous Microfilter Element',
    description:
      'High-fired diatomaceous ceramic candle element with micro-porous filtration structure. As water percolates through the ceramic walls, micro-organisms and protozoan cysts are barred.',
    benefits: [
      'Sub-micron mechanical barrier against micro-particulates',
      'Washable outer surface: scrub with a soft brush when flow rate slows',
      'Gravity-powered without pumps, electricity, or chemical additives'
    ]
  },
  sterilizer: {
    title: 'Optional · UV Disinfection Add-on',
    subtitle: 'Germicidal Ultra-Violet Disinfection',
    description:
      'An optional modular add-on for installations where low-voltage DC solar power or battery backup is available. Destroys the DNA of bacteria and viruses in passing water.',
    benefits: [
      'Secondary disinfection without adding chlorine or leaving taste',
      'Instant biological neutralization before storage',
      'Easy retrofitting onto the ClearDrop gravity outlet pipe'
    ]
  },
  storage: {
    title: 'Final Stage · Clean Water Storage',
    subtitle: 'Food-Grade HDPE Reservoir with Safe Tap',
    description:
      'The purified water collects in a sealed, food-grade HDPE lower container equipped with an airtight gasket, insect-proof vent, and a sanitary dispensing outlet tap.',
    benefits: [
      'Protects treated water from re-contamination and mosquitoes',
      'Food-grade certified, BPA-free polymer construction',
      'Ergonomic dispensing tap designed for daily family drinking containers'
    ]
  }
};

export default function StageModal({ stageKey, onClose }) {
  if (!stageKey) return null;

  const info = STAGE_DETAILS[stageKey] || STAGE_DETAILS.intake;

  return (
    <div className="stage-modal-overlay open" id="stageModal" onClick={onClose} aria-hidden="false">
      <div
        className="stage-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stageModalTitle"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="login-modal-close"
          id="stageModalClose"
          aria-label="Close details"
          onClick={onClose}
        >
          &times;
        </button>
        <span className="eyebrow" style={{ color: 'var(--ocean-blue)' }}>Filtration Spec</span>
        <h3 id="stageModalTitle">{info.title}</h3>
        <div className="stage-modal-subtitle" id="stageModalSubtitle">{info.subtitle}</div>
        <p id="stageModalDesc">{info.description}</p>
        <h4 style={{ fontSize: '0.95rem', margin: '12px 0 6px' }}>Key Function &amp; Benefits:</h4>
        <ul className="stage-benefits" id="stageModalBenefits">
          {info.benefits.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        <button className="btn btn-primary" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
