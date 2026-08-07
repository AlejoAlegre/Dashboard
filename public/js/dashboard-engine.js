/* ══════════════════════════════════════════════════════════════
   StudyDash — Dashboard Rendering Engine
   Reads JSON from sessionStorage, renders each active module
   following the master template structure and logic.
══════════════════════════════════════════════════════════════ */

const COLOR_MAPS = {
  tag: {
    blue:   { bg:'#E6F1FB', color:'#0C447C' },
    green:  { bg:'#EAF3DE', color:'#27500A' },
    amber:  { bg:'#FAEEDA', color:'#633806' },
    purple: { bg:'#EEEDFE', color:'#3C3489' },
    coral:  { bg:'#FAECE7', color:'#712B13' },
    teal:   { bg:'#E1F5EE', color:'#085041' },
  },
  dot: {
    blue:   'dot-blue',
    green:  'dot-green',
    amber:  'dot-amber',
    purple: 'dot-purple',
    coral:  'dot-coral',
    teal:   'dot-teal',
  },
  branch: {
    blue:   '#185FA5',
    green:  '#3B6D11',
    amber:  '#854F0B',
    purple: '#534AB7',
    coral:  '#993C1D',
    teal:   '#0F6E56',
  },
  weight: {
    blue:   '#185FA5',
    green:  '#3B6D11',
    amber:  '#854F0B',
    purple: '#534AB7',
    coral:  '#993C1D',
    teal:   '#0F6E56',
  },
};

const MODULE_LABELS = {
  summary:  'Resumen',
  concepts: 'Conceptos',
  compare:  'Comparación',
  process:  'Proceso',
  classify: 'Clasificación',
  formulas: 'Fórmulas',
  map:      'Mapa',
  authors:  'Autores',
  errors:   'Errores comunes',
  quiz:     'Autoevaluación',
  exec:     'Resumen final',
};

const MODULE_ORDER = [
  'summary','concepts','compare','process','formulas',
  'classify','map','authors','errors','quiz','exec',
];

// Holds the parsed dashboard JSON — used by export functions
let _dashboardData = null;

// ── Helpers ───────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
// Allow safe HTML (strong, em, br only)
function safeHtml(str) {
  if (!str) return '';
  const cleaned = String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return cleaned
    .replace(/&lt;strong&gt;/g,'<strong>')
    .replace(/&lt;\/strong&gt;/g,'</strong>')
    .replace(/&lt;em&gt;/g,'<em>')
    .replace(/&lt;\/em&gt;/g,'</em>')
    .replace(/&lt;br&gt;/g,'<br>')
    .replace(/&lt;br\/&gt;/g,'<br>');
}
function tagStyle(colorKey) {
  const c = COLOR_MAPS.tag[colorKey] || COLOR_MAPS.tag.blue;
  return `background:${c.bg};color:${c.color}`;
}

// ── Section header ────────────────────────────────────────────
function sectionHeader(icon, iconClass, title) {
  return `
    <div class="section-header">
      <div class="section-icon ${iconClass}">${icon}</div>
      <span class="section-title">${esc(title)}</span>
      <div class="section-line"></div>
    </div>`;
}

// ── MODULE RENDERERS ──────────────────────────────────────────

function renderSummary(mod) {
  return `
    <div class="section" data-module="summary" data-active="true" id="sec-summary">
      ${sectionHeader('◈','icon-blue','Resumen general')}
      <div class="summary-card">
        <p class="summary-text">${safeHtml(mod.mainText)}</p>
        ${mod.centralIdea ? `
        <div class="summary-highlight">
          ★ &nbsp;<span>${safeHtml(mod.centralIdea)}</span>
        </div>` : ''}
      </div>
    </div>`;
}

