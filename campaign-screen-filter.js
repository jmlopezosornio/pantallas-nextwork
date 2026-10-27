(()=>{
  const $ = (id)=>document.getElementById(id);
  let originalRender = null;
  let initialized = false;

  function screenName(p){
    const loc = p?.ubicacion ? ` · ${p.ubicacion}` : '';
    return `${p?.nombre || 'Pantalla'}${loc}`;
  }

  function populateScreenFilter(){
    const select = $('filtroPantallaCampania');
    if(!select) return;
    const current = select.value;
    const screens = (typeof cachePantallas !== 'undefined' && Array.isArray(cachePantallas)) ? cachePantallas : [];
    const options = ['<option value="">Todas las pantallas</option>']
      .concat(screens
        .filter(p=>p && p.id)
        .sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'))
        .map(p=>`<option value="${p.id}">${screenName(p)}</option>`));
    select.innerHTML = options.join('');
    if([...select.options].some(o=>o.value===current)) select.value = current;
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

  function install(){
    if(initialized) return true;
    const toolbar = document.querySelector('#page-campanias .toolbar');
    const filtroTipo = $('filtroTipo');
    if(!toolbar || !filtroTipo || typeof renderCampanias !== 'function') return false;

    initialized = true;
    originalRender = renderCampanias;

    const select = document.createElement('select');
    select.id = 'filtroPantallaCampania';
    select.setAttribute('aria-label','Filtrar campañas por pantalla');
    select.style.minWidth = '210px';
    select.innerHTML = '<option value="">Todas las pantallas</option>';
    filtroTipo.insertAdjacentElement('afterend', select);

    populateScreenFilter();

    select.addEventListener('change', renderFiltered);
    $('filtroCampania')?.addEventListener('input', ()=>setTimeout(renderFiltered,0));
    filtroTipo.addEventListener('change', ()=>setTimeout(renderFiltered,0));

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

    // Reaplica el filtro después de cargas/recargas de datos.
    setTimeout(()=>{ populateScreenFilter(); renderFiltered(); },500);
    setTimeout(()=>{ populateScreenFilter(); renderFiltered(); },1800);
    return true;
  }

  const timer = setInterval(()=>{
    if(install()) clearInterval(timer);
  },150);
})();
