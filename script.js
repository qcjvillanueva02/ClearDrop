// ============================================================
// MOBILE NAV TOGGLE
// ============================================================
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// ============================================================
// FILTER CHIPS (visual only)
// ============================================================
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });
});

// ============================================================
// "THIS IS MINE" QUICK FEEDBACK
// ============================================================
document.querySelectorAll('.grid .btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const original = btn.textContent;
    btn.textContent = 'Reported to office ✓';
    btn.style.background = '#F6C400';
    btn.style.color = '#1A1712';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.style.color = '';
    }, 2200);
  });
});

// ============================================================
// REPORT FORM SUBMIT FEEDBACK (no backend — demo only)
// ============================================================
const form = document.getElementById('lostForm');
const note = document.getElementById('submitNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  note.classList.add('show');
  form.querySelector('button[type="submit"]').textContent = 'Submitted ✓';
});

// ============================================================
// LOGIN-FIRST GATE
// The Home page (#mainWebsite) stays hidden via CSS
// (display:none) until these credentials are accepted.
// ============================================================
const loginScreen  = document.getElementById('loginScreen');
const loginBox     = document.getElementById('loginBox');
const loginForm    = document.getElementById('loginForm');
const loginError   = document.getElementById('loginError');
const loginUser    = document.getElementById('loginUser');
const loginPass    = document.getElementById('loginPass');
const loginVideo   = document.getElementById('loginVideo');
const mainWebsite  = document.getElementById('mainWebsite');

// demo-only credentials — no backend/database
const DEMO_USER = '2410526';
const DEMO_PASS = '1234';

// ------------------------------------------------------------
// checkLoginState — runs once on load. If the user already has
// a saved session, skip the full-screen video login entirely
// and go straight to the Home page (logged-in navbar state).
// If not, run the normal full-screen login flow.
// ------------------------------------------------------------
function checkLoginState(){
  const alreadyLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (alreadyLoggedIn) {
    // Skip the video login screen completely — no flash, no animation.
    loginScreen.style.display = 'none';
    mainWebsite.classList.add('revealed');
    document.body.style.overflow = '';
    updateNavbar(true);
  } else {
    // First visit / no saved session — show the full-screen video login.
    setTimeout(() => loginUser.focus(), 400);
    loginVideo.play().catch(() => { /* autoplay may need a user gesture on some browsers */ });
    updateNavbar(false);
  }
}

window.addEventListener('DOMContentLoaded', checkLoginState);

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = loginUser.value.trim();
  const pass = loginPass.value.trim();

  if (user === DEMO_USER && pass === DEMO_PASS) {
    loginError.classList.remove('show');
    localStorage.setItem('isLoggedIn', 'true');
    handleSuccessfulLogin();
  } else {
    loginError.classList.add('show');
    loginBox.classList.remove('shake');
    void loginBox.offsetWidth; // restart shake animation
    loginBox.classList.add('shake');
  }
});

function handleSuccessfulLogin(){
  // Instant switch — no chained setTimeouts, no fade-out delay.
  // The moment the credentials are accepted, the login screen is
  // removed and the Home page is shown in the same frame, so there
  // is no gap (and therefore no white/blank flash) between the two.
  loginVideo.pause();
  loginScreen.style.display = 'none';

  mainWebsite.classList.add('revealed');
  document.body.style.overflow = '';

  // site is now fully interactive, logged in
  updateNavbar(true);
}

// ============================================================
// NAVBAR AUTH STATE — Login button / Account menu / Search
// ============================================================
const navAuthItem     = document.getElementById('navAuthItem');
const navLoginBtn     = document.getElementById('navLoginBtn');
const accountWrap     = document.getElementById('accountWrap');
const navAccountBtn   = document.getElementById('navAccountBtn');
const accountDropdown = document.getElementById('accountDropdown');
const logoutBtn       = document.getElementById('logoutBtn');

const loginModalOverlay = document.getElementById('loginModalOverlay');
const loginModalBox     = document.getElementById('loginModalBox');
const loginModalClose   = document.getElementById('loginModalClose');
const loginModalForm    = document.getElementById('loginModalForm');
const loginModalError   = document.getElementById('loginModalError');
const loginModalUser    = document.getElementById('loginModalUser');
const loginModalPass    = document.getElementById('loginModalPass');

const navSearchBtn   = document.getElementById('navSearchBtn');
const searchPanel    = document.getElementById('searchPanel');
const searchInput    = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const searchNoResults= document.getElementById('searchNoResults');

