// NextWork V33 - Alertas de vencimiento robustas desde Supabase
(function(){
  function parseCampaignDate(value){
    if(!value) return null;
    const s = String(value).trim();

    let y, m, d;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(iso){
      y = Number(iso[1]); m = Number(iso[2]); d = Number(iso[3]);
    }else{
      const ar = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if(!ar) return null;
      d = Number(ar[1]); m = Number(ar[2]); y = Number(ar[3]);
    }

    const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function daysUntil(value){
    const end = parseCampaignDate(value);
    if(!end) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    return Math.round((end - today) / 86400000);
  }

  function ensureAlertBox(){
    const page = document.getElementById('page-dashboard');
    if(!page) return null;

    let box = document.getElementById('dashCampaignAlerts');
    if(box) return box;

    const grid = page.querySelector('.grid');
    if(!grid) return null;

    box = document.createElement('section');
    box.id = 'dashCampaignAlerts';
    box.className = 'dash-alerts-card is-empty';
    grid.insertAdjacentElement('afterend', box);
    return box;
  }

  function formatDateAR(value){
    const d = parseCampaignDate(value);
    return d ? d.toLocaleDateString('es-AR') : String(value || '');
  }

  async function refreshExpirationAlerts(){
    const box = ensureAlertBox();
    if(!box || typeof sb === 'undefined') return;

    try{
      const { data, error } = await sb
        .from('vista_campanias')
        .select('id,campania,cliente,fecha_hasta,estado')
        .order('fecha_hasta', { ascending:true });

      if(error) throw error;

      const alerts = (data || [])
        .map(c => ({ c, days:daysUntil(c.fecha_hasta) }))
        .filter(x => x.days !== null && x.days >= 0 && x.days <= 10)
        .filter(x => !['finalizada','pausada'].includes(String(x.c.estado || '').toLowerCase()))
        .sort((a,b) => a.days - b.days || String(a.c.campania || '').localeCompare(String(b.c.campania || ''), 'es'));

      if(!alerts.length){
        box.className = 'dash-alerts-card is-empty';
        box.innerHTML = '<div class="dash-alerts-head"><div class="dash-alerts-title"><span class="dash-alerts-icon">✓</span>Vencimientos próximos</div></div><div class="dash-alerts-empty">No hay campañas que venzan dentro de los próximos 10 días.</div>';
        return;
      }

      box.className = 'dash-alerts-card';
      box.innerHTML = '<div class="dash-alerts-head"><div class="dash-alerts-title"><span class="dash-alerts-icon">⚠</span>Vencimientos próximos</div><span class="dash-alerts-count">' + alerts.length + ' alerta' + (alerts.length === 1 ? '' : 's') + '</span></div>' +
        '<div class="dash-alert-list">' + alerts.map(({c,days}) => {
          const msg = days === 0 ? 'Vence hoy' : days === 1 ? 'Falta 1 día' : 'Faltan ' + days + ' días';
          const urgent = days <= 3 ? ' urgent' : '';
          const name = typeof escapeHtml === 'function' ? escapeHtml(c.campania || 'Campaña') : String(c.campania || 'Campaña');
          const client = typeof escapeHtml === 'function' ? escapeHtml(c.cliente || 'Sin cliente') : String(c.cliente || 'Sin cliente');
          return '<div class="dash-alert-item">' +
            '<div class="dash-alert-main">' +
              '<div class="dash-alert-name">' + name + '</div>' +
              '<div class="dash-alert-meta">' + client + ' · vence ' + formatDateAR(c.fecha_hasta) + '</div>' +
            '</div>' +
            '<div class="dash-alert-days' + urgent + '">' + msg + '</div>' +
          '</div>';
        }).join('') + '</div>';
    }catch(err){
      console.error('Error actualizando alertas de vencimiento:', err);
    }
  }

  window.refreshExpirationAlerts = refreshExpirationAlerts;

  // Refresca una vez que terminan de cargar las entidades iniciales.
  let tries = 0;
  const initTimer = setInterval(() => {
    tries++;
    if(document.getElementById('page-dashboard') && typeof sb !== 'undefined'){
      clearInterval(initTimer);
      setTimeout(refreshExpirationAlerts, 400);
    }else if(tries > 40){
      clearInterval(initTimer);
    }
  }, 250);

  // Mantener la alerta actualizada sin depender del cache interno.
  setInterval(refreshExpirationAlerts, 60000);

  // Cuando se navega al Dashboard, volver a calcular.
  const originalShowPage = window.showPage;
  if(typeof originalShowPage === 'function'){
    window.showPage = function(page){
      originalShowPage(page);
      if(page === 'dashboard') setTimeout(refreshExpirationAlerts, 150);
    };
  }
})();
