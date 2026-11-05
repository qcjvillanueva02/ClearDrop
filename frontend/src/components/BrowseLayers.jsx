import React, { useState } from 'react';

const STAGES = [
  {
    category: 'intake',
    stage: 'Stage 1',
    title: 'Raw Water Intake',
    meta: 'Pre-screen inlet\nCaptures leaves, grit, and large debris',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 7h16M7 12h10M9 17h6" />
        <circle cx="12" cy="12" r="8" />
      </svg>
    )
  },
  {
    category: 'sediment',
    stage: 'Stage 2',
    title: 'Sediment Trap',
    meta: 'Sand and gravel bed\nRemoves dirt, soil, and suspended solids',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 13h18M6 9h12M9 5h6" />
        <path d="M6 17h12" />
      </svg>
    )
  },
  {
    category: 'carbon',
    stage: 'Stage 3',
    title: 'Activated Carbon',
    meta: 'Adsorption layer\nRemoves odor, chlorine, and discoloration',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3c4 3 6 6 6 9a6 6 0 1 1-12 0c0-3 2-6 6-9Z" />
        <path d="M12 7v10M8 9h8" />
      </svg>
    )
  },
  {
    category: 'membrane',
    stage: 'Stage 4',
    title: 'Ceramic Membrane',
    meta: 'Fine-pore barrier\nPerformance depends on the selected filter rating',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M8 10h8M8 14h8" />
      </svg>
    )
  },
  {
    category: 'sterilizer',
    stage: 'Optional',
    title: 'UV Disinfection',
    meta: 'Optional powered add-on\nNeeds correct sizing and regular maintenance',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M19.07 4.93l-2.83 2.83M22 12h-4M4.93 19.07l2.83-2.83M12 22v-4M19.07 19.07l-2.83-2.83" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  },
  {
    category: 'storage',
    stage: 'Final Stage',
    title: 'Clean Water Tank',
    meta: 'Safe storage chamber\nStores filtered water for daily household use',
    icon: (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="5" y="7" width="14" height="12" rx="2" />
        <path d="M8 7V4h8v3" />
        <path d="M12 11v4" />
      </svg>
    )
  }
];

export default function BrowseLayers({ onSelectStage, searchQuery }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', 'Intake', 'Sediment', 'Carbon', 'Membrane', 'Sterilizer', 'Storage'];

  const filteredStages = STAGES.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.meta.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="browse">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Inside the System</span>
          <h2>ClearDrop filtration layers</h2>
          <p>
            Each stage helps reduce debris, sediment, odor, or taste concerns before filtered water flows into a covered storage tank.
          </p>
        </div>

        <div className="filter-row">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid">
          {filteredStages.length === 0 ? (
            <p className="empty-state">No filtration layers match your search.</p>
          ) : (
            filteredStages.map((stage) => (
              <div key={stage.category} className="card" data-category={stage.category}>
                {stage.icon}
                <span className="status unclaimed">{stage.stage}</span>
                <h4>{stage.title}</h4>
                <div className="meta" style={{ whiteSpace: 'pre-line' }}>{stage.meta}</div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => onSelectStage(stage.category)}
                >
                  View Detail
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
