// NextWork V31 - Dashboard full-width y compacto
(function(){
  const style = document.createElement('style');
  style.id = 'nextwork-dashboard-v31';
  style.textContent = `
    /* Aprovechar todo el ancho útil del Dashboard */
    #page-dashboard{
      width:100% !important;
      max-width:none !important;
      margin:0 !important;
      padding:0 !important;
    }

    /* Evitar que el contenido del dashboard quede corrido hacia la derecha */
    #page-dashboard > *{
      width:100% !important;
      max-width:none !important;
      margin-left:0 !important;
      margin-right:0 !important;
    }

    #page-dashboard .grid{
      width:100% !important;
      grid-template-columns:repeat(4,minmax(0,1fr)) !important;
      gap:12px !important;
      margin:0 0 12px !important;
    }

    #page-dashboard .card{
      min-width:0 !important;
      min-height:108px !important;
      padding:14px 16px !important;
    }

    #page-dashboard .metric-value{
      font-size:30px !important;
      margin-top:5px !important;
    }

    #page-dashboard .metric-sub{
      font-size:10.5px !important;
      margin-top:2px !important;
    }

    #dashCampaignAlerts{
      width:100% !important;
      margin:0 0 12px !important;
    }

    #page-dashboard .section-title{
      margin:10px 0 8px !important;
    }

    #page-dashboard .table-wrap{
      width:100% !important;
      max-width:none !important;
      margin:0 !important;
    }

    #page-dashboard .table-wrap table{
      width:100% !important;
    }

    /* La caja exterior del contenido no debe crear una gran sangría visual */
    .content:has(#page-dashboard){
      padding:16px 20px 20px !important;
    }

    @media(max-width:1100px){
      #page-dashboard .grid{
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      }
    }

    @media(max-width:650px){
      #page-dashboard .grid{
        grid-template-columns:1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
