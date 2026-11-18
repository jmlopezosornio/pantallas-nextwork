
(function(){
  "use strict";
  // Diseño del dashboard NextWork, sin alterar las vistas de gestión.
  const dashboard = document.getElementById('page-dashboard');
  if (!dashboard || typeof loadDashboard !== 'function') return;

  const style = document.createElement('style');
  style.id = 'nextwork-dashboard-v33-styles';
  style.textContent = `
    #page-dashboard{font-family:Inter,"Segoe UI",Arial,sans-serif;max-width:1560px;margin:auto}
    #page-dashboard .nw-heading{margin:6px 0 24px}
    #page-dashboard .nw-heading h1{font-size:35px;line-height:1.1;letter-spacing:-.035em;margin:0 0 7px;color:#0b1937;font-weight:850}
    #page-dashboard .nw-heading p{font-size:17px;color:#697487;margin:0}
    #page-dashboard .nw-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin-bottom:26px}
    #page-dashboard .nw-stat,#page-dashboard .nw-panel{background:#fff;border:1px solid #e9edf5;box-shadow:0 8px 26px rgba(19,37,73,.085);border-radius:20px}
    #page-dashboard .nw-stat{min-height:202px;padding:25px 22px;display:flex;flex-direction:column;position:relative;transition:box-shadow .2s,transform .2s}
    #page-dashboard .nw-stat-click{cursor:pointer;width:100%;text-align:left;color:inherit;font:inherit}
    #page-dashboard .nw-stat-click:hover,#page-dashboard .nw-top-row:hover{box-shadow:0 11px 32px rgba(30,85,172,.17);transform:translateY(-2px)}
    #page-dashboard .nw-stat-click:focus-visible,#page-dashboard .nw-top-row:focus-visible{outline:3px solid #398cf5;outline-offset:2px}
    #page-dashboard .nw-stat-header{display:flex;align-items:center;gap:14px;font-size:16px;font-weight:800;color:#17243f}
    #page-dashboard .nw-symbol{width:58px;height:58px;display:grid;place-items:center;font-size:27px;border-radius:15px;flex-shrink:0}
    #page-dashboard .nw-symbol.blue{background:#e3f2ff;color:#1878e6}
    #page-dashboard .nw-symbol.green{background:#e6f9ed;color:#16b85c}
    #page-dashboard .nw-symbol.orange{background:#fff0de;color:#f47a13}
    #page-dashboard .nw-symbol.people{background:#e6f2ff;color:#2885f2}
    #page-dashboard .nw-value{font-size:52px;letter-spacing:-.045em;line-height:1.1;font-weight:850;color:#0b1937;margin:4px 0 0 77px}
    #page-dashboard .nw-value.orange{color:#f27810}
    #page-dashboard .nw-sub{color:#768198;font-size:15px;margin:4px 0 0 77px}
    #page-dashboard .nw-progress{margin-top:auto;height:13px;border-radius:99px;background:#e1e6ee;overflow:hidden}
    #page-dashboard .nw-progress span{display:block;height:100%;background:linear-gradient(90deg,#23c77c,#3ed69e);border-radius:99px;transition:width .2s}
    #page-dashboard .nw-bottom{display:grid;grid-template-columns:minmax(0,1.38fr) minmax(0,1fr);gap:20px}
    #page-dashboard .nw-panel{min-height:395px;padding:22px}
    #page-dashboard .nw-panel-title{display:flex;align-items:center;gap:12px;font-weight:850;font-size:23px;letter-spacing:-.025em;margin:0 0 23px;color:#0b1937}
    #page-dashboard .nw-panel-title .nw-title-icon{font-size:25px;color:#186fe7}
    #page-dashboard .nw-table{width:100%;border-collapse:collapse;table-layout:fixed}
    #page-dashboard .nw-table th{background:#edf2f9;text-align:left;font-size:14px;color:#465a77;padding:14px 12px;font-weight:800}
    #page-dashboard .nw-table th:first-child{border-radius:12px 0 0 0;width:48px}
    #page-dashboard .nw-table th:nth-child(2){width:30%}
    #page-dashboard .nw-table th:last-child{border-radius:0 12px 0 0}
    #page-dashboard .nw-table td{border-bottom:1px solid #e7edf4;padding:13px 12px;font-weight:650;color:#17243f;font-size:17px}
    #page-dashboard .nw-rank{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:#e3f2ff;color:#246ed4}
    #page-dashboard .nw-quantity{display:inline-flex;align-items:center;justify-content:center;background:#def9e8;border-radius:12px;padding:6px 14px;min-width:47px}
    #page-dashboard .nw-top-row{border:0;background:transparent;cursor:pointer;transition:transform .15s,box-shadow .15s}
    #page-dashboard .nw-top-row td:last-child{text-align:right}
    #page-dashboard .nw-link{color:#056bdf;font-size:14px;font-weight:800;white-space:nowrap}
    #page-dashboard .nw-donut-layout{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:30px}
    #page-dashboard .nw-donut{height:252px;width:252px;min-width:252px;border-radius:50%;display:grid;place-items:center;position:relative;background:#e8eef5}
    #page-dashboard .nw-donut-center{height:52%;width:52%;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:1}
    #page-dashboard .nw-donut-center strong{font-weight:850;font-size:42px;color:#0b1937;line-height:1.05}
    #page-dashboard .nw-donut-center span{font-size:15px;color:#738098}
    #page-dashboard .nw-legend{display:grid;gap:12px;flex:1;min-width:0}
    #page-dashboard .nw-legend-item{display:grid;grid-template-columns:15px minmax(0,1fr) auto;align-items:center;gap:10px;border-bottom:1px solid #edf1f5;padding-bottom:10px;font-size:15px}
    #page-dashboard .nw-legend-dot{height:14px;width:14px;border-radius:4px}
    #page-dashboard .nw-legend-item strong{font-size:15px}
    #page-dashboard .nw-note{color:#94a0b1;font-size:12px;margin-top:15px}
    .nw-details-list{display:grid;gap:10px;max-height:58vh;overflow:auto}
    .nw-details-item{padding:13px 15px;border:1px solid #e8edf6;border-radius:12px;background:#f9fbff}
    .nw-details-item strong{display:block;font-size:15px;color:#11213d}
    .nw-details-item span{color:#66758a;font-size:13px;display:block;margin-top:4px}
    @media(max-width:1320px){#page-dashboard .nw-stats{gap:12px}#page-dashboard .nw-stat{padding:20px 15px}#page-dashboard .nw-bottom{grid-template-columns:1.1fr 1fr}#page-dashboard .nw-donut{width:195px;height:195px;min-width:195px}#page-dashboard .nw-donut-layout{gap:12px}}
    @media(max-width:1000px){#page-dashboard .nw-stats{grid-template-columns:repeat(2,minmax(0,1fr))}#page-dashboard .nw-bottom{grid-template-columns:1fr}}
    @media(max-width:600px){#page-dashboard .nw-stats{gap:10px}#page-dashboard .nw-stat{padding:13px;min-height:155px}#page-dashboard .nw-stat-header{font-size:12px;gap:7px}#page-dashboard .nw-symbol{width:35px;height:35px;font-size:18px}#page-dashboard .nw-value{font-size:33px;margin-left:0;margin-top:10px}#page-dashboard .nw-sub{margin-left:0;font-size:12px}#page-dashboard .nw-heading h1{font-size:28px}#page-dashboard .nw-panel{padding:13px;min-height:auto}#page-dashboard .nw-panel-title{font-size:18px}#page-dashboard .nw-table td{font-size:13px;padding:9px 4px}#page-dashboard .nw-table th{font-size:11px;padding:9px 4px}#page-dashboard .nw-link{font-size:11px}#page-dashboard .nw-donut{width:165px;height:165px;min-width:165px}#page-dashboard .nw-donut-layout{gap:10px}#page-dashboard .nw-legend-item{font-size:12px;gap:5px}#page-dashboard .nw-donut-center strong{font-size:28px}}

    /* Corrección de iconografía y alineación de tarjetas, acorde con la maqueta. */
    #page-dashboard .nw-symbol svg{display:block;width:32px;height:32px;flex-shrink:0}
    #page-dashboard .nw-title-icon{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex:0 0 30px}
    #page-dashboard .nw-title-icon svg{width:28px;height:28px;display:block}
    #page-dashboard .nw-panel{min-width:0;overflow:hidden}
    #page-dashboard .nw-table{width:100%;max-width:100%;table-layout:fixed}
    #page-dashboard .nw-table th:nth-child(2){width:33%}
    #page-dashboard .nw-table th:last-child{width:auto}
    #page-dashboard .nw-table td{overflow-wrap:anywhere}
    #page-dashboard .nw-link{background:none;border:0;padding:6px 0;cursor:pointer}
    #page-dashboard .nw-stat-header{min-height:58px}
    #page-dashboard .nw-stat-click{appearance:none;-webkit-appearance:none;border:1px solid #e9edf5}
    @media(max-width:600px){#page-dashboard .nw-symbol svg{width:21px;height:21px}#page-dashboard .nw-title-icon svg{width:23px;height:23px}#page-dashboard .nw-stat-header{min-height:35px}}

    /* Ajuste compacto: evita saltos de títulos y desborde de tablas. */
    #page-dashboard .nw-heading{margin:0 0 17px}
    #page-dashboard .nw-heading h1{font-size:clamp(25px,2.25vw,32px)}
    #page-dashboard .nw-heading p{font-size:14px}
    #page-dashboard .nw-stats{gap:14px;margin-bottom:18px}
    #page-dashboard .nw-stat{min-height:158px;padding:15px 15px 13px;border-radius:17px}
    #page-dashboard .nw-stat-header{font-size:clamp(12px,1.05vw,15px);gap:9px;min-height:46px}
    #page-dashboard .nw-symbol{width:46px;height:46px;border-radius:12px;flex-basis:46px}
    #page-dashboard .nw-symbol svg{width:25px;height:25px}
    #page-dashboard .nw-value{font-size:clamp(32px,3.1vw,44px);margin:6px 0 0 55px}
    #page-dashboard .nw-sub{font-size:12px;margin:2px 0 0 55px}
    #page-dashboard .nw-progress{height:8px}
    #page-dashboard .nw-bottom{grid-template-columns:minmax(0,1.22fr) minmax(0,1fr);gap:16px}
    #page-dashboard .nw-panel{min-height:310px;padding:18px 17px;border-radius:17px}
    #page-dashboard .nw-panel-title{font-size:clamp(15px,1.5vw,20px);gap:9px;line-height:1.18;white-space:nowrap;margin-bottom:17px}
    #page-dashboard .nw-panel-title .nw-title-icon{width:25px;height:25px;flex-basis:25px}
    #page-dashboard .nw-panel-title .nw-title-icon svg{width:24px;height:24px}
    #page-dashboard .nw-table th{font-size:12px;padding:10px 8px}
    #page-dashboard .nw-table td{font-size:13px;padding:9px 8px}
    #page-dashboard .nw-table th:nth-child(2){width:36%}
    #page-dashboard .nw-table th:first-child{width:40px}
    #page-dashboard .nw-rank{width:28px;height:28px}
    #page-dashboard .nw-quantity{padding:5px 11px;min-width:35px}
    #page-dashboard .nw-link{font-size:12px}
    #page-dashboard .nw-donut-layout{margin-top:19px;gap:13px}
    #page-dashboard .nw-donut{width:190px;height:190px;min-width:190px}
    #page-dashboard .nw-donut-center strong{font-size:34px}
    #page-dashboard .nw-legend{gap:8px}
    #page-dashboard .nw-legend-item{font-size:12px;gap:6px;padding-bottom:7px}
    #page-dashboard .nw-legend-item strong{font-size:12px}
    @media(max-width:1100px){#page-dashboard .nw-stat-header{font-size:12px}#page-dashboard .nw-bottom{grid-template-columns:1fr}#page-dashboard .nw-panel-title{white-space:normal}}
    @media(max-width:600px){#page-dashboard .nw-stats{gap:10px}#page-dashboard .nw-stat{min-height:135px;padding:11px}#page-dashboard .nw-stat-header{font-size:11px;min-height:34px}#page-dashboard .nw-symbol{width:34px;height:34px;flex-basis:34px}#page-dashboard .nw-symbol svg{width:20px;height:20px}#page-dashboard .nw-value{font-size:32px;margin-left:0}#page-dashboard .nw-sub{margin-left:0}#page-dashboard .nw-panel{padding:12px}#page-dashboard .nw-panel-title{font-size:16px}#page-dashboard .nw-table th,#page-dashboard .nw-table td{padding:8px 4px;font-size:11px}#page-dashboard .nw-donut{width:145px;height:145px;min-width:145px}}
  `;
  document.head.appendChild(style);


  // Íconos vectoriales consistentes con la maqueta aprobada.
  const nwIcon = (name) => {
    const paths = {
      monitor: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4"/>',
      megaphone: '<path d="m3 11 12-5v12L3 13z"/><path d="M15 9.5c2 0 4 1.5 4 3s-2 3-4 3"/><path d="m6 14 2 6h4l-2-7"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      ranking: '<path d="M5 20v-6M10 20V9M15 20V4M20 20v-9"/>',
      pie: '<path d="M21 12.8A9 9 0 1 1 11.2 3V13h9.8Z"/><path d="M13 3a8 8 0 0 1 8 8h-8Z"/>'
    };
    return '<svg viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  };

  dashboard.innerHTML = `
    <div class="nw-heading">
      <h1>Resumen general</h1>
      <p>Panel de administración y seguimiento comercial</p>
    </div>
    <div class="nw-stats">
      <div class="nw-stat">
        <div class="nw-stat-header"><span class="nw-symbol blue">${nwIcon("monitor")}</span><span>Pantallas operativas</span></div>
        <div id="nwOnline" class="nw-value">—</div><div id="nwOnlineSub" class="nw-sub">Calculando…</div>
        <div class="nw-progress"><span id="nwOnlineBar" style="width:0%"></span></div>
      </div>
      <div class="nw-stat">
        <div class="nw-stat-header"><span class="nw-symbol green">${nwIcon("megaphone")}</span><span>Campañas activas</span></div>
        <div id="nwActive" class="nw-value">—</div>
      </div>
      <button class="nw-stat nw-stat-click" type="button" id="nwExpiringBtn" aria-label="Mostrar campañas próximas a vencer">
        <div class="nw-stat-header"><span class="nw-symbol orange">${nwIcon("calendar")}</span><span>Campañas a vencer</span></div>
        <div id="nwExpiring" class="nw-value orange">—</div>
      </button>
      <div class="nw-stat">
        <div class="nw-stat-header"><span class="nw-symbol people">${nwIcon("users")}</span><span>Clientes</span></div>
        <div id="nwClients" class="nw-value">—</div>
      </div>
    </div>
    <div class="nw-bottom">
      <section class="nw-panel">
        <h2 class="nw-panel-title"><span class="nw-title-icon">${nwIcon("ranking")}</span> Elemento con más campañas (Top 5)</h2>
        <table class="nw-table">
          <thead><tr><th>#</th><th>Pantalla</th><th colspan="2">Cantidad de campañas</th></tr></thead>
          <tbody id="nwTopFive"></tbody>
        </table>
      </section>
      <section class="nw-panel">
        <h2 class="nw-panel-title"><span class="nw-title-icon">${nwIcon("pie")}</span> Campañas por estado</h2>
        <div class="nw-donut-layout">
          <div id="nwDonut" class="nw-donut"><div class="nw-donut-center"><strong id="nwDonutTotal">0</strong><span>Campañas</span></div></div>
          <div id="nwLegend" class="nw-legend"></div>
        </div>
      </section>
    </div>
  `;

  // Todas las cifras salen de cachés sujetas a los permisos/RLS existentes.
  function expiringCampaigns(){
    const day = new Date(); day.setHours(0,0,0,0);
    const until = new Date(day); until.setDate(until.getDate()+7);
    return (cacheCampanias || []).filter(c => {
      if(c.estado !== 'activa' || !c.fecha_hasta) return false;
      const end = new Date(c.fecha_hasta + 'T00:00:00');
      return end >= day && end <= until;
    }).sort((a,b) => a.fecha_hasta.localeCompare(b.fecha_hasta));
  }
  function showDetails(title, items){
    const root = document.getElementById('modalRoot');
    if(!root) return;
    root.innerHTML = '<div class="modal-backdrop" id="nwModalBackdrop"><div class="modal" style="max-width:640px"><h3>' + escapeHtml(title) + '</h3><div class="nw-details-list">' +
      (items.length ? items.join('') : '<div class="nw-details-item">No hay campañas para mostrar.</div>') +
      '</div><div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn btn-ghost" id="nwCloseModal">Cerrar</button></div></div></div>';
    document.getElementById('nwCloseModal').addEventListener('click', closeModal);
    document.getElementById('nwModalBackdrop').addEventListener('click', function(e){if(e.target===this)closeModal();});
  }
  document.getElementById('nwExpiringBtn').addEventListener('click',function(){
    const items = expiringCampaigns().map(c =>
      '<div class="nw-details-item"><strong>' + escapeHtml(c.campania || 'Campaña') + '</strong><span>Cliente: ' + escapeHtml(c.cliente || '-') + ' · Vence: ' + escapeHtml(fmtDate(c.fecha_hasta)) + '</span></div>'
    );
    showDetails('Campañas a vencer · próximos 7 días', items);
  });

  window.nwShowScreenCampaigns = function(screenId){
    const screen = (cachePantallas || []).find(s => String(s.id) === String(screenId));
    const campaigns = (cacheCampanias || []).filter(c => c.estado === 'activa' &&
      (campaignScreensMap[c.id] || []).some(s => String(s.id) === String(screenId)));
    const items = campaigns.map(c => '<div class="nw-details-item"><strong>' + escapeHtml(c.campania || '-') + '</strong><span>' +
      escapeHtml(c.cliente || '-') + ' · ' + escapeHtml(fmtDate(c.fecha_desde)) + ' al ' + escapeHtml(fmtDate(c.fecha_hasta)) +
      ' · ' + escapeHtml(String(c.porcentaje || 0)) + '%</span></div>');
    showDetails('Campañas de ' + (screen?.nombre || 'pantalla'), items);
  };

  function renderNewDashboard(){
    const screens = cachePantallas || [];
    const campaigns = cacheCampanias || [];
    const clients = cacheClientes || [];
    const online = screens.filter(s => s._estadoReal === 'online').length;
    const active = campaigns.filter(c => c.estado === 'activa');
    document.getElementById('nwOnline').textContent = online + '/' + screens.length;
    document.getElementById('nwOnlineSub').textContent = (screens.length ? Math.round(online/screens.length*100) : 0) + '% operativas';
    document.getElementById('nwOnlineBar').style.width = (screens.length ? online/screens.length*100 : 0) + '%';
    document.getElementById('nwActive').textContent = active.length.toLocaleString('es-AR');
    document.getElementById('nwExpiring').textContent = expiringCampaigns().length.toLocaleString('es-AR');
    document.getElementById('nwClients').textContent = clients.length.toLocaleString('es-AR');

    const counts = screens.map(s => ({
      screen:s,
      count:active.filter(c => (campaignScreensMap[c.id]||[]).some(p => String(p.id) === String(s.id))).length
    })).sort((a,b) => b.count-a.count || String(a.screen.nombre).localeCompare(String(b.screen.nombre),'es')).slice(0,5);
    document.getElementById('nwTopFive').innerHTML = counts.length ? counts.map((r,i) =>
      '<tr><td><span class="nw-rank">' + (i+1) + '</span></td><td>' + escapeHtml(r.screen.nombre || 'Pantalla') +
      '</td><td><span class="nw-quantity">' + r.count + '</span></td><td><button type="button" class="nw-link nw-top-row" data-screen-id="' +
      escapeHtml(r.screen.id) + '">Ver campañas ›</button></td></tr>'
    ).join('') : '<tr><td colspan="4">No hay pantallas registradas.</td></tr>';
    document.querySelectorAll('#nwTopFive [data-screen-id]').forEach(b =>
      b.addEventListener('click', () => window.nwShowScreenCampaigns(b.dataset.screenId)));

    const status = [
      {key:'activa',label:'Activas',color:'#08c475'},
      {key:'proxima',label:'Próximas',color:'#fb951c'},
      {key:'pausada',label:'Pausadas',color:'#248cf3'},
      {key:'finalizada',label:'Finalizadas',color:'#8855df'}
    ];
    const values = status.map(s => ({...s,count:campaigns.filter(c => c.estado === s.key).length}));
    const total = values.reduce((n,x) => n + x.count,0);
    document.getElementById('nwDonutTotal').textContent = total.toLocaleString('es-AR');
    let pct = 0;
    const parts = [];
    values.forEach(v=>{if(!v.count)return;const next=pct+v.count/total*100;parts.push(v.color+' '+pct+'% '+next+'%');pct=next;});
    document.getElementById('nwDonut').style.background = parts.length ? 'conic-gradient('+parts.join(',')+')' : '#e8eef5';
    document.getElementById('nwLegend').innerHTML = values.map(v =>
      '<div class="nw-legend-item"><span class="nw-legend-dot" style="background:'+v.color+'"></span><span>'+v.label+
      '</span><strong>'+v.count+' ('+(total?Math.round(v.count/total*100):0)+'%)</strong></div>'
    ).join('');
  }

  // La versión anterior del dashboard hacía consultas adicionales y escribía
  // elementos eliminados. Conservamos el ciclo de refresco y sustituimos
  // exclusivamente su renderizado.
  loadDashboard = async function(){renderNewDashboard();};
  // Recalcular después de que terminen las cargas iniciales.
  renderNewDashboard();
})();
