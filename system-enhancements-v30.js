// NextWork V30 - Dashboard + alertas + vista previa/descarga de campañas

(function(){
  const style = document.createElement('style');
  style.id = 'nextwork-v30-ui';
  style.textContent = `
    #page-dashboard .grid{
      gap:14px;
      margin-bottom:18px;
    }
    #page-dashboard .card{
      min-height:128px;
      padding:19px 20px 17px;
      border-radius:20px;
      border:1px solid #e5eaf4;
      box-shadow:0 10px 28px rgba(15,23,42,.07);
      background:linear-gradient(145deg,#ffffff 0%,#f8faff 100%);
    }
    #page-dashboard .card::before{height:3px}
    #page-dashboard .metric-label{font-size:11px;letter-spacing:.075em}
    #page-dashboard .metric-value{font-size:34px;margin-top:8px;letter-spacing:-.04em}
    #page-dashboard .metric-sub{margin-top:4px}

    .dash-alerts-card{
      background:linear-gradient(135deg,#fff 0%,#fffaf0 100%);
      border:1px solid #fde4a7;
      border-radius:20px;
      padding:18px;
      margin:0 0 20px;
      box-shadow:0 10px 28px rgba(146,64,14,.07);
    }
    .dash-alerts-card.is-empty{
      background:linear-gradient(135deg,#fff 0%,#f8fbff 100%);
      border-color:#e5eaf4;
    }
    .dash-alerts-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
    .dash-alerts-title{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:900;color:#172033}
    .dash-alerts-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#fff1c8;color:#b45309;font-size:18px}
    .dash-alerts-count{font-size:11px;font-weight:900;padding:6px 10px;border-radius:999px;background:#fff1c8;color:#92400e;white-space:nowrap}
    .dash-alerts-empty{font-size:13px;color:#64748b;padding:4px 2px}
    .dash-alert-list{display:grid;gap:8px}
    .dash-alert-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 12px;border-radius:13px;background:#fff;border:1px solid #f5e1b5}
    .dash-alert-main{min-width:0}
    .dash-alert-name{font-size:13px;font-weight:900;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .dash-alert-meta{font-size:11px;color:#7c879b;margin-top:3px}
    .dash-alert-days{font-size:12px;font-weight:900;color:#b45309;background:#fff7df;border-radius:999px;padding:7px 10px;white-space:nowrap}
    .dash-alert-days.urgent{color:#b91c1c;background:#fee2e2}

    #page-dashboard .section-title{margin-top:18px}
    #page-dashboard .table-wrap{border-radius:16px;box-shadow:0 8px 24px rgba(15,23,42,.055)}

    .campaign-content-actions{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:5px}
    .campaign-media-btn{border:1px solid #dce3ef;background:#fff;color:#4f46e5;border-radius:8px;padding:5px 7px;font-size:10px;font-weight:850;cursor:pointer;line-height:1}
    .campaign-media-btn:hover{background:#f5f3ff;border-color:#c4b5fd}

    .media-preview-modal{width:min(900px,calc(100vw - 36px))!important;max-width:900px!important}
    .media-preview-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px}
    .media-preview-head h3{margin:0;font-size:20px}
    .media-preview-stage{background:#070b14;border-radius:16px;min-height:300px;display:grid;place-items:center;overflow:hidden;border:1px solid #1e293b}
    .media-preview-stage video,.media-preview-stage img{display:block;max-width:100%;max-height:62vh;object-fit:contain}
    .media-preview-meta{font-size:12px;color:#64748b;margin-top:10px;overflow-wrap:anywhere}
    .media-preview-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}
    @media(max-width:800px){
      #page-dashboard .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .dash-alert-item{grid-template-columns:1fr}
      .dash-alert-days{justify-self:start}
    }
  `;
  document.head.appendChild(style);

  function localDateOnly(value){
    if(!value) return null;
    const s = String(value).slice(0,10);
    const parts = s.split('-').map(Number);
    if(parts.length !== 3 || parts.some(x=>!Number.isFinite(x))) return null;
    return new Date(parts[0],parts[1]-1,parts[2],12,0,0,0);
  }

  function daysUntil(value){
    const end = localDateOnly(value);
    if(!end) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(),now.getMonth(),now.getDate(),12,0,0,0);
    return Math.round((end-today)/86400000);
  }

  function ensureDashboardAlerts(){
    const page = $('page-dashboard');
    if(!page) return null;
    let box = $('dashCampaignAlerts');
    if(box) return box;
    const grid = page.querySelector('.grid');
    if(!grid) return null;
    box = document.createElement('section');
    box.id = 'dashCampaignAlerts';
    box.className = 'dash-alerts-card is-empty';
    grid.insertAdjacentElement('afterend',box);
    return box;
  }

  function renderDashboardAlerts(){
    const box = ensureDashboardAlerts();
    if(!box) return;
    const alerts = (cacheCampanias || [])
      .map(c => ({ c, days: daysUntil(c.fecha_hasta) }))
      .filter(x => x.days !== null && x.days >= 0 && x.days <= 10 && x.c.estado !== 'finalizada' && x.c.estado !== 'pausada')
      .sort((a,b)=>a.days-b.days || String(a.c.campania||'').localeCompare(String(b.c.campania||''),'es'));

    if(!alerts.length){
      box.className = 'dash-alerts-card is-empty';
      box.innerHTML = `
        <div class="dash-alerts-head">
          <div class="dash-alerts-title"><span class="dash-alerts-icon">✓</span>Vencimientos próximos</div>
        </div>
        <div class="dash-alerts-empty">No hay campañas que venzan dentro de los próximos 10 días.</div>`;
      return;
    }

    box.className = 'dash-alerts-card';
    box.innerHTML = `
      <div class="dash-alerts-head">
        <div class="dash-alerts-title"><span class="dash-alerts-icon">⚠</span>Vencimientos próximos</div>
        <span class="dash-alerts-count">${alerts.length} alerta${alerts.length===1?'':'s'}</span>
      </div>
      <div class="dash-alert-list">
        ${alerts.map(({c,days}) => {
          const screens = (campaignScreensMap[c.id] || []).map(p=>p.nombre).filter(Boolean).join(', ') || 'Sin pantalla';
          const msg = days === 0 ? 'Vence hoy' : days === 1 ? 'Falta 1 día' : `Faltan ${days} días`;
          return `<div class="dash-alert-item">
            <div class="dash-alert-main">
              <div class="dash-alert-name">${escapeHtml(c.campania || c.nombre || 'Campaña')}</div>
              <div class="dash-alert-meta">${escapeHtml(c.cliente || 'Sin cliente')} · ${escapeHtml(screens)} · vence ${fmtDate(c.fecha_hasta)}</div>
            </div>
            <div class="dash-alert-days ${days<=3?'urgent':''}">${msg}</div>
          </div>`;
        }).join('')}
      </div>`;
  }

  const originalLoadDashboardV30 = loadDashboard;
  loadDashboard = async function(){
    await originalLoadDashboardV30();
    renderDashboardAlerts();
  };

  function campaignByRow(row){
    const name = row?.querySelector('.campaign-name-cell')?.textContent?.trim();
    if(!name) return null;
    return (cacheCampanias || []).find(c => String(c.campania || c.nombre || '').trim() === name) || null;
  }

  function mediaPublicUrl(c){
    const path = c?.archivo_url || c?.archivo_path || '';
    if(!path) return '';
    if(/^https?:\/\//i.test(path)) return path;
    try{
      const { data } = sb.storage.from('publicidades').getPublicUrl(path);
      return data?.publicUrl || '';
    }catch(_){ return ''; }
  }

  window.openCampaignMediaPreview = function(id){
    const c = (cacheCampanias || []).find(x => x.id === id);
    if(!c) return;
    const tipo = String(c.tipo_contenido || '').toLowerCase();
    const url = mediaPublicUrl(c);
    if(!url){ alert('Esta campaña no tiene un archivo disponible para vista previa.'); return; }
    if(!['video','imagen'].includes(tipo)){ alert('La vista previa está disponible para videos e imágenes.'); return; }
    const media = tipo === 'video'
      ? `<video src="${escapeHtml(url)}" controls autoplay playsinline style="width:100%"></video>`
      : `<img src="${escapeHtml(url)}" alt="${escapeHtml(c.campania || 'Campaña')}">`;
    $('modalRoot').innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
        <div class="modal media-preview-modal">
          <div class="media-preview-head"><div><h3>${escapeHtml(c.campania || 'Vista previa')}</h3><div class="small" style="margin-top:4px">${escapeHtml(c.cliente || '')}</div></div><button class="btn btn-ghost btn-sm" onclick="closeModal()">Cerrar</button></div>
          <div class="media-preview-stage">${media}</div>
          <div class="media-preview-meta">${escapeHtml(c.archivo_url || c.archivo_path || '')}</div>
          <div class="media-preview-actions"><button class="btn btn-ghost" onclick="closeModal()">Cerrar</button><button class="btn btn-primary" onclick="downloadCampaignMedia('${c.id}')">Descargar archivo</button></div>
        </div>
      </div>`;
  };

  window.downloadCampaignMedia = async function(id){
    const c = (cacheCampanias || []).find(x => x.id === id);
    if(!c) return;
    const url = mediaPublicUrl(c);
    if(!url){ alert('Esta campaña no tiene un archivo disponible.'); return; }
    try{
      const res = await fetch(url);
      if(!res.ok) throw new Error('No se pudo descargar el archivo');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const raw = String(c.archivo_url || c.archivo_path || '').split('/').pop() || `${c.campania || 'campania'}.${String(c.tipo_contenido).toLowerCase()==='imagen'?'jpg':'mp4'}`;
      a.href = objectUrl;
      a.download = raw;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
    }catch(err){
      console.error(err);
      window.open(url,'_blank','noopener');
    }
  };

  function enhanceCampaignContentActions(){
    document.querySelectorAll('#campaniasBody tr').forEach(row => {
      if(row.querySelector('.campaign-content-actions')) return;
      const c = campaignByRow(row);
      if(!c) return;
      const tipo = String(c.tipo_contenido || '').toLowerCase();
      if(!['video','imagen'].includes(tipo)) return;
      const cells = row.querySelectorAll('td');
      const contentCell = cells[cells.length-1];
      if(!contentCell) return;
      const actions = document.createElement('div');
      actions.className = 'campaign-content-actions';
      actions.innerHTML = `<button class="campaign-media-btn" onclick="openCampaignMediaPreview('${c.id}')">Vista previa</button><button class="campaign-media-btn" onclick="downloadCampaignMedia('${c.id}')">Descargar</button>`;
      contentCell.appendChild(actions);
    });
  }

  const originalRenderCampaniasV30 = renderCampanias;
  renderCampanias = function(){
    originalRenderCampaniasV30();
    enhanceCampaignContentActions();
  };

  // Mejora visual inicial del Dashboard.
  const dashPage = $('page-dashboard');
  if(dashPage){
    dashPage.querySelectorAll('.card').forEach((card,i)=> card.setAttribute('data-kpi',String(i+1)));
  }
  setTimeout(()=>{ renderDashboardAlerts(); enhanceCampaignContentActions(); },0);
})();
