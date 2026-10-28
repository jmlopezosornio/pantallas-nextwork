// NextWork V32 - Grupos: dos tarjetas por fila y uso completo del ancho
(function(){
  const style = document.createElement('style');
  style.id = 'nextwork-groups-layout-v32';
  style.textContent = `
    #page-grupos{
      width:100% !important;
      max-width:none !important;
      margin:0 !important;
      padding:0 !important;
    }

    #page-grupos > *{
      width:100% !important;
      max-width:none !important;
      margin-left:0 !important;
      margin-right:0 !important;
    }

    #page-grupos .section-title{
      margin:0 0 14px !important;
      padding:0 2px !important;
      align-items:flex-end !important;
    }

    #page-grupos #gruposCards,
    #page-grupos .groups-grid{
      display:grid !important;
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      gap:16px !important;
      width:100% !important;
      max-width:none !important;
      align-items:stretch !important;
    }

    #page-grupos .group-card{
      width:100% !important;
      min-width:0 !important;
      min-height:300px !important;
      height:auto !important;
      display:flex !important;
      flex-direction:column !important;
      border-radius:20px !important;
    }

    #page-grupos .group-card-head{
      min-height:105px !important;
      padding:18px 18px 15px !important;
      gap:12px !important;
    }

    #page-grupos .group-title-wrap{
      gap:12px !important;
      min-width:0 !important;
      flex:1 !important;
    }

    #page-grupos .group-icon{
      width:46px !important;
      height:46px !important;
      flex:0 0 46px !important;
      border-radius:14px !important;
    }

    #page-grupos .group-name{
      font-size:17px !important;
      line-height:1.2 !important;
      margin:0 0 4px !important;
    }

    #page-grupos .group-desc{
      font-size:11.5px !important;
      line-height:1.35 !important;
      min-height:0 !important;
      max-width:none !important;
      display:-webkit-box !important;
      -webkit-line-clamp:2 !important;
      -webkit-box-orient:vertical !important;
      overflow:hidden !important;
    }

    #page-grupos .group-body{
      padding:15px 18px 17px !important;
      gap:12px !important;
      flex:1 !important;
      display:flex !important;
      flex-direction:column !important;
    }

    #page-grupos .group-stats{
      display:grid !important;
      grid-template-columns:repeat(4,minmax(0,1fr)) !important;
      gap:8px !important;
      width:100% !important;
    }

    #page-grupos .group-stat{
      min-height:76px !important;
      padding:9px 6px !important;
      border-radius:13px !important;
      overflow:hidden !important;
    }

    #page-grupos .group-stat strong{
      font-size:18px !important;
      line-height:1 !important;
      margin-bottom:6px !important;
    }

    #page-grupos .group-stat span{
      font-size:8.5px !important;
      line-height:1.15 !important;
      letter-spacing:.035em !important;
      white-space:normal !important;
    }

    #page-grupos .group-actions{
      margin-top:auto !important;
      padding-top:12px !important;
      gap:7px !important;
    }

    #page-grupos .group-actions .btn,
    #page-grupos .group-actions .soft-chip{
      min-height:34px !important;
      padding:7px 10px !important;
      font-size:11px !important;
    }

    @media(max-width:980px){
      #page-grupos #gruposCards,
      #page-grupos .groups-grid{
        grid-template-columns:1fr !important;
      }
    }

    @media(max-width:620px){
      #page-grupos .group-stats{
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      }
    }
  `;
  document.head.appendChild(style);

  const page = document.getElementById('page-grupos');
  if(page && page.parentElement){
    page.parentElement.style.width = '100%';
    page.parentElement.style.maxWidth = 'none';
  }

  // Hotfix V32: evita error al refrescar campañas después de ocultar el listado del Dashboard.
  if(!document.querySelector('script[data-nextwork-dashboard-hotfix-v32]')){
    const hotfix = document.createElement('script');
    hotfix.src = './dashboard-hotfix-v32.js?v=1';
    hotfix.dataset.nextworkDashboardHotfixV32 = '1';
    document.body.appendChild(hotfix);
  }
})();
