// Dashboard ejecutivo compacto de Arcuva - ambiente de pruebas.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;if(!base)return;
const $=id=>document.getElementById(id),esc=base.escapeHtml;
const company='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const addDays=(iso,n)=>{const x=new Date(iso+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const asDate=s=>{const x=String(s||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(x)?x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4):'—'};
const num=n=>Number(n||0).toLocaleString('es-AR');
const state=c=>{
 if(c.eliminada)return 'eliminada';
 if(c.pausada||c.estado==='pausada')return 'pausada';
 if(!c.fecha_desde||!c.fecha_hasta)return 'sin_fecha';
 const d=today();
 if(c.fecha_hasta<d)return 'finalizada';
 if(c.fecha_desde>d)return 'programada';
 return 'activa';
};
let current={screens:[],campaigns:[],clients:[],playerRows:[]};
function activeCampaigns(){return current.campaigns.filter(c=>state(c)==='activa')}
function expiring(){const now=today(),last=addDays(now,7);return activeCampaigns().filter(c=>c.fecha_hasta>=now&&c.fecha_hasta<=last).sort((a,b)=>a.fecha_hasta.localeCompare(b.fecha_hasta))}
function connection(screen){
 if(current.playerQueryFailed)return false;
 const entries=(current.playerRows||[]).filter(p=>p.pantalla_id===screen.id);
 const now=Date.now();
 const taurus=entries.find(p=>p.tipo==='novastar_taurus');
 if(taurus){
   const checked=Date.parse(taurus.actualizado_en||'');
   return !!taurus.vnnox_player_id&&Number.isFinite(checked)&&checked<=now&&now-checked<=300000&&Number(taurus.vnnox_online_status)===1;
 }
 return entries.some(p=>{
  const last=Date.parse(p.ultima_conexion||'');
  return Number.isFinite(last)&&last<=now&&now-last<=600000&&String(p.estado||'').toLowerCase()==='online';
 });
}
function modal(title,rows){
 document.querySelector('.arcuva-summary-modal-backdrop')?.remove();
 const overlay=document.createElement('div');overlay.className='arcuva-summary-modal-backdrop';
 overlay.innerHTML='<div class="arcuva-summary-modal" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><h3>'+esc(title)+'</h3><div class="arcuva-summary-modal-list">'+
 (rows.length?rows.map(r=>r.id?'<button type="button" class="arcuva-summary-modal-item arcuva-summary-modal-link" data-campaign-target="'+esc(r.id)+'"><strong>'+esc(r.title)+'</strong><span>'+esc(r.info)+'</span></button>':'<div class="arcuva-summary-modal-item"><strong>'+esc(r.title)+'</strong><span>'+esc(r.info)+'</span></div>').join(''):'<div class="arcuva-summary-modal-item">Sin campañas para mostrar.</div>')+
 '</div><button class="arcuva-summary-modal-close" type="button">Cerrar</button></div>';
 document.body.appendChild(overlay);
 const close=()=>overlay.remove();
 overlay.querySelector('.arcuva-summary-modal-close').addEventListener('click',close);
 overlay.querySelectorAll('[data-campaign-target]').forEach(button=>button.addEventListener('click',()=>{
   const target=button.dataset.campaignTarget;
   close();
   const nav=document.querySelector('.nav[data-page="campanias"]');
   if(!nav)return;
   nav.click();
   window.dispatchEvent(new CustomEvent('arcuva-focus-campaign',{detail:{id:target}}));
 }));
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 const onKey=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey)}};
 document.addEventListener('keydown',onKey,{once:true});
 overlay.querySelector('button').focus();
}
function update(){
 if(!base.getProfile()||!$('page-resumen'))return;
 const data=base.getModel();
 current={...data,screens:(data.screens||[]).filter(s=>s.empresa_id===company),campaigns:(data.campaigns||[]).filter(c=>!c.eliminada)};
 const screens=current.screens,campaigns=current.campaigns,active=activeCampaigns();
 const online=screens.filter(connection).length,percent=screens.length?Math.round(100*online/screens.length):0;
 $('arcuvaKpiOnline').textContent=online+'/'+screens.length;
 $('arcuvaOnlinePercent').textContent=data.playerQueryFailed?'Sin datos de conexión':percent+'% operativas';
 $('arcuvaOnlineBar').style.width=percent+'%';
 $('arcuvaKpiActive').textContent=num(active.length);
 $('arcuvaKpiExpiring').textContent=num(expiring().length);
 $('arcuvaKpiClients').textContent=num(new Set(current.clients||[]).size);
 const leaders=screens.map(screen=>({
   screen,
   campaigns:active.filter(c=>(c.pantallaIds||[]).includes(screen.id))
 })).sort((a,b)=>b.campaigns.length-a.campaigns.length||String(a.screen.nombre).localeCompare(String(b.screen.nombre),'es')).slice(0,5);
 $('arcuvaTopFive').innerHTML=leaders.length?leaders.map((o,i)=>'<tr><td><span class="arcuva-rank">'+(i+1)+'</span></td><td>'+esc(o.screen.nombre)+'</td><td><span class="arcuva-count">'+o.campaigns.length+'</span></td><td><button class="arcuva-top-open" type="button" data-screen="'+esc(o.screen.id)+'">Ver campañas ›</button></td></tr>').join(''):'<tr><td colspan="4">Todavía no hay pantallas registradas.</td></tr>';
 $('arcuvaTopFive').querySelectorAll('button[data-screen]').forEach(btn=>btn.addEventListener('click',()=>{
  const o=leaders.find(x=>String(x.screen.id)===btn.dataset.screen);
  if(o)modal('Campañas de '+o.screen.nombre,o.campaigns.map(c=>({title:c.campania||'Campaña',info:(c.cliente||'Sin cliente')+' · Hasta '+asDate(c.fecha_hasta)+' · '+num(c.porcentaje)+'%'})));
 }));
 const config=[
  {key:'activa',name:'Activas',color:'#08bf79'},
  {key:'programada',name:'Programadas',color:'#fd961c'},
  {key:'pausada',name:'Pausadas',color:'#218af2'},
  {key:'finalizada',name:'Finalizadas',color:'#8950df'}
 ];
 const dataStates=config.map(s=>({...s,n:campaigns.filter(c=>state(c)===s.key).length}));
 const other=campaigns.filter(c=>!config.some(s=>s.key===state(c))).length;
 if(other)dataStates.push({key:'other',name:'Otros',color:'#94a3b8',n:other});
 const total=dataStates.reduce((sum,x)=>sum+x.n,0);
 let p=0;const ranges=[];
 dataStates.forEach(s=>{if(!s.n||!total)return;const end=p+s.n/total*100;ranges.push(s.color+' '+p+'% '+end+'%');p=end});
 $('arcuvaDonut').style.background=ranges.length?'conic-gradient('+ranges.join(',')+')':'#e4e9f2';
 $('arcuvaDonutTotal').textContent=num(total);
 $('arcuvaStatusLegend').innerHTML=dataStates.map(s=>'<div class="arcuva-legend-row"><i style="background:'+s.color+'"></i><span>'+s.name+'</span><strong>'+num(s.n)+' ('+(total?Math.round(s.n/total*100):0)+'%)</strong></div>').join('');
 $('arcuvaSummaryNotice').textContent=data.playerQueryFailed?'No se pudo consultar el estado de conexión de algunas pantallas.': 'Resumen de Arcuva actualizado · Vencimientos próximos: 7 días';
}
$('arcuvaExpiringCard')?.addEventListener('click',()=>modal('Campañas próximas a vencer · 7 días',expiring().map(c=>({id:c.id,title:c.campania||'Campaña',info:(c.cliente||'Sin cliente')+' · Vence: '+asDate(c.fecha_hasta)}))));
window.addEventListener('arcuva-data-loaded',update);
window.addEventListener('arcuva-page-resumen',update);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update);else update();
})();