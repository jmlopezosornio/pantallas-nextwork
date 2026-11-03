// Reportes de Clientes y Campañas + branding corporativo multiempresa - NextWork
(function(){
  'use strict';

  const REPORT_PAGE_ID = 'page-reportes-admin';
  const REPORT_NAV_ID = 'nav-reportes-admin';
  let reportRows = [];
  let reportMode = 'general';
  let currentCompany = null;

  const svgReport = `<svg viewBox="0 0 24 24"><path d="M4 3h16v18H4z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>`;

  function esc(v){
    return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function isoDate(v){
    if(!v) return '';
    const s = String(v).slice(0,10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  }

  function displayDate(v){
    const s = isoDate(v);
    if(!s) return '—';
    const [y,m,d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  function todayIso(){
    const d = new Date();
    const p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  }

  function firstDayMonthIso(){
    const d = new Date();
    const p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-01`;
  }

  function campaignName(c){ return c.campania || c.nombre || 'Sin nombre'; }
  function clientName(c){ return c.cliente || c.cliente_nombre || c.clientes?.nombre || 'Sin cliente'; }
  function clientId(c){ return c.cliente_id || c.clientes?.id || ''; }
  function percent(c){ return Number(c.porcentaje ?? c.participacion ?? 0) || 0; }

  function screensForCampaign(c){
    try{
      if(typeof campaignScreensMap !== 'undefined' && campaignScreensMap && campaignScreensMap[c.id]){
        return campaignScreensMap[c.id].map(p => ({ id:p.id || p.pantalla_id || '', nombre:p.nombre || 'Pantalla' }));
      }
    }catch{}
    return [];
  }

  function overlaps(c, from, to){
    if(!from && !to) return true;
    const cFrom = isoDate(c.fecha_desde) || '0000-01-01';
    const cTo = isoDate(c.fecha_hasta) || '9999-12-31';
    return (!to || cFrom <= to) && (!from || cTo >= from);
  }

  function injectStyles(){
    if(document.getElementById('nextwork-reportes-css')) return;
    const style = document.createElement('style');
    style.id = 'nextwork-reportes-css';
    style.textContent = `
      #${REPORT_PAGE_ID}{max-width:100%;}
      .reports-shell{background:#fff;border:1px solid #e5eaf3;border-radius:22px;box-shadow:0 10px 30px rgba(15,23,42,.07);overflow:hidden}
      .reports-head{padding:24px 26px 18px;border-bottom:1px solid #e8edf5;display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
      .reports-head h2{margin:0;font-size:26px;letter-spacing:-.02em;color:#0b2b59}
      .reports-head p{margin:6px 0 0;color:#64748b;font-size:13px}
      .reports-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
      .reports-filterbox{margin:20px 24px;padding:18px;background:linear-gradient(135deg,#f3f7fc,#edf4fb);border:1px solid #dfe8f4;border-radius:18px}
      .reports-period-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #d7e2ef}
      .reports-mode{border:1px solid #bccbe0;background:#fff;color:#334155;border-radius:10px;padding:9px 16px;font-weight:800;cursor:pointer}
      .reports-mode.active{background:linear-gradient(135deg,#1769d2,#0b4ea2);border-color:#1769d2;color:#fff;box-shadow:0 6px 16px rgba(23,105,210,.22)}
      .reports-date{display:flex;align-items:center;gap:8px;margin-left:10px}
      .reports-date label{margin:0;font-size:12px;color:#334155;white-space:nowrap}
      .reports-date input{width:155px;background:#fff}
      .reports-filter-grid{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:14px}
      .reports-filter-grid label{font-size:11px;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;color:#53657d}
      .reports-filter-grid select{background:#fff}
      .reports-summary{padding:0 24px 14px;color:#64748b;font-size:12px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .reports-table-wrap{margin:0 24px 24px;border:1px solid #dfe6ef;border-radius:14px;overflow:auto}
      .reports-table{width:100%;border-collapse:collapse;min-width:900px}
      .reports-table th{background:linear-gradient(180deg,#0c477f,#083968);color:#fff;padding:13px 14px;font-size:12px;text-transform:none;letter-spacing:.01em;white-space:nowrap}
      .reports-table td{padding:12px 14px;border-bottom:1px solid #e7edf4;font-size:13px;color:#172033;vertical-align:top}
      .reports-table tr:nth-child(even) td{background:#f7faff}
      .reports-table tr:hover td{background:#edf5ff}
      .reports-table .pct{text-align:center;font-weight:900;color:#0b4ea2;white-space:nowrap}
      .reports-table .vigencia{white-space:nowrap}
      .reports-empty{padding:34px!important;text-align:center;color:#64748b!important;background:#fff!important}
      .reports-screen-list{line-height:1.45}
      .nw-company-brand{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
      .nw-company-logo{display:block;max-width:100%;max-height:90px;object-fit:contain}
      .nw-company-name{font-size:14px;font-weight:900;color:#0f172a;line-height:1.15}
      .nw-powered{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.12em;font-weight:800}
      .nw-company-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid #e2e8f0;background:#fff;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:800;color:#334155}
      .nw-company-pill img{width:24px;height:24px;object-fit:contain;border-radius:5px}
      @media(max-width:900px){
        .reports-filter-grid{grid-template-columns:1fr}
        .reports-head{flex-direction:column}
        .reports-actions{justify-content:flex-start}
        .reports-date{margin-left:0}
      }
    `;
    document.head.appendChild(style);
  }

  async function loadCompanyBranding(){
    try{
      if(typeof currentProfile === 'undefined' || !currentProfile) return;
      const empresaId = currentProfile.empresa_id || currentProfile.empresaId || null;
      if(!empresaId) return applyCompanyBranding(null);
      if(typeof sb === 'undefined') return;
      const { data, error } = await sb
        .from('empresas')
        .select('id,nombre,nombre_fantasia,logo_url,color_primario,color_secundario,activo')
        .eq('id', empresaId)
        .single();
      if(error || !data || data.activo === false){
        console.warn('Branding empresa no disponible:', error?.message || 'sin datos');
        return applyCompanyBranding(null);
      }
      currentCompany = data;
      applyCompanyBranding(data);
    }catch(err){
      console.warn('No se pudo aplicar branding corporativo:', err);
      applyCompanyBranding(null);
    }
  }

  function applyCompanyBranding(company){
    currentCompany = company || null;
    const panel = document.querySelector('.brand-panel');
    if(panel){
      if(company){
        const companyName = company.nombre_fantasia || company.nombre || 'Empresa';
        panel.innerHTML = `<div class="nw-company-brand">
          ${company.logo_url ? `<img class="nw-company-logo" src="${esc(company.logo_url)}" alt="${esc(companyName)}">` : ''}
          <div class="nw-company-name">${esc(companyName)}</div>
          <div class="nw-powered">Powered by NextWork</div>
        </div>`;
      }
    }

    const topbar = document.querySelector('.topbar .userbox');
    if(topbar){
      let pill = document.getElementById('nwCompanyPill');
      if(company){
        if(!pill){
          pill = document.createElement('div');
          pill.id = 'nwCompanyPill';
          pill.className = 'nw-company-pill';
          topbar.prepend(pill);
        }
        const companyName = company.nombre_fantasia || company.nombre || 'Empresa';
        pill.innerHTML = `${company.logo_url ? `<img src="${esc(company.logo_url)}" alt="">` : ''}<span>${esc(companyName)}</span>`;
      }else if(pill){
        pill.remove();
      }
    }

    const root = document.documentElement;
    if(company?.color_primario) root.style.setProperty('--company-primary', company.color_primario);
    if(company?.color_secundario) root.style.setProperty('--company-secondary', company.color_secundario);
  }

  function addNav(){
    if(document.getElementById(REPORT_NAV_ID)) return;
    const candidates = [...document.querySelectorAll('.nav-btn')];
    const repro = candidates.find(b => b.dataset.page === 'reproducciones');
    const campaign = candidates.find(b => b.dataset.page === 'campanias');
    const anchor = repro || campaign;
    if(!anchor) return;
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.id = REPORT_NAV_ID;
    btn.type = 'button';
    btn.innerHTML = `<span class="nav-icon">${svgReport}</span><span class="nav-label">Reportes</span>`;
    btn.addEventListener('click', openReportsPage);
    anchor.insertAdjacentElement('afterend', btn);
  }

  function addPage(){
    if(document.getElementById(REPORT_PAGE_ID)) return;
    const content = document.querySelector('.content');
    if(!content) return;
    const section = document.createElement('section');
    section.id = REPORT_PAGE_ID;
    section.className = 'page hidden';
    section.innerHTML = `
      <div class="reports-shell">
        <div class="reports-head">
          <div>
            <h2>Reporte de Clientes y Campañas</h2>
            <p>Listado administrativo por cliente, campaña, vigencia, pantallas asignadas y porcentaje de salidas.</p>
          </div>
          <div class="reports-actions">
            <button class="btn btn-ghost" type="button" id="reportResetBtn">Limpiar filtros</button>
            <button class="btn btn-primary" type="button" id="reportPrintBtn">Imprimir / PDF</button>
          </div>
        </div>
        <div class="reports-filterbox">
          <div class="reports-period-row">
            <strong style="color:#0b2b59;margin-right:4px">Período:</strong>
            <button class="reports-mode active" type="button" data-report-mode="general">General</button>
            <button class="reports-mode" type="button" data-report-mode="fechas">Entre fechas</button>
            <div class="reports-date" data-report-dates style="display:none"><label for="reportDesde">Desde</label><input type="date" id="reportDesde"></div>
            <div class="reports-date" data-report-dates style="display:none"><label for="reportHasta">Hasta</label><input type="date" id="reportHasta"></div>
          </div>
          <div class="reports-filter-grid">
            <div><label for="reportCliente">Cliente</label><select id="reportCliente"><option value="">Todos</option></select></div>
            <div><label for="reportCampania">Campaña</label><select id="reportCampania"><option value="">Todas</option></select></div>
            <div><label for="reportPantalla">Pantalla</label><select id="reportPantalla"><option value="">Todas</option></select></div>
          </div>
        </div>
        <div class="reports-summary"><span id="reportSummaryText">Preparando reporte…</span><strong id="reportCountText"></strong></div>
        <div class="reports-table-wrap">
          <table class="reports-table">
            <thead><tr><th>Cliente</th><th>Campaña</th><th>Vigencia</th><th>Pantallas</th><th>% Salidas</th></tr></thead>
            <tbody id="reportBody"><tr><td colspan="5" class="reports-empty">Preparando reporte…</td></tr></tbody>
          </table>
        </div>
      </div>`;
    content.appendChild(section);
    section.querySelectorAll('[data-report-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.reportMode)));
    ['reportDesde','reportHasta','reportCliente','reportCampania','reportPantalla'].forEach(id => document.getElementById(id)?.addEventListener('change', renderReport));
    document.getElementById('reportResetBtn')?.addEventListener('click', resetFilters);
    document.getElementById('reportPrintBtn')?.addEventListener('click', printReport);
  }

  function populateFilters(){
    const campaigns = (typeof cacheCampanias !== 'undefined' ? cacheCampanias : []) || [];
    const screens = (typeof cachePantallas !== 'undefined' ? cachePantallas : []) || [];
    const clients = (typeof cacheClientes !== 'undefined' ? cacheClientes : []) || [];
    const fill = (id, values, firstLabel) => {
      const sel = document.getElementById(id); if(!sel) return;
      const current = sel.value;
      sel.innerHTML = `<option value="">${firstLabel}</option>` + values.map(v => `<option value="${esc(v.value)}">${esc(v.label)}</option>`).join('');
      if([...sel.options].some(o => o.value === current)) sel.value = current;
    };
    const clientValues = clients.length
      ? clients.filter(x=>x?.id).map(x=>({value:String(x.id),label:x.nombre||'Sin nombre'})).sort((a,b)=>a.label.localeCompare(b.label,'es'))
      : [...new Map(campaigns.map(c => [String(clientId(c)||clientName(c)), {value:String(clientId(c)||clientName(c)),label:clientName(c)}])).values()].sort((a,b)=>a.label.localeCompare(b.label,'es'));
    fill('reportCliente', clientValues, 'Todos');
    fill('reportCampania', campaigns.filter(c=>c?.id).map(c=>({value:String(c.id),label:campaignName(c)})).sort((a,b)=>a.label.localeCompare(b.label,'es')), 'Todas');
    fill('reportPantalla', screens.filter(p=>p?.id).map(p=>({value:String(p.id),label:p.nombre||'Pantalla'})).sort((a,b)=>a.label.localeCompare(b.label,'es')), 'Todas');
  }

  function setMode(mode){
    reportMode = mode === 'fechas' ? 'fechas' : 'general';
    document.querySelectorAll('[data-report-mode]').forEach(b => b.classList.toggle('active', b.dataset.reportMode === reportMode));
    document.querySelectorAll('[data-report-dates]').forEach(el => el.style.display = reportMode === 'fechas' ? 'flex' : 'none');
    renderReport();
  }

  function resetFilters(){
    reportMode = 'general';
    document.querySelectorAll('[data-report-mode]').forEach(b => b.classList.toggle('active', b.dataset.reportMode === 'general'));
    document.querySelectorAll('[data-report-dates]').forEach(el => el.style.display = 'none');
    const d = document.getElementById('reportDesde'), h = document.getElementById('reportHasta');
    if(d) d.value = firstDayMonthIso();
    if(h) h.value = todayIso();
    ['reportCliente','reportCampania','reportPantalla'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    renderReport();
  }

  function getFilteredRows(){
    const campaigns = ((typeof cacheCampanias !== 'undefined' ? cacheCampanias : []) || []).filter(c => !c.eliminada);
    const selectedClient = document.getElementById('reportCliente')?.value || '';
    const selectedCampaign = document.getElementById('reportCampania')?.value || '';
    const selectedScreen = document.getElementById('reportPantalla')?.value || '';
    const from = reportMode === 'fechas' ? (document.getElementById('reportDesde')?.value || '') : '';
    const to = reportMode === 'fechas' ? (document.getElementById('reportHasta')?.value || '') : '';
    return campaigns.filter(c => {
      const screens = screensForCampaign(c);
      const cId = String(clientId(c) || clientName(c));
      const clientMatch = !selectedClient || cId === selectedClient || String(clientName(c)) === selectedClient;
      const campaignMatch = !selectedCampaign || String(c.id) === selectedCampaign;
      const screenMatch = !selectedScreen || screens.some(p => String(p.id) === selectedScreen);
      return clientMatch && campaignMatch && screenMatch && (reportMode === 'general' || overlaps(c,from,to));
    }).map(c => ({
      id:c.id,
      cliente:clientName(c),
      campania:campaignName(c),
      desde:c.fecha_desde,
      hasta:c.fecha_hasta,
      pantallas:screensForCampaign(c).map(p=>p.nombre).filter(Boolean),
      porcentaje:percent(c)
    })).sort((a,b) => a.cliente.localeCompare(b.cliente,'es') || a.campania.localeCompare(b.campania,'es'));
  }

  function currentPeriodLabel(){
    if(reportMode === 'general') return 'General';
    const d = document.getElementById('reportDesde')?.value || '';
    const h = document.getElementById('reportHasta')?.value || '';
    if(d && h) return `${displayDate(d)} al ${displayDate(h)}`;
    if(d) return `Desde ${displayDate(d)}`;
    if(h) return `Hasta ${displayDate(h)}`;
    return 'Entre fechas';
  }

  function selectedText(id, fallback){
    const el = document.getElementById(id);
    return el?.selectedOptions?.[0]?.textContent || fallback;
  }

  function renderReport(){
    if(reportMode === 'fechas'){
      const d = document.getElementById('reportDesde')?.value || '';
      const h = document.getElementById('reportHasta')?.value || '';
      if(d && h && d > h){
        document.getElementById('reportBody').innerHTML = `<tr><td colspan="5" class="reports-empty">La fecha Desde no puede ser posterior a Hasta.</td></tr>`;
        document.getElementById('reportCountText').textContent = '';
        return;
      }
    }
    populateFilters();
    reportRows = getFilteredRows();
    const body = document.getElementById('reportBody');
    const summary = document.getElementById('reportSummaryText');
    const count = document.getElementById('reportCountText');
    if(summary) summary.textContent = `Período: ${currentPeriodLabel()} · Cliente: ${selectedText('reportCliente','Todos')} · Campaña: ${selectedText('reportCampania','Todas')} · Pantalla: ${selectedText('reportPantalla','Todas')}`;
    if(count) count.textContent = `${reportRows.length} campaña${reportRows.length===1?'':'s'}`;
    if(!body) return;
    if(!reportRows.length){
      body.innerHTML = `<tr><td colspan="5" class="reports-empty">No hay campañas para los filtros seleccionados.</td></tr>`;
      return;
    }
    body.innerHTML = reportRows.map(r => `<tr>
      <td>${esc(r.cliente)}</td>
      <td><strong>${esc(r.campania)}</strong></td>
      <td class="vigencia">${displayDate(r.desde)} – ${displayDate(r.hasta)}</td>
      <td class="reports-screen-list">${r.pantallas.length ? r.pantallas.map(esc).join(', ') : 'Sin pantalla asignada'}</td>
      <td class="pct">${r.porcentaje}%</td>
    </tr>`).join('');
  }

  function openReportsPage(){
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(REPORT_PAGE_ID)?.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(REPORT_NAV_ID)?.classList.add('active');
    const title = document.querySelector('.topbar-title');
    const sub = document.querySelector('.topbar-sub');
    if(title) title.textContent = 'Reportes';
    if(sub) sub.textContent = 'Clientes, campañas, vigencias y pantallas';
    renderReport();
  }

  function printReport(){
    renderReport();
    if(!reportRows.length){ alert('No hay datos para imprimir.'); return; }
    const companyName = currentCompany?.nombre_fantasia || currentCompany?.nombre || 'NextWork';
    const companyLogo = currentCompany?.logo_url || '';
    const rowsHtml = reportRows.map(r => `<tr><td>${esc(r.cliente)}</td><td>${esc(r.campania)}</td><td>${displayDate(r.desde)} – ${displayDate(r.hasta)}</td><td>${r.pantallas.length ? r.pantallas.map(esc).join(', ') : 'Sin pantalla asignada'}</td><td class="pct">${r.porcentaje}%</td></tr>`).join('');
    const w = window.open('', '_blank', 'width=1200,height=800');
    if(!w){ alert('El navegador bloqueó la ventana de impresión.'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de Clientes y Campañas</title><style>
      @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#142033;margin:0}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1264c5;padding-bottom:12px;margin-bottom:14px}.brand{display:flex;align-items:center;gap:14px;min-width:280px}.brand img{max-width:170px;max-height:68px;object-fit:contain}.brand-name{font-size:20px;font-weight:800}.powered{font-size:9px;color:#7b8798;text-transform:uppercase;letter-spacing:.12em;margin-top:3px}.title{text-align:right}.title h1{font-size:25px;margin:0;color:#0a2e5f}.title p{margin:5px 0 0;color:#667085;font-size:12px}.filters{background:#eef4fb;border:1px solid #d8e5f3;border-radius:9px;padding:10px 12px;margin-bottom:14px;font-size:11px;display:grid;grid-template-columns:repeat(4,1fr);gap:7px 14px}.filters strong{color:#0a2e5f}table{width:100%;border-collapse:collapse;font-size:10.5px}th{background:#0b477f;color:white;text-align:left;padding:8px}td{border:1px solid #dbe3ec;padding:7px;vertical-align:top}tr:nth-child(even) td{background:#f7f9fc}.pct{text-align:center;font-weight:800}.footer{display:flex;justify-content:space-between;border-top:1px solid #b9c6d6;margin-top:14px;padding-top:7px;font-size:9px;color:#667085}
    </style></head><body>
      <div class="head"><div class="brand">${companyLogo ? `<img src="${esc(companyLogo)}" alt="${esc(companyName)}">` : ''}<div><div class="brand-name">${esc(companyName)}</div><div class="powered">Powered by NextWork</div></div></div><div class="title"><h1>Reporte de Clientes y Campañas</h1><p>Sistema de Gestión de Pantallas</p></div></div>
      <div class="filters"><div><strong>Período:</strong> ${esc(currentPeriodLabel())}</div><div><strong>Cliente:</strong> ${esc(selectedText('reportCliente','Todos'))}</div><div><strong>Campaña:</strong> ${esc(selectedText('reportCampania','Todas'))}</div><div><strong>Pantalla:</strong> ${esc(selectedText('reportPantalla','Todas'))}</div></div>
      <table><thead><tr><th>Cliente</th><th>Campaña</th><th>Vigencia</th><th>Pantallas</th><th>% Salidas</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <div class="footer"><span>Reporte generado el ${new Date().toLocaleString('es-AR')}</span><span>${esc(companyName)} · NextWork</span></div>
      <script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script>
    </body></html>`);
    w.document.close();
  }

  function init(){
    injectStyles();
    addNav();
    addPage();
    const d = document.getElementById('reportDesde'), h = document.getElementById('reportHasta');
    if(d && !d.value) d.value=firstDayMonthIso();
    if(h && !h.value) h.value=todayIso();
    loadCompanyBranding();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    addNav(); addPage();
    if(typeof currentProfile !== 'undefined' && currentProfile) loadCompanyBranding();
    if(tries>80) clearInterval(timer);
  },500);
})();
