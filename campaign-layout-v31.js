// NextWork V31 - Layout amplio para Publicidades/Campañas
(function(){
  const style = document.createElement('style');
  style.id = 'nextwork-campaign-layout-v31';
  style.textContent = `
    #page-campanias{
      width:100% !important;
      max-width:none !important;
      margin:0 !important;
      padding:0 !important;
    }

    #page-campanias > .section-title,
    #page-campanias > .toolbar,
    #page-campanias .campaign-tabs,
    #page-campanias .campaign-summary-line,
    #page-campanias .campaign-list-wrap{
      width:100% !important;
      max-width:none !important;
    }

    #page-campanias .section-title{
      margin:0 0 10px !important;
      padding:0 2px !important;
    }

    #page-campanias .section-title h2{
      font-size:22px !important;
      margin:0 0 4px !important;
    }

    #page-campanias .toolbar{
      display:grid !important;
      grid-template-columns:minmax(260px,1.35fr) minmax(210px,.9fr) minmax(250px,1.1fr) !important;
      gap:10px !important;
      padding:0 2px 12px !important;
      margin:0 !important;
      align-items:center !important;
    }

    #page-campanias .toolbar input,
    #page-campanias .toolbar select{
      width:100% !important;
      min-width:0 !important;
      height:44px !important;
      padding:10px 13px !important;
      border-radius:11px !important;
    }

    #page-campanias .campaign-tabs{
      padding:0 !important;
      margin:0 !important;
      gap:2px !important;
      border-top:1px solid #e7ecf5 !important;
      border-bottom:1px solid #e7ecf5 !important;
      background:#fff !important;
    }

    #page-campanias .campaign-tab{
      flex:0 1 auto !important;
      padding:12px 16px 10px !important;
      font-size:13px !important;
    }

    #page-campanias .campaign-summary-line{
      padding:10px 4px !important;
      margin:0 !important;
      background:transparent !important;
      border-bottom:1px solid #edf1f6 !important;
    }

    #page-campanias .campaign-list-wrap{
      margin:0 !important;
      padding:0 !important;
      overflow:visible !important;
      border:0 !important;
      box-shadow:none !important;
      background:transparent !important;
    }

    #page-campanias .campaign-list{
      width:100% !important;
      table-layout:auto !important;
      background:#fff !important;
    }

    #page-campanias .campaign-list th,
    #page-campanias .campaign-list td{
      padding:12px 10px !important;
    }

    #page-campanias .campaign-list th{
      font-size:10px !important;
    }

    #page-campanias .campaign-list td{
      font-size:12px !important;
    }

    #page-campanias .campaign-content-actions{
      margin-top:6px !important;
      gap:5px !important;
    }

    #page-campanias .campaign-media-btn{
      padding:5px 8px !important;
    }

    @media(max-width:1100px){
      #page-campanias .toolbar{
        grid-template-columns:1fr 1fr !important;
      }
      #page-campanias .toolbar > *:first-child{
        grid-column:1/-1 !important;
      }
    }

    @media(max-width:760px){
      #page-campanias .toolbar{
        grid-template-columns:1fr !important;
      }
      #page-campanias .toolbar > *:first-child{
        grid-column:auto !important;
      }
    }
  `;
  document.head.appendChild(style);

  // El contenedor blanco general de la página suele heredar padding amplio.
  // Se compacta solo cuando contiene la página de campañas/publicidades.
  const page = document.getElementById('page-campanias');
  if(page){
    const parent = page.parentElement;
    if(parent){
      parent.style.maxWidth = 'none';
      parent.style.width = '100%';
    }
  }
})();