// ------------------------------------------------------------
// updateNavbar — swaps the navbar between Login button and
// Account ▾ menu depending on the saved login state.
// ------------------------------------------------------------
function updateNavbar(isLoggedIn){
  if (isLoggedIn) {
    navLoginBtn.style.display = 'none';
    accountWrap.style.display = 'block';
  } else {
    navLoginBtn.style.display = 'inline-block';
    accountWrap.style.display = 'none';
    accountDropdown.classList.remove('open');
    navAccountBtn.classList.remove('active');
  }
}

// ------------------------------------------------------------
// Login modal — opened from the navbar Login button. Shows a
// login form as an overlay on top of the current Home page.
// Never navigates away and never re-shows the full-screen login.
// ------------------------------------------------------------
function openLoginModal(){
  loginModalError.classList.remove('show');
  loginModalForm.reset();
  loginModalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => loginModalUser.focus(), 150);
}

function closeLoginModal(){
  loginModalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

navLoginBtn.addEventListener('click', openLoginModal);
loginModalClose.addEventListener('click', closeLoginModal);
loginModalOverlay.addEventListener('click', (e) => {
  if (e.target === loginModalOverlay) closeLoginModal();
});

function loginUserFromModal(){
  const user = loginModalUser.value.trim();
  const pass = loginModalPass.value.trim();

  if (user === DEMO_USER && pass === DEMO_PASS) {
    loginModalError.classList.remove('show');
    localStorage.setItem('isLoggedIn', 'true');
    updateNavbar(true);
    closeLoginModal();
  } else {
    loginModalError.classList.add('show');
    loginModalBox.classList.remove('shake');
    void loginModalBox.offsetWidth; // restart shake animation
    loginModalBox.classList.add('shake');
  }
}

loginModalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loginUserFromModal();
});

// ------------------------------------------------------------
// Account dropdown — toggles open/closed, closes on outside click.
// ------------------------------------------------------------
function toggleAccountMenu(){
  const isOpen = accountDropdown.classList.toggle('open');
  navAccountBtn.classList.toggle('active', isOpen);
  navAccountBtn.setAttribute('aria-expanded', String(isOpen));
}

navAccountBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleAccountMenu();
});

document.addEventListener('click', (e) => {
  if (!accountWrap.contains(e.target)) {
    accountDropdown.classList.remove('open');
    navAccountBtn.classList.remove('active');
  }
});

// ------------------------------------------------------------
// Logout — clears saved session, updates navbar, stays on the
// current Home page. No redirect, no reload.
// ------------------------------------------------------------
function logoutUser(){
  localStorage.removeItem('isLoggedIn');
  accountDropdown.classList.remove('open');
  navAccountBtn.classList.remove('active');
  updateNavbar(false);
}

logoutBtn.addEventListener('click', logoutUser);

// ============================================================
// SEARCH — filters the existing Lost & Found item cards
// ============================================================
function searchItems(query){
  const q = query.trim().toLowerCase();
  const cards = document.querySelectorAll('#browse .grid .card');
  let anyVisible = false;

  cards.forEach(card => {
    const haystack = card.textContent.toLowerCase();
    const isMatch = q === '' || haystack.includes(q);
    card.style.display = isMatch ? '' : 'none';
    if (isMatch) anyVisible = true;
  });

  searchNoResults.classList.toggle('show', !anyVisible);
}

navSearchBtn.addEventListener('click', () => {
  const isOpen = searchPanel.classList.toggle('open');
  navSearchBtn.classList.toggle('active', isOpen);
  navSearchBtn.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) setTimeout(() => searchInput.focus(), 200);
});

searchInput.addEventListener('input', () => searchItems(searchInput.value));

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchItems('');
  searchInput.focus();
});

