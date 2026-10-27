(()=>{
  const style = document.createElement('style');
  style.id = 'nextwork-groups-layout-v3';
  style.textContent = `
    #page-grupos #gruposCards{
      width:100% !important;
      max-width:none !important;
      display:grid !important;
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      gap:20px !important;
      justify-content:stretch !important;
      align-items:stretch !important;
    }

    #page-grupos .group-card{
      width:100% !important;
      min-width:0 !important;
      min-height:340px !important;
      height:auto !important;
      display:flex !important;
      flex-direction:column !important;
      border-radius:22px !important;
      overflow:hidden !important;
    }

    #page-grupos .group-card-head{
      padding:20px 20px 16px !important;
      min-height:112px !important;
      gap:14px !important;
    }

    #page-grupos .group-title-wrap{
      gap:14px !important;
      min-width:0 !important;
    }

    #page-grupos .group-icon{
      width:54px !important;
      height:54px !important;
      flex:0 0 54px !important;
      border-radius:16px !important;
    }

    #page-grupos .group-name{
      font-size:19px !important;
      line-height:1.15 !important;
      margin-bottom:5px !important;
    }

    #page-grupos .group-desc{
      font-size:12.5px !important;
      line-height:1.4 !important;
      min-height:35px !important;
      max-width:none !important;
      -webkit-line-clamp:2 !important;
    }

    #page-grupos .group-body{
      padding:18px 20px 20px !important;
      gap:16px !important;
    }

    #page-grupos .group-stats{
      display:grid !important;
      grid-template-columns:repeat(4,minmax(0,1fr)) !important;
      gap:9px !important;
      width:100% !important;
    }

    #page-grupos .group-stat{
      min-width:0 !important;
      min-height:82px !important;
      padding:10px 6px !important;
      border-radius:14px !important;
    }

    #page-grupos .group-stat strong{
      font-size:21px !important;
      margin-bottom:7px !important;
    }

    #page-grupos .group-stat span{
      font-size:9px !important;
      line-height:1.15 !important;
      letter-spacing:.035em !important;
      white-space:normal !important;
      overflow-wrap:normal !important;
      word-break:normal !important;
    }

    #page-grupos .group-actions{
      margin-top:auto !important;
      padding-top:14px !important;
      gap:8px !important;
    }

    #page-grupos .group-actions .btn,
    #page-grupos .group-actions .soft-chip{
      min-height:38px !important;
      padding:8px 13px !important;
      font-size:12px !important;
    }

    @media(max-width:1180px){
      #page-grupos #gruposCards{
        grid-template-columns:1fr !important;
      }
    }

    @media(max-width:700px){
      #page-grupos .group-stats{
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      }
    }
  `;
  document.head.appendChild(style);
})();