function renderConcepts(mod) {
  const tabs = mod.tabs || [];
  const tabsBar = tabs.length > 1
    ? `<div class="tabs-bar">${tabs.map((t,i) => `
        <button class="tab-btn${i===0?' active':''}" onclick="switchTab(this,'ctab-${i}')">${esc(t.label)}</button>
      `).join('')}</div>` : '';

  const panels = tabs.map((tab, i) => `
    <div id="ctab-${i}" class="tab-panel${i===0?' active':''}">
      <div class="concepts-grid">
        ${(tab.concepts || []).map(c => {
          const tierClass = c.tierLevel === 1 ? 'tier-1' : c.tierLevel === 3 ? 'tier-3' : 'tier-2';
          const dot = c.tierLevel === 1 ? '●' : c.tierLevel === 3 ? '▲' : '○';
          return `
          <div class="concept-card">
            <div class="concept-header">
              <span class="concept-name">${esc(c.name)}</span>
              <span class="concept-tier ${tierClass}">${dot} ${esc(c.tier)}</span>
            </div>
            <p class="concept-def">${safeHtml(c.definition)}</p>
            ${c.example ? `
            <div class="concept-example">
              <span class="ex-label">${esc(c.exampleLabel || 'Ejemplo')}:</span> ${safeHtml(c.example)}
            </div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');

  return `
    <div class="section" data-module="concepts" data-active="true" id="sec-concepts">
      ${sectionHeader('◉','icon-purple','Conceptos clave')}
      ${tabsBar}${panels}
    </div>`;
}

function renderCompare(mod) {
  const comparisons = mod.comparisons || [];
  if (!comparisons.length) return '';

  const items = comparisons.map((cmp, idx) => {
    if (cmp.type === 'binary') {
      const rows = cmp.rows || [];
      const binaryHtml = `
        <div class="compare-wrapper">
          <div class="compare-col compare-col-left">
            <div class="compare-header header-a">${esc(cmp.headerA)}</div>
            <div class="compare-rows">
              ${rows.map(r => `
              <div class="compare-row">
                <div class="compare-row-label">${esc(r.label)}</div>
                ${safeHtml(r.valueA)}
              </div>`).join('')}
            </div>
          </div>
          <div class="compare-divider">
            <div class="vs-circle">vs</div>
            <div class="divider-rows">
              ${rows.map(r => `<div class="divider-row">${esc(r.label)}</div>`).join('')}
            </div>
          </div>
          <div class="compare-col compare-col-right">
            <div class="compare-header header-b">${esc(cmp.headerB)}</div>
            <div class="compare-rows">
              ${rows.map(r => `<div class="compare-row">${safeHtml(r.valueB)}</div>`).join('')}
            </div>
          </div>
        </div>`;

      // First binary shown directly; subsequent ones in collapsible
      if (idx === 0) return binaryHtml;
      return `
        <div class="collapsible-header" onclick="toggleCollapsible(this)">
          <span class="collapsible-title">${esc(cmp.title || `${cmp.headerA} vs ${cmp.headerB}`)}</span>
          <span class="collapsible-arrow">▾</span>
        </div>
        <div class="collapsible-body">${binaryHtml}</div>`;

    } else if (cmp.type === 'multi') {
      const cols = cmp.columns || [];
      const colorKeys = ['blue','green','amber','purple','coral','teal'];
      const multiHtml = `
        <div class="compare-multi" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
          ${cols.map((col, ci) => {
            const ck = col.colorKey || colorKeys[ci % colorKeys.length];
            const st = tagStyle(ck);
            return `
            <div class="compare-multi-card">
              <div class="compare-multi-head" style="${st}">${esc(col.header)}</div>
              <div class="compare-multi-body">
                ${(col.rows || []).map(r => `
                <div class="compare-multi-row">
                  <span class="compare-multi-key">${esc(r.key)}</span>
                  ${safeHtml(r.value)}
                </div>`).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>`;

      return `
        <div class="collapsible-header" onclick="toggleCollapsible(this)">
          <span class="collapsible-title">${esc(cmp.title || 'Comparación ampliada')}</span>
          <span class="collapsible-arrow">▾</span>
        </div>
        <div class="collapsible-body" style="margin-top:4px">${multiHtml}</div>`;
    }
    return '';
  }).join('');

  return `
    <div class="section" data-module="compare" data-active="true" id="sec-compare">
      ${sectionHeader('⇄','icon-amber','Comparaciones visuales')}
      ${items}
    </div>`;
}

function renderProcess(mod) {
  const steps = mod.steps || [];
  const colorKeys = ['blue','green','amber','purple','coral','teal'];

  const stepsHtml = steps.map((step, idx) => {
    const ck = step.color || colorKeys[idx % colorKeys.length];
    const dotClass = COLOR_MAPS.dot[ck] || 'dot-blue';
    const isLast = idx === steps.length - 1;
    return `
    <div class="timeline-step">
      <div class="timeline-left">
        <div class="step-dot ${dotClass}">${step.number || idx+1}</div>
        ${!isLast ? '<div class="step-line"></div>' : ''}
      </div>
      <div class="timeline-content">
        <div class="step-title">${esc(step.title)}</div>
        <p class="step-desc">${safeHtml(step.description)}</p>
        ${step.tag ? `<span class="meta-tag tag-${esc(step.tagColor || ck)} step-tag">${esc(step.tag)}</span>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
    <div class="section" data-module="process" data-active="true" id="sec-process">
      ${sectionHeader('→','icon-green', esc(mod.title || 'Proceso / Secuencia'))}
      <div class="timeline">${stepsHtml}</div>
    </div>`;
}

function renderFormulas(mod) {
  const items = mod.items || [];
  const cards = items.map(f => `
    <div class="formula-card">
      <div class="formula-label">${esc(f.label)}</div>
      <div class="formula-expr">${esc(f.expr)}</div>
      <div class="formula-desc">${safeHtml(f.description)}</div>
      ${f.vars && f.vars.length ? `
      <div class="formula-vars">
        ${f.vars.map(v => `<span class="var-chip">${esc(v)}</span>`).join('')}
      </div>` : ''}
    </div>`).join('');

  return `
    <div class="section" data-module="formulas" data-active="true" id="sec-formulas">
      ${sectionHeader('∑','icon-coral','Fórmulas y modelos')}
      <div class="formulas-grid">${cards}</div>
    </div>`;
}

function renderClassify(mod) {
  const cats = mod.categories || [];
  const colorKeys = ['blue','green','amber','purple','coral','teal'];

  const cards = cats.map((cat, idx) => {
    const ck = cat.colorKey || colorKeys[idx % colorKeys.length];
    const st = tagStyle(ck);
    return `
    <div class="classify-card">
      <div class="classify-head" style="${st}">${esc(cat.title)}</div>
      <div class="classify-body">
        ${(cat.items || []).map(item => `
        <div class="classify-item">
          <div class="classify-dot"></div>
          <div><strong>${esc(item.name)}${item.description ? ':' : ''}</strong>${item.description ? ' ' + safeHtml(item.description) : ''}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  return `
    <div class="section" data-module="classify" data-active="true" id="sec-classify">
      ${sectionHeader('≡','icon-teal', esc(mod.title || 'Clasificaciones'))}
      <div class="classify-grid">${cards}</div>
    </div>`;
}

function renderMap(mod) {
  const branches = mod.branches || [];
  const weights  = mod.weights  || [];
  const colorKeys = ['blue','green','amber','purple','coral','teal'];

  const branchesHtml = branches.map((br, idx) => {
    const ck = br.colorKey || colorKeys[idx % colorKeys.length];
    const branchColor = COLOR_MAPS.branch[ck] || '#185FA5';
    return `
    <div class="map-branch">
      <div class="branch-title" style="color:${branchColor}">${esc(br.title)}</div>
      <ul class="branch-items">
        ${(br.items || []).map(it => `<li>${esc(it)}</li>`).join('')}
      </ul>
    </div>`;
  }).join('');

  const weightsHtml = weights.length ? `
    <div class="card card-sm" style="margin-top:12px">
      <p style="font-size:12px;font-weight:500;color:var(--muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px">Peso relativo de los subtemas</p>
      ${weights.map((w, idx) => {
        const ck = colorKeys[idx % colorKeys.length];
        const color = w.color || COLOR_MAPS.weight[ck] || '#185FA5';
        return `
        <div class="progress-row">
          <span class="progress-label">${esc(w.label)}</span>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${Math.min(100,w.percentage||0)}%;background:${esc(color)}"></div></div>
          <span class="progress-val">${w.percentage||0}%</span>
        </div>`;
      }).join('')}
    </div>` : '';

  return `
    <div class="section" data-module="map" data-active="true" id="sec-map">
      ${sectionHeader('⬡','icon-blue','Mapa estructural del contenido')}
      <div class="concept-map">
        <div class="map-central">${esc(mod.central)}</div>
        <div class="map-branches">${branchesHtml}</div>
      </div>
      ${weightsHtml}
    </div>`;
}

function renderAuthors(mod) {
  const items = mod.items || [];
  const colorKeys = ['blue','green','amber','purple','coral','teal'];

  const cards = items.map((a, idx) => {
    const ck = a.tagColor || colorKeys[idx % colorKeys.length];
    return `
    <div class="author-card">
      <div class="author-name">${esc(a.name)}</div>
      <div class="author-period">${esc(a.period)}</div>
      <div class="author-contrib">${safeHtml(a.contribution)}</div>
      ${a.tagText ? `<div class="author-tag"><span class="meta-tag tag-${esc(ck)}">${esc(a.tagText)}</span></div>` : ''}
    </div>`;
  }).join('');

  return `
    <div class="section" data-module="authors" data-active="true" id="sec-authors">
      ${sectionHeader('✎','icon-purple','Autores y teóricos')}
      <div class="authors-grid">${cards}</div>
    </div>`;
}

function renderErrors(mod) {
  const items = mod.items || [];

  const BADGE = {
    error:   { cls:'badge-error',   label:'Error crítico'       },
    warning: { cls:'badge-warning', label:'Confusión frecuente' },
    tip:     { cls:'badge-tip',     label:'Aclaración útil'     },
  };

  const rows = items.map(item => {
    const b = BADGE[item.type] || BADGE.warning;
    return `
    <div class="error-item">
      <span class="error-badge ${b.cls}">${b.label}</span>
      <div>
        <p class="error-wrong">"${esc(item.wrong)}"</p>
        <p class="error-right">${safeHtml(item.right)}</p>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="section" data-module="errors" data-active="true" id="sec-errors">
      ${sectionHeader('⚠','icon-coral','Errores comunes y confusiones típicas')}
      <div class="errors-list">${rows}</div>
    </div>`;
}

function renderQuiz(mod) {
  const questions = mod.questions || [];

  const rows = questions.map((q, idx) => `
    <div class="quiz-item">
      <div class="quiz-q" onclick="toggleQuiz(this)">
        <div style="display:flex;gap:10px;align-items:center">
          <span class="quiz-q-num">Q${idx+1}</span>
          <span>${esc(q.question)}</span>
        </div>
        <span class="quiz-arrow">▾</span>
      </div>
      <div class="quiz-a">${safeHtml(q.answer)}</div>
    </div>`).join('');

  return `
    <div class="section" data-module="quiz" data-active="true" id="sec-quiz">
      ${sectionHeader('?','icon-green','Autoevaluación rápida')}
      <div class="quiz-list">${rows}</div>
    </div>`;
}

function renderExec(mod) {
  const points = mod.points || [];

  return `
    <div class="section" data-module="exec" data-active="true" id="sec-exec">
      ${sectionHeader('★','icon-blue','Resumen ejecutivo · para antes del parcial')}
      <div class="exec-summary">
        <div class="exec-header">
          <div class="exec-header-title">${esc(mod.title)}</div>
          <div class="exec-header-sub">${esc(mod.subtitle)}</div>
        </div>
        <div class="exec-body">
          <div class="exec-points">
            ${points.map((p, idx) => `
            <div class="exec-point">
              <div class="exec-num">${idx+1}</div>
              <div>${safeHtml(p)}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

// ── HERO ──────────────────────────────────────────────────────
function renderHero(hero, meta) {
  const tags = (hero.tags || []).map(t =>
    `<span class="meta-tag tag-${esc(t.color)}">${esc(t.text)}</span>`
  ).join('');

  const stats = (hero.stats || []).map(s =>
    `<div class="hero-stat"><span class="stat-val">${esc(s.val)}</span><span class="stat-label">${esc(s.label)}</span></div>`
  ).join('');

  const titleParts = (hero.title || '').split('\\n');
  const titleHtml = titleParts.map(esc).join('<br>');

  return `
    <div class="hero">
      <div class="hero-inner">
        <div class="hero-meta">${tags}</div>
        <h1 class="hero-title">${titleHtml}</h1>
        <p class="hero-subtitle">${esc(hero.subtitle)}</p>
        ${stats ? `<div class="hero-stats">${stats}</div>` : ''}
      </div>
    </div>`;
}

// ── NAV ───────────────────────────────────────────────────────
function buildNav(data) {
  const modules = data.modules || {};
  const tabs = MODULE_ORDER
    .filter(key => modules[key] && modules[key].active)
    .map(key => `
      <button class="nav-tab" data-target="sec-${key}" onclick="scrollToSection(this)">
        ${MODULE_LABELS[key] || key}
      </button>`)
    .join('');

  const context = [data.meta?.subject, data.meta?.unit].filter(Boolean).join(' · ');

  return `
    <nav class="top-nav">
      <span class="nav-brand" onclick="window.location='/'">StudyDash</span>
      <div class="nav-tabs" id="navTabs">${tabs}</div>
      <div class="nav-right">
        ${context ? `<span class="pill-badge pill-outline" id="navContext">${esc(context)}</span>` : ''}
        <span class="pill-badge pill-primary">Listo para estudiar</span>
        <div class="export-dropdown" onclick="event.stopPropagation()">
          <button class="export-btn" id="exportBtn" onclick="toggleExportMenu(event)">
            ↓ Descargar
          </button>
          <div class="export-menu" id="exportMenu">
            <button class="export-menu-item" onclick="exportPDF()">
              <span class="export-menu-icon">🖨</span>
              <span class="export-menu-label">PDF</span>
              <span class="export-menu-hint">imprimir / guardar</span>
            </button>
            <button class="export-menu-item" onclick="exportHTML()">
              <span class="export-menu-icon">◻</span>
              <span class="export-menu-label">HTML completo</span>
              <span class="export-menu-hint">con diseño</span>
            </button>
            <button class="export-menu-item" onclick="exportJSON()">
              <span class="export-menu-icon">{}</span>
              <span class="export-menu-label">JSON</span>
              <span class="export-menu-hint">estructura raw</span>
            </button>
          </div>
        </div>
        <button class="back-btn" onclick="window.location='/'">← Nuevo</button>
      </div>
    </nav>`;
}

// ── RENDERERS MAP ─────────────────────────────────────────────
const RENDERERS = {
  summary:  renderSummary,
  concepts: renderConcepts,
  compare:  renderCompare,
  process:  renderProcess,
  formulas: renderFormulas,
  classify: renderClassify,
  map:      renderMap,
  authors:  renderAuthors,
  errors:   renderErrors,
  quiz:     renderQuiz,
  exec:     renderExec,
};

// ── MAIN RENDER ───────────────────────────────────────────────
function renderDashboard(data) {
  const modules = data.modules || {};
  document.title = `StudyDash — ${data.hero?.title || 'Dashboard'}`;

  const sectionsHtml = MODULE_ORDER
    .filter(key => modules[key] && modules[key].active && RENDERERS[key])
    .map(key => RENDERERS[key](modules[key]))
    .join('');

  const html = `
    ${buildNav(data)}
    ${renderHero(data.hero || {}, data.meta || {})}
    <div class="main">${sectionsHtml}</div>
  `;

  document.getElementById('app').innerHTML = html;

  // Activate first nav tab
  const firstTab = document.querySelector('.nav-tab');
  if (firstTab) firstTab.classList.add('active');

  // Scroll highlight on scroll
  window.addEventListener('scroll', onScroll, { passive: true });
}

function renderNoData() {
  document.getElementById('app').innerHTML = `
    <div class="no-data">
      <div class="no-data-icon">📚</div>
      <div class="no-data-title">No hay dashboard cargado</div>
      <div class="no-data-sub">Volvé al inicio para subir tus archivos y generar uno.</div>
      <button class="no-data-btn" onclick="window.location='/'">Ir al inicio</button>
    </div>`;
}

// ── INTERACTIVITY ─────────────────────────────────────────────
function scrollToSection(btn) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const target = document.getElementById(btn.dataset.target);
  if (target) {
    const offset = 60; // nav height
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function onScroll() {
  const sections = document.querySelectorAll('.section[data-module]');
  let active = null;
  sections.forEach(sec => {
    if (sec.getBoundingClientRect().top <= 80) active = sec.dataset.module;
  });
  if (active) {
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === 'sec-' + active);
    });
  }
}

function switchTab(btn, panelId) {
  const section = btn.closest('.section') || btn.closest('[id^="sec-"]') || btn.parentElement.parentElement;
  btn.closest('.tabs-bar').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  section.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');
}

function toggleQuiz(el) {
  const answer = el.nextElementSibling;
  const arrow  = el.querySelector('.quiz-arrow');
  const isOpen = answer.classList.contains('open');
  answer.classList.toggle('open', !isOpen);
  arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function toggleCollapsible(header) {
  const body  = header.nextElementSibling;
  const arrow = header.querySelector('.collapsible-arrow');
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ── EXPORT ────────────────────────────────────────────────────

let _exportMenuOpen = false;

function toggleExportMenu(event) {
  event && event.stopPropagation();
  _exportMenuOpen = !_exportMenuOpen;
  document.getElementById('exportMenu')?.classList.toggle('open', _exportMenuOpen);
  document.getElementById('exportBtn')?.classList.toggle('open', _exportMenuOpen);
}

document.addEventListener('click', () => {
  if (!_exportMenuOpen) return;
  _exportMenuOpen = false;
  document.getElementById('exportMenu')?.classList.remove('open');
  document.getElementById('exportBtn')?.classList.remove('open');
});

function _slugify(str) {
  return (str || 'dashboard')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function _triggerDownload(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Export: JSON ──────────────────────────────────────────────
function exportJSON() {
  toggleExportMenu();
  if (!_dashboardData) return;
  const slug = _slugify(_dashboardData.hero?.title);
  _triggerDownload(
    `studydash-${slug}.json`,
    'application/json',
    JSON.stringify(_dashboardData, null, 2)
  );
}

// ── Export: PDF (server-side via Puppeteer) ───────────────────
async function exportPDF() {
  toggleExportMenu();
  if (!_dashboardData) return;

  const btn = document.getElementById('exportBtn');
  const original = btn.innerHTML;
  btn.innerHTML = '⋯ Generando PDF';
  btn.disabled = true;

  try {
    let css = '';
    try { css = await fetch('/css/dashboard.css').then(r => r.text()); } catch (_) {}

    const slug  = _slugify(_dashboardData.hero?.title);
    const title = document.title;

    // CSS overrides that expand everything and strip interactive chrome
    const printCSS = `
      .top-nav, .export-dropdown, .back-btn { display:none !important }
      .tab-panel        { display:block !important }
      .quiz-a           { max-height:none !important; padding:.75rem 1.25rem 1rem !important; border-top-color:rgba(0,0,0,.08) !important }
      .collapsible-body { max-height:none !important }
      .section          { break-inside:avoid; page-break-inside:avoid; margin-bottom:1.5rem }
      .timeline-content,.concept-card,.card,.error-item,.quiz-item,.exec-point
                        { break-inside:avoid; page-break-inside:avoid }
      body              { background:#fff !important }
      * { -webkit-print-color-adjust:exact; print-color-adjust:exact }
    `;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet">
<style>${css}${printCSS}</style>
</head>
<body><div id="app">${document.getElementById('app').innerHTML}</div></body>
</html>`;

    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, filename: `studydash-${slug}` }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error del servidor (${res.status})`);
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `studydash-${slug}.pdf`,
    });
    a.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error('PDF export error:', err);
    // Graceful fallback to browser print dialog
    alert(`No se pudo generar el PDF automáticamente: ${err.message}\n\nSe abrirá el diálogo de impresión como alternativa.`);
    window.print();
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

// ── Export: standalone HTML ───────────────────────────────────
async function exportHTML() {
  toggleExportMenu();
  if (!_dashboardData) return;

  let css = '';
  try {
    css = await fetch('/css/dashboard.css').then(r => r.text());
  } catch (_) { /* proceed without fetched CSS — fonts still load */ }

  const slug    = _slugify(_dashboardData.hero?.title);
  const appHtml = document.getElementById('app').innerHTML;
  const title   = document.title;

  // Minimal self-contained JS for interactivity in the exported file
  const inlineJS = `
(function(){
function scrollToSection(btn){document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');var t=document.getElementById(btn.dataset.target);if(t)window.scrollTo({top:t.getBoundingClientRect().top+scrollY-60,behavior:'smooth'});}
function switchTab(btn,id){btn.closest('.tabs-bar').querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');btn.closest('.section').querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));var p=document.getElementById(id);if(p)p.classList.add('active');}
function toggleQuiz(el){var a=el.nextElementSibling,ar=el.querySelector('.quiz-arrow'),o=a.classList.contains('open');a.classList.toggle('open',!o);if(ar)ar.style.transform=o?'':'rotate(180deg)';}
function toggleCollapsible(h){var b=h.nextElementSibling,ar=h.querySelector('.collapsible-arrow'),o=b.classList.contains('open');b.classList.toggle('open',!o);if(ar)ar.style.transform=o?'':'rotate(180deg)';}
window.scrollToSection=scrollToSection;window.switchTab=switchTab;window.toggleQuiz=toggleQuiz;window.toggleCollapsible=toggleCollapsible;
window.addEventListener('scroll',function(){var s=document.querySelectorAll('.section[data-module]'),a=null;s.forEach(function(x){if(x.getBoundingClientRect().top<=80)a=x.dataset.module;});if(a)document.querySelectorAll('.nav-tab').forEach(function(b){b.classList.toggle('active',b.dataset.target==='sec-'+a);});},{passive:true});
})();
  `.trim();

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet">
<style>
${css}
/* Standalone: hide export menu */
.export-dropdown { display:none !important }
</style>
</head>
<body>
<div id="app">${appHtml}</div>
<script>${inlineJS}<\/script>
</body>
</html>`;

  _triggerDownload(`studydash-${slug}.html`, 'text/html;charset=utf-8', html);
}

// ── BOOT ──────────────────────────────────────────────────────
(function boot() {
  const raw = sessionStorage.getItem('studydash_data');
  if (!raw) return renderNoData();
  try {
    const data = JSON.parse(raw);
    _dashboardData = data;
    renderDashboard(data);
  } catch (e) {
    console.error('Error parsing dashboard data:', e);
    renderNoData();
  }
})();