// ============================================================
// HELP ME FIND MY ITEM — category → brand → design → color →
// logo → details → results wizard
// ============================================================
(function(){

  function slug(str){
    return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  const CATEGORY_LABELS = {
    phone:'Phones', ids:"ID's", creditcard:'Credit Cards', wallet:'Wallets',
    keys:'Keys', bags:'Bags', eyewear:'Eyewear', laptop:'Laptops',
    earphones:'Earphones', smartwatch:'Smartwatches', charger:'Chargers',
    tablet:'Tablets', other:'Other Items'
  };

  const BRANDS = {
    phone: ['Apple','Samsung','Xiaomi','Oppo','Vivo','Huawei','Google','Other'],
    laptop: ['Dell','HP','Lenovo','Asus','Acer','Apple','MSI','Other'],
    earphones: ['Apple','Samsung','Sony','JBL','Xiaomi','Anker','Other'],
    smartwatch: ['Apple','Samsung','Huawei','Xiaomi','Garmin','Fitbit','Other'],
    tablet: ['Apple','Samsung','Lenovo','Huawei','Other'],
    wallet: ['Leather','Fabric / Nylon','Cardholder','Other'],
    keys: ['Car Key','House Key','Keychain (multiple keys)','Other'],
    bags: ['Backpack','Sling Bag','Tote / Handbag','Duffel Bag','Other'],
    eyewear: ['Sunglasses','Prescription Glasses','Reading Glasses','Other'],
    charger: ['Phone Charger','Laptop Charger','Power Bank','Cable Only','Other'],
    ids: ['School ID','Government ID','Employee ID','Other'],
    creditcard: ['BDO','BPI','Metrobank','UnionBank','Other'],
    other: ['Not Sure / Other']
  };

  // brand-aware "design" options. Return null to skip the design step.
  function getDesignOptions(category, brand){
    if (category === 'phone'){
      if (brand === 'apple') return ['iPhone with 1 camera','iPhone with 2 cameras','iPhone with 3 cameras','Not sure'];
      if (brand === 'samsung') return ['Galaxy S Series','Galaxy A Series','Galaxy Note','Other / Not sure'];
      return null;
    }
    if (category === 'laptop') return ['Standard laptop','2-in-1 / Foldable','Gaming laptop (thick, RGB)','Not sure'];
    if (category === 'earphones') return ['True wireless earbuds','Neckband style','Over-ear headphones','Wired earphones'];
    if (category === 'smartwatch') return ['Round face','Square / rectangular face','Fitness band (no watch face)','Not sure'];
    return null;
  }

  const COLORS = ['Black','White','Silver','Gray','Blue','Red','Green','Gold','Pink','Purple','Other / Not Sure'];
  const COLOR_SWATCH = {
    black:'#1A1712', white:'#ffffff', silver:'#c9c9c9', gray:'#8a8a8a',
    blue:'#2f6fce', red:'#d9480f', green:'#3f7d3a', gold:'#d4af37',
    pink:'#e78bb0', purple:'#7c5cbf', 'other-not-sure':'#ffffff'
  };

  // categories where a logo question makes sense
  const LOGO_CATEGORIES = ['phone','laptop','earphones','smartwatch','tablet','creditcard','ids'];

  function getLogoOptions(category){
    return LOGO_CATEGORIES.includes(category) ? BRANDS[category] : null;
  }

  // ------------------------------------------------------------
  // Wizard state
  // ------------------------------------------------------------
  let state = {};
  let steps = [];   // e.g. ['brand','design','color','logo','details','results']
  let stepIndex = 0;

  function resetState(category){
    state = { category: category, brand:null, design:null, color:null, logo:null, details:'' };
    steps = ['brand', 'color', 'details', 'results']; // rebuilt once brand/category known
    stepIndex = 0;
  }

  function rebuildSteps(){
    const s = ['brand'];
    if (getDesignOptions(state.category, state.brand)) s.push('design');
    s.push('color');
    if (getLogoOptions(state.category)) s.push('logo');
    s.push('details');
    s.push('results');
    steps = s;
  }

  // ------------------------------------------------------------
  // DOM refs
  // ------------------------------------------------------------
  const finderCatGrid       = document.getElementById('finderCatGrid');
  const finderModalOverlay  = document.getElementById('finderModalOverlay');
  const finderModalBox      = document.getElementById('finderModalBox');
  const finderModalClose    = document.getElementById('finderModalClose');
  const finderProgress      = document.getElementById('finderProgress');
  const finderBackBtn       = document.getElementById('finderBackBtn');
  const finderStepTitle     = document.getElementById('finderModalTitle');
  const finderStepBody      = document.getElementById('finderStepBody');
  const finderStepActions   = document.getElementById('finderStepActions');

  function openFinderModal(category){
    resetState(category);
    finderModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderStep();
  }

  function closeFinderModal(){
    finderModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  finderCatGrid.querySelectorAll('.finder-cat-card').forEach(card => {
    card.addEventListener('click', () => openFinderModal(card.dataset.category));
  });

  finderModalClose.addEventListener('click', closeFinderModal);
  finderModalOverlay.addEventListener('click', (e) => {
    if (e.target === finderModalOverlay) closeFinderModal();
  });

  finderBackBtn.addEventListener('click', () => {
    if (stepIndex > 0){
      stepIndex--;
      renderStep();
    } else {
      // back from the very first question (Brand) returns to category picking
      closeFinderModal();
    }
  });

  function goNext(){
    if (stepIndex < steps.length - 1){
      stepIndex++;
      renderStep();
    }
  }

  // ------------------------------------------------------------
  // Progress pills — shows Category (always done) + dynamic steps
  // ------------------------------------------------------------
  function renderProgress(){
    const labels = { brand:'Brand', design:'Design', color:'Color', logo:'Logo', details:'Details', results:'Results' };
    let html = '<span class="finder-progress-step done">1. Category</span>';
    steps.forEach((s, i) => {
      const cls = i < stepIndex ? 'done' : (i === stepIndex ? 'current' : '');
      html += `<span class="finder-progress-step ${cls}">${i + 2}. ${labels[s]}</span>`;
    });
    finderProgress.innerHTML = html;
  }

  // ------------------------------------------------------------
  // Step renderers
  // ------------------------------------------------------------
  function renderStep(){
    const current = steps[stepIndex];
    renderProgress();
    finderBackBtn.classList.add('show');
    finderBackBtn.textContent = (stepIndex > 0) ? '← Back' : '← Change Category';
    finderStepActions.innerHTML = '';

    if (current === 'brand') return renderBrandStep();
    if (current === 'design') return renderDesignStep();
    if (current === 'color') return renderColorStep();
    if (current === 'logo') return renderLogoStep();
    if (current === 'details') return renderDetailsStep();
    if (current === 'results') return renderResultsStep();
  }

  function renderBrandStep(){
    finderStepTitle.textContent = 'What brand is it?';
    const brands = BRANDS[state.category] || ['Other'];
    let html = '<div class="finder-option-grid">';
    brands.forEach(b => {
      html += `<button type="button" class="finder-option-btn" data-value="${slug(b)}">${b}</button>`;
    });
    html += '<button type="button" class="finder-option-btn not-sure" data-value="">Not Sure</button></div>';
    finderStepBody.innerHTML = html;

    finderStepBody.querySelectorAll('.finder-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.brand = btn.dataset.value || null;
        rebuildSteps();
        stepIndex = steps.indexOf('brand') + 1;
        renderStep();
      });
    });
  }

  function renderDesignStep(){
    finderStepTitle.textContent = 'What does it look like?';
    const designs = getDesignOptions(state.category, state.brand) || ['Not sure'];
    finderStepBody.innerHTML = `
      <p class="finder-step-sub">Which design looks closest?</p>
      <div class="finder-design-grid">
        ${designs.map(d => `<button type="button" class="finder-design-card" data-value="${slug(d)}">${d}</button>`).join('')}
      </div>`;
    finderStepBody.querySelectorAll('.finder-design-card').forEach(btn => {
      btn.addEventListener('click', () => {
        state.design = btn.dataset.value || null;
        goNext();
      });
    });
  }

  function renderColorStep(){
    finderStepTitle.textContent = 'What color is it?';
    let html = '<div class="finder-color-grid">';
    COLORS.forEach(c => {
      const sw = COLOR_SWATCH[slug(c)] || '#efe4bd';
      const border = (c === 'White') ? 'border:2px solid #d8c98c;' : '';
      html += `<button type="button" class="finder-color-btn" data-value="${slug(c)}">
                 <span class="finder-color-swatch" style="background:${sw};${border}"></span>${c}
               </button>`;
    });
    html += '</div>';
    finderStepBody.innerHTML = html;

    finderStepBody.querySelectorAll('.finder-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.value;
        state.color = (v === 'other-not-sure') ? null : v;
        goNext();
      });
    });
  }

  function renderLogoStep(){
    finderStepTitle.textContent = 'What logo or marking does it have?';
    const logos = getLogoOptions(state.category) || ['Other'];
    let html = '<div class="finder-option-grid">';
    logos.forEach(l => {
      html += `<button type="button" class="finder-option-btn" data-value="${slug(l)}">${l}</button>`;
    });
    html += '<button type="button" class="finder-option-btn not-sure" data-value="">Not Sure</button></div>';
    finderStepBody.innerHTML = html;

    finderStepBody.querySelectorAll('.finder-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.logo = btn.dataset.value || null;
        goNext();
      });
    });
  }

  function renderDetailsStep(){
    finderStepTitle.textContent = 'Is there anything special about it?';
    finderStepBody.innerHTML = `
      <p class="finder-step-sub">Optional — case, sticker, damage, keychain, or other detail.</p>
      <textarea class="finder-details-input" id="finderDetailsInput" rows="3"
        placeholder="Describe any case, sticker, damage, keychain, or other detail...">${state.details || ''}</textarea>`;

    finderStepActions.innerHTML = `
      <button type="button" class="btn btn-ghost" id="finderSkipDetails">Skip</button>
      <button type="button" class="btn btn-primary" id="finderContinueDetails">See Matching Items</button>`;

    document.getElementById('finderSkipDetails').addEventListener('click', () => {
      state.details = '';
      goNext();
    });
    document.getElementById('finderContinueDetails').addEventListener('click', () => {
      state.details = document.getElementById('finderDetailsInput').value.trim();
      goNext();
    });
  }

  // ------------------------------------------------------------
  // Matching — scores existing Lost & Found cards against state
  // ------------------------------------------------------------
  function scoreCard(card){
    const d = card.dataset;
    let score = 0;

    if (state.category && d.category === state.category) score += 4;
    if (state.brand && d.brand && d.brand === state.brand) score += 3;
    if (state.design && d.design && d.design === state.design) score += 3;
    if (state.color && d.color && d.color === state.color) score += 2;
    if (state.logo && d.logo && d.logo === state.logo) score += 2;

    if (state.details){
      const words = state.details.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
      const haystack = card.textContent.toLowerCase();
      let detailHits = 0;
      words.forEach(w => { if (haystack.includes(w)) detailHits++; });
      score += Math.min(detailHits, 3);
    }

    return score;
  }

  function renderResultsStep(){
    finderStepTitle.textContent = 'We found these items that may be yours.';

    const allCards = Array.from(document.querySelectorAll('#browse .grid .card'));
    const scored = allCards
      .map(card => ({ card, score: scoreCard(card) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const summaryParts = [];
    summaryParts.push(`<b>Category:</b> ${CATEGORY_LABELS[state.category] || state.category}`);
    if (state.brand) summaryParts.push(`<b>Brand:</b> ${state.brand.replace(/-/g,' ')}`);
    if (state.design) summaryParts.push(`<b>Design:</b> ${state.design.replace(/-/g,' ')}`);
    if (state.color) summaryParts.push(`<b>Color:</b> ${state.color.replace(/-/g,' ')}`);
    if (state.logo) summaryParts.push(`<b>Logo:</b> ${state.logo.replace(/-/g,' ')}`);
    if (state.details) summaryParts.push(`<b>Details:</b> ${state.details}`);

    let html = `<div class="finder-results-summary">${summaryParts.join('<br>')}</div>`;

    if (scored.length === 0){
      html += `<p class="finder-no-results">No items found that match yet. Try starting over with fewer details, or browse everything logged so far.</p>`;
      finderStepBody.innerHTML = html;
    } else {
      html += '<div class="finder-results-grid" id="finderResultsGrid"></div>';
      finderStepBody.innerHTML = html;
      const resultsGrid = document.getElementById('finderResultsGrid');
      scored.forEach(({ card }) => resultsGrid.appendChild(card.cloneNode(true)));

      // delegated "This is mine" feedback for cloned buttons
      resultsGrid.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const original = btn.textContent;
          btn.textContent = 'Reported to office ✓';
          btn.style.background = '#F6C400';
          btn.style.color = '#1A1712';
          setTimeout(() => {
            btn.textContent = original;
            btn.style.background = '';
            btn.style.color = '';
          }, 2200);
        });
      });
    }

    finderStepActions.innerHTML = `
      <button type="button" class="btn btn-ghost" id="finderStartOver">Start Over</button>
      <button type="button" class="btn btn-primary" id="finderBrowseAll">Browse All Items</button>`;

    document.getElementById('finderStartOver').addEventListener('click', () => {
      closeFinderModal();
      document.getElementById('finder').scrollIntoView({ behavior:'smooth' });
    });
    document.getElementById('finderBrowseAll').addEventListener('click', () => {
      closeFinderModal();
      document.getElementById('browse').scrollIntoView({ behavior:'smooth' });
    });
  }

})();
