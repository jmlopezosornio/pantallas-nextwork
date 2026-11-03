// Hotfix de navegación para la vista global de Empresas.
// La seguridad real sigue dependiendo de isSuperAdmin() y de las políticas RLS de Supabase.
(function(){
  'use strict';

  function applyFix(){
    try{
      if(typeof isSuperAdmin !== 'function' || !isSuperAdmin()) return;
      const btn = document.getElementById('nav-empresas');
      if(!btn) return;

      // Evita que configureRoleNavigation() vuelva a ocultarlo por no pertenecer
      // al conjunto de páginas estándar del rol Administrador.
      btn.removeAttribute('data-page');
      btn.classList.remove('hidden');
      btn.style.display = 'flex';
      btn.setAttribute('data-superadmin-page','empresas');
    }catch(err){
      console.warn('No se pudo aplicar hotfix de Empresas:', err);
    }
  }

  const observer = new MutationObserver(applyFix);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-page','style']});

  const timer = setInterval(applyFix,150);
  window.addEventListener('beforeunload',()=>{
    clearInterval(timer);
    observer.disconnect();
  });

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',applyFix);
  }else{
    applyFix();
  }
})();
