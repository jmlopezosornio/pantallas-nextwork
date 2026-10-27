(()=>{
  const $ = (id)=>document.getElementById(id);
  let originalRender = null;
  let initialized = false;
  let lastScreenSignature = '';

  function screenName(p){
    const loc = p?.ubicacion ? ` · ${p.ubicacion}` : '';
    return `${p?.nombre || 'Pantalla'}${loc}`;
  }

  function getScreens(){
    return (typeof cachePantallas !== 'undefined' && Array.isArray(cachePantallas))
      ? cachePantallas.filter(p=>p && p.id)
      : [];
  }

  function populateScreenFilter(force=false){
    const select = $('filtroPantallaCampania');
    if(!select) return;

    const screens = getScreens().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    const signature = screens.map(p=>`${p.id}:${p.nombre||''}:${p.ubicacion||''}`).join('|');

    if(!force && signature === lastScreenSignature && select.options.length > 1) return;

    const current = select.value;
    select.innerHTML = ['<option value="">Todas las pantallas</option>']
      .concat(screens.map(p=>`<option value="${p.id}">${screenName(p)}</option>`))
      .join('');

    if([...select.options].some(o=>o.value===current)) select.value = current;
    lastScreenSignature = signature;
  }

  function renderFiltered(){
    if(!originalRender) return;
    const select = $('filtroPantallaCampania');
    const pantallaId = select?.value || '';

    if(!pantallaId){
      originalRender();
      return;
    }

    if(typeof cacheCampanias === 'undefined' || typeof campaignScreensMap === 'undefined'){
      originalRender();
      return;
    }

    const originalCache = cacheCampanias;
    try{
      cacheCampanias = originalCache.filter(c =>
        (campaignScreensMap[c.id] || []).some(p => String(p.id) === String(pantallaId))
      );
      originalRender();
    } finally {
      cacheCampanias = originalCache;
    }
  }

  function refreshAll(){
    populateScreenFilter();
    renderFiltered();
  }

  function install(){
    if(initialized) return true;
    const toolbar = document.querySelector('#page-campanias .toolbar');
    const filtroTipo = $('filtroTipo');
    if(!toolbar || !filtroTipo || typeof renderCampanias !== 'function') return false;

    initialized = true;
    originalRender = renderCampanias;

    let select = $('filtroPantallaCampania');
    if(!select){
      select = document.createElement('select');
      select.id = 'filtroPantallaCampania';
      select.setAttribute('aria-label','Filtrar campañas por pantalla');
      select.style.minWidth = '210px';
      select.innerHTML = '<option value="">Todas las pantallas</option>';
      filtroTipo.insertAdjacentElement('afterend', select);
    }

    populateScreenFilter(true);

    select.addEventListener('change', renderFiltered);
    select.addEventListener('focus', ()=>populateScreenFilter(true));
    select.addEventListener('mousedown', ()=>populateScreenFilter(true));
    $('filtroCampania')?.addEventListener('input', ()=>setTimeout(renderFiltered,0));
    filtroTipo.addEventListener('change', ()=>setTimeout(refreshAll,0));

    document.addEventListener('click', (ev)=>{
      if(ev.target.closest('[data-campaign-tab]')) setTimeout(renderFiltered,0);
    });

    const body = $('campaniasBody');
    if(body){
      const observer = new MutationObserver(()=>{
        populateScreenFilter();
      });
      observer.observe(body,{childList:true,subtree:false});
    }

    // Mantiene el combo sincronizado con cachePantallas aunque los datos lleguen después.
    let attempts = 0;
    const syncTimer = setInterval(()=>{
      attempts++;
      populateScreenFilter();
      if(getScreens().length > 0 || attempts >= 20) clearInterval(syncTimer);
    },500);

    setTimeout(refreshAll,600);
    setTimeout(refreshAll,1600);
    setTimeout(refreshAll,3000);
    return true;
  }

  const timer = setInterval(()=>{
    if(install()) clearInterval(timer);
  },150);
})();
