// Dashboard operativo Arcuva — lecturas con sesión RLS y alcance limitado a sus pantallas.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;if(!base)return;
const COMPANY_ID='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
const {db,escapeHtml:esc,dates}=base;
const $=id=>document.getElementById(id);
let refreshSeq=0,interval;
const fmtDate=value=>value?new Date(value).toLocaleString('es-AR'):'Sin registro';
const parseDay=value=>{const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return null;const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);return Number.isFinite(d.getTime())?d:null;};
const daysTo=value=>{const e=parseDay(value),n=new Date();if(!e)return null;const today=new Date(n.getFullYear(),n.getMonth(),n.getDate(),12);return Math.round((e-today)/86400000);};
const state=c=>{const t=String(c.estado||'').toLowerCase();const d=daysTo(c.fecha_hasta);if(c.pausada||t.includes('pausad'))return 'Pausada';if(t.includes('finaliz')||(d!==null&&d<0))return 'Finalizada';if(t.includes('program')||(parseDay(c.fecha_desde)&&parseDay(c.fecha_desde)>new Date()))return 'Programada';return 'Activa';};
function set(id,v){const el=$(id);if(el)el.textContent=v;}
function renderCampaigns(campaigns){
 const counts={Activa:0,Pausada:0,Finalizada:0,Programada:0};
 campaigns.filter(c=>!c.eliminada).forEach(c=>counts[state(c)]++);
 set('dashActive',counts.Activa);set('dashPaused',counts.Pausada);set('dashFinished',counts.Finalizada);
 const alerts=campaigns.map(c=>({c,days:daysTo(c.fecha_hasta),status:state(c)}))
  .filter(x=>x.days!==null&&x.status==='Activa'&&x.days>=0&&x.days<=10)
  .sort((a,b)=>a.days-b.days);
 set('dashExpiring',alerts.length);
 const root=$('dashAlerts');if(!root)return;
 root.innerHTML=alerts.length?alerts.map(({c,days})=>'<div class="dash-list-row"><div><strong>'+esc(c.campania||'Campaña')+'</strong><div class="tiny">'+esc(c.cliente||'Sin cliente')+' · vence '+dates(c.fecha_hasta)+'</div></div><span class="dash-pill '+(days<=3?'dash-warn':'')+'">'+(days===0?'Vence hoy':days===1?'Falta 1 día':'Faltan '+days+' días')+'</span></div>').join(''):'<div class="empty">No hay campañas activas que venzan en los próximos 10 días.</div>';
}
let balancePage=0,expandedBalanceId='';
const BALANCE_PAGE_SIZE=6;
function renderBalance(screens,campaigns){
 const list=$('dashBalanceList'),advice=$('dashBalanceAdvice');if(!list||!advice)return;
 const active=campaigns.filter(c=>!c.eliminada&&state(c)==='Activa');
 const loads=screens.map(screen=>{
   const assigned=active.filter(c=>(c.pantallaIds||[]).includes(screen.id));
   return {...screen,count:assigned.length,weight:assigned.reduce((n,c)=>n+(Number(c.porcentaje)||100),0),campaigns:assigned};
 }).sort((a,b)=>b.weight-a.weight||b.count-a.count||String(a.nombre).localeCompare(String(b.nombre),'es'));
 const uniqueCount=new Set(active.map(c=>c.id)).size;
 set('dashBalanceTotal',uniqueCount+' campañas · '+screens.length+' elementos');
 if(!screens.length){list.innerHTML='<div class="empty">No hay elementos habilitados.</div>';advice.textContent='Sin elementos para comparar.';return;}
 const peak=loads[0],lowest=loads[loads.length-1];
 if(loads.length===1)advice.textContent='Un elemento registrado. Incorporá otros para comparar la distribución.';
 else if(peak.weight===lowest.weight)advice.textContent='Distribución equilibrada: todos los elementos registran el mismo peso publicitario.';
 else advice.innerHTML='Mayor carga: <strong>'+esc(peak.nombre)+'</strong> ('+peak.count+' campañas). Menor carga: <strong>'+esc(lowest.nombre)+'</strong> ('+lowest.count+' campañas). Revisá compatibilidad antes de mover contenido.';
 const maxWeight=Math.max(100,...loads.map(x=>x.weight));
 const totalPages=Math.ceil(loads.length/BALANCE_PAGE_SIZE);
 balancePage=Math.max(0,Math.min(balancePage,totalPages-1));
 const slice=loads.slice(balancePage*BALANCE_PAGE_SIZE,(balancePage+1)*BALANCE_PAGE_SIZE);
 const cards=slice.map(x=>{
   const expanded=expandedBalanceId===x.id;
   const details=x.campaigns.length
      ?x.campaigns.map(c=>'<div class="balance-campaign"><span>'+esc(c.campania||'Campaña')+'</span><strong>'+esc(c.porcentaje)+' puntos</strong></div>').join('')
      :'<div class="tiny">Sin campañas activas asignadas.</div>';
   return '<article class="balance-card"><button type="button" class="balance-card-main" data-balance-toggle="'+esc(x.id)+'" aria-expanded="'+expanded+'"><span class="balance-card-title">'+esc(x.nombre)+'</span><span class="balance-card-num">'+x.count+' <small>campañas</small></span><span class="balance-mini-track"><span style="width:'+(x.weight/maxWeight*100).toFixed(1)+'%"></span></span><span class="balance-card-foot"><span>'+x.weight+' puntos de prioridad</span><span>'+(expanded?'Ocultar detalle −':'Ver detalle +')+'</span></span></button>'+(expanded?'<div class="balance-card-details">'+details+'</div>':'')+'</article>';
 }).join('');
 const navigation=totalPages>1?'<div class="balance-pagination"><button type="button" data-balance-nav="prev" '+(balancePage===0?'disabled':'')+'>Anterior</button><span>'+(balancePage+1)+' de '+totalPages+'</span><button type="button" data-balance-nav="next" '+(balancePage===totalPages-1?'disabled':'')+'>Siguiente</button></div>':'';
 list.innerHTML='<div class="balance-card-grid">'+cards+'</div>'+navigation;
 list.querySelectorAll('[data-balance-toggle]').forEach(b=>b.addEventListener('click',()=>{
   expandedBalanceId=expandedBalanceId===b.dataset.balanceToggle?'':b.dataset.balanceToggle;
   renderBalance(screens,campaigns);
 }));
 list.querySelectorAll('[data-balance-nav]').forEach(b=>b.addEventListener('click',()=>{
   balancePage+=b.dataset.balanceNav==='next'?1:-1;
   expandedBalanceId='';
   renderBalance(screens,campaigns);
 }));
}
async function refresh(){
 const profile=base.getProfile();if(!profile)return;
 const seq=++refreshSeq;
 const screens=base.getModel().screens.filter(s=>s.empresa_id===COMPANY_ID);
 renderCampaigns(base.getModel().campaigns);
 renderBalance(screens,base.getModel().campaigns);
 set('dashScreenCount',screens.length);
 if(!screens.length){set('dashConnected','0');set('dashDisconnected','0');set('dashUnknown','0');$('dashScreenList').innerHTML='<div class="empty">No hay pantallas autorizadas para esta empresa.</div>';return;}
 const ids=screens.map(s=>s.id);
 const {data,error}=await db.from('players').select('id,pantalla_id,tipo,estado,ultima_conexion,ultima_sincronizacion,version_player,vnnox_version,vnnox_online_status').in('pantalla_id',ids);
 if(seq!==refreshSeq||!base.getProfile())return;
 if(error){$('dashScreenList').innerHTML='<div class="empty">No se pudieron consultar los reproductores: '+esc(error.message)+'</div>';['dashConnected','dashDisconnected','dashUnknown'].forEach(id=>set(id,'—'));return;}
 const byScreen=new Map();(data||[]).filter(p=>ids.includes(p.pantalla_id)).forEach(p=>{const a=byScreen.get(p.pantalla_id)||[];a.push(p);byScreen.set(p.pantalla_id,a);});
 // Sin heartbeat reciente se muestra 'sin confirmación', no se asume conexión.
 const now=Date.now();const onlineMs=10*60*1000;
 let connected=0,disconnected=0,unknown=0;
 const rows=screens.map(s=>{
 const ps=byScreen.get(s.id)||[];
 const fresh=ps.filter(p=>p.ultima_conexion&&now-new Date(p.ultima_conexion).getTime()<=onlineMs&&now>=new Date(p.ultima_conexion).getTime());
 let status='Sin confirmación reciente',kind='unknown';
 if(fresh.some(p=>String(p.estado||'').toLowerCase()==='online')){status='Conexión reciente';kind='on';connected++;}
 else if(fresh.length){status='Estado sin conexión';kind='off';disconnected++;}
 else unknown++;
 const recent=ps.map(p=>p.ultima_conexion).filter(Boolean).sort().reverse()[0];
 const version=ps.map(p=>p.version_player||p.vnnox_version).filter(Boolean).join(', ')||'Sin dato';
 const syncing=ps.map(p=>p.ultima_sincronizacion).filter(Boolean).sort().reverse()[0];
 return '<div class="dash-screen-row"><div><strong>'+esc(s.nombre)+'</strong><div class="tiny">'+esc(s.ubicacion||'Sin ubicación')+' · Versión: '+esc(version)+'</div><div class="tiny">Última conexión: '+esc(fmtDate(recent))+' · Última sincronización: '+esc(fmtDate(syncing))+'</div></div><span class="dash-pill '+(kind==='on'?'dash-good':kind==='off'?'dash-bad':'')+'">'+status+'</span></div>';
 });
 set('dashConnected',connected);set('dashDisconnected',disconnected);set('dashUnknown',unknown);
 $('dashScreenList').innerHTML=rows.join('');
}
window.addEventListener('arcuva-data-loaded',refresh);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
interval=setInterval(()=>{if(base.getProfile())refresh();},60000);
})();
