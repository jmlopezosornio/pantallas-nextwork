// NextWork V32 - Hotfix: preservar destino oculto de dashCampanias
(function(){
  function ensureDashCampaignSink(){
    const page = document.getElementById('page-dashboard');
    if(!page || document.getElementById('dashCampanias')) return;

    const hiddenWrap = document.createElement('div');
    hiddenWrap.id = 'dashCampaniasCompat';
    hiddenWrap.style.display = 'none';
    hiddenWrap.innerHTML = `
      <div class="section-title"><h2>Campañas activas</h2></div>
      <div class="table-wrap">
        <table><tbody id="dashCampanias"></tbody></table>
      </div>`;
    page.appendChild(hiddenWrap);
  }

  function installHotfix(){
    if(window.__nextworkDashboardHotfixV32) return true;
    if(typeof loadDashboard !== 'function') return false;

    const previousLoadDashboard = loadDashboard;
    loadDashboard = async function(){
      ensureDashCampaignSink();
      try{
        return await previousLoadDashboard();
      }finally{
        // El módulo visual puede eliminar el destino; lo recreamos para la próxima actualización.
        ensureDashCampaignSink();
      }
    };

    window.__nextworkDashboardHotfixV32 = true;
    ensureDashCampaignSink();
    return true;
  }

  if(!installHotfix()){
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if(installHotfix() || attempts > 40) clearInterval(timer);
    }, 100);
  }
})();
