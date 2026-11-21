/* Arcuva · Dashboard Gerencial. Entorno de pruebas.
   Ocupación = promedio de campañas activas por día, no altas de ese mes.
   Salidas = registros reales; nunca estimaciones. */
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;if(!base)return;
const db=base.db,$=id=>document.getElementById(id),esc=base.escapeHtml;
const COMPANY='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const short=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const format=n=>Number(n||0).toLocaleString('es-AR');
const iso=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const now=()=>iso(new Date());
const dateAdd=(date,days)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
const dayRange=(year,month)=>{const first=new Date(Date.UTC(year,month,1));return [first.toISOString().slice(0,10),new Date(Date.UTC(year,month+1,0)).toISOString().slice(0,10)]};
const simpleDate=s=>String(s||'').slice(0,10);
let model={screens:[],campaigns:[],clients:[],playerRows:[]},request=0,cachedKey='',cachedCounts=null;
const role=()=>{const p=base.getProfile();return !!p&&p.rol==='gerencia'&&p.es_superadmin!==true&&p.empresa_id===COMPANY};
function status(c){
 if(c.eliminada)return 'eliminada';
 if(c.pausada||c.estado==='pausada')return 'pausada';
 const from=simpleDate(c.fecha_desde),to=simpleDate(c.fecha_hasta),today=now();
 if(!from||!to)return 'otros';
 if(to<today)return 'finalizada';
 if(from>today)return 'programada';
 return 'activa';
}
function setOptions(id,values,label){
 const el=$(id);if(!el)return;
 const keep=el.value;el.replaceChildren(new Option(label,''));
 values.forEach(x=>el.add(new Option(x.label,x.value)));
 if([...el.options].some(x=>x.value===keep))el.value=keep;
}
function initFilters(){
 const y=$('gerYear');if(!y)return;
 const old=y.value,years=new Set([new Date().getFullYear()]);
 model.campaigns.forEach(c=>{const a=Number(simpleDate(c.fecha_desde).slice(0,4)),b=Number(simpleDate(c.fecha_hasta).slice(0,4));if(a>=2020&&a<=2100)years.add(a);if(b>=2020&&b<=2100)years.add(b);});
 y.replaceChildren(...[...years].sort((a,b)=>b-a).map(n=>new Option(String(n),String(n))));
 y.value=[...y.options].some(o=>o.value===old)?old:String(new Date().getFullYear());
 setOptions('gerScreen',model.screens.map(s=>({value:s.id,label:s.nombre})).sort((a,b)=>a.label.localeCompare(b.label,'es')),'Todas');
 setOptions('gerCity',[...new Set(model.screens.map(s=>String(s.ubicacion||'').trim()).filter(Boolean))].sort().map(x=>({value:x,label:x})),'Todas');
 setOptions('gerClient',[...new Set(model.campaigns.map(c=>String(c.cliente||'').trim()).filter(Boolean))].sort().map(x=>({value:x,label:x})),'Todos');
}
function selected(){
 const screenId=$('gerScreen')?.value||'',city=$('gerCity')?.value||'',client=$('gerClient')?.value||'';
 const screens=model.screens.filter(s=>(!screenId||s.id===screenId)&&(!city||String(s.ubicacion||'')===city));
 const ids=new Set(screens.map(s=>s.id));
 const campaigns=model.campaigns.filter(c=>!c.eliminada&&(!client||c.cliente===client)&&
 (c.pantallaIds||[]).some(id=>ids.has(id)));
 return {screens,campaigns,ids,year:Number($('gerYear')?.value||new Date().getFullYear()),client};
}
function online(screen){
 if(model.playerQueryFailed)return null;
 const rows=(model.playerRows||[]).filter(x=>x.pantalla_id===screen.id);
 if(!rows.length)return false;
 const t=rows.find(x=>x.tipo==='novastar_taurus');
 if(t){const d=Date.parse(t.actualizado_en||'');return !!t.vnnox_player_id&&Number.isFinite(d)&&Date.now()-d<=300000&&Date.now()>=d&&Number(t.vnnox_online_status)===1;}
 return rows.some(x=>{const d=Date.parse(x.ultima_conexion||'');return Number.isFinite(d)&&Date.now()>=d&&Date.now()-d<=600000&&String(x.estado||'').toLowerCase()==='online';});
}
function occupancy(campaigns,year){
 const cutoff=now(),counts=[];
 for(let month=0;month<12;month++){
  const [start,end]=dayRange(year,month);
  const effectiveEnd=end>cutoff?cutoff:end;
  const days=effectiveEnd<start?0:Math.round((Date.parse(effectiveEnd+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1;
  let campaignDays=0,unique=0;
  if(days){
   for(const c of campaigns){
    if(c.pausada||c.estado==='pausada')continue; // no historical pause log available
    const a=simpleDate(c.fecha_desde),b=simpleDate(c.fecha_hasta);
    if(!a||!b||b<start||a>effectiveEnd)continue;
    unique++;
    const left=a>start?a:start,right=b<effectiveEnd?b:effectiveEnd;
    campaignDays+=Math.max(0,Math.round((Date.parse(right+'T00:00:00Z')-Date.parse(left+'T00:00:00Z'))/86400000)+1);
   }
  }
  counts.push({month,avg:days?campaignDays/days:0,unique,days});
 }
 return counts;
}
function renderOccupancy(campaigns,year){
 const counts=occupancy(campaigns,year),complete=counts.filter(c=>c.days>0),max=Math.max(1,...counts.map(c=>c.avg));
 const bars=$('gerOccupancyBars');if(!bars)return;
 bars.innerHTML=counts.map(c=>'<button type="button" class="gerencia-month" data-month="'+c.month+'" title="'+esc(months[c.month]+': '+format(c.unique)+' campañas durante el mes')+'"><strong>'+(c.days?c.avg.toFixed(1).replace('.',','):'—')+'</strong><span class="gerencia-monthbar" style="height:'+Math.max(2,Math.round(c.avg/max*165))+'px"></span><small>'+short[c.month]+'</small></button>').join('');
 const sorted=[...complete].sort((a,b)=>a.avg-b.avg);
 const low=sorted[0],high=sorted[sorted.length-1];
 $('gerHighestMonth').textContent=high?months[high.month]:'Sin datos';
 $('gerHighestValue').textContent=high?high.avg.toFixed(1).replace('.',',')+' campañas por día':'—';
 $('gerLowestMonth').textContent=low?months[low.month]:'Sin datos';
 $('gerLowestValue').textContent=low?low.avg.toFixed(1).replace('.',',')+' campañas por día':'—';
 bars.querySelectorAll('[data-month]').forEach(btn=>btn.addEventListener('click',()=>{
  const c=counts[Number(btn.dataset.month)];
  $('gerOccupancyDetail').textContent=months[c.month]+': '+format(c.unique)+' campañas con vigencia y promedio diario de '+c.avg.toFixed(1).replace('.',',')+' (días evaluados: '+c.days+').';
 }));
}
function renderDistribution(campaigns){
 const states=[['activa','Activas','#235be7'],['programada','Programadas','#4bd2e8'],['pausada','Pausadas','#ffb63f'],['finalizada','Finalizadas','#b9c4d8'],['otros','Otros','#7d66a0']];
 const series=states.map(([id,label,color])=>({id,label,color,n:campaigns.filter(c=>status(c)===id).length}));
 const total=series.reduce((sum,s)=>sum+s.n,0);
 $('gerDonutTotal').textContent=format(total);
 let pos=0;const stops=[];
 series.forEach(s=>{if(!s.n||!total)return;const end=pos+s.n/total*100;stops.push(s.color+' '+pos+'% '+end+'%');pos=end;});
 $('gerDonut').style.background=stops.length?'conic-gradient('+stops.join(',')+')':'#e3eaf4';
 $('gerLegend').innerHTML=series.filter(s=>s.n).map(s=>'<div class="gerencia-legend-row"><i style="background:'+s.color+'"></i><span>'+s.label+'</span><strong>'+format(s.n)+'</strong></div>').join('')||'Sin campañas';
}
function renderTopClients(campaigns){
 const map=new Map();
 campaigns.filter(c=>status(c)==='activa').forEach(c=>{if(c.cliente)map.set(c.cliente,(map.get(c.cliente)||0)+1)});
 const top=[...map].sort((a,b)=>b[1]-a[1]).slice(0,5);
 $('gerClientsTop').innerHTML=top.map(([name,count],i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(name)+'</td><td>'+format(count)+'</td></tr>').join('')||'<tr><td colspan="3">Sin campañas vigentes</td></tr>';
}
function renderAlerts(screens,campaigns){
 const active=campaigns.filter(c=>status(c)==='activa');
 const expiring=active.filter(c=>simpleDate(c.fecha_hasta)<=dateAdd(now(),7));
 const offline=screens.filter(s=>online(s)===false);
 $('gerAlerts').innerHTML='<div class="gerencia-alert"><span>▢</span><div><strong>'+format(expiring.length)+' campañas próximas a vencer</strong><small>Finalizan dentro de los próximos 7 días.</small></div></div>'+
 '<div class="gerencia-alert offline"><span>▣</span><div><strong>'+(model.playerQueryFailed?'Sin datos':format(offline.length))+' pantallas fuera de línea</strong><small>'+(model.playerQueryFailed?'No se pudo consultar el monitoreo.':'Estado del último monitoreo.')+'</small></div></div>'+
 '<div class="gerencia-alert no-play"><span>▷</span><div><strong>Actividad publicitaria</strong><small>Consultar reproducciones efectivamente registradas.</small></div></div>';
}
function drawEvolution(values,labels){
 const node=$('gerEvolution');if(!node)return;
 if(!values){node.textContent='No se pudo verificar la evolución de reproducciones.';return;}
 const max=Math.max(1,...values),w=500,h=235,p=27,chartH=170;
 const x=i=>p+i*(w-2*p)/Math.max(1,values.length-1);
 const y=v=>p+chartH-(v/max)*chartH;
 const path=values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
 const area=path+' L '+x(values.length-1)+' '+(p+chartH)+' L '+p+' '+(p+chartH)+' Z';
 const ticks=[0,1,2,3,4].map(i=>{const val=max*i/4,cy=y(val);return '<line x1="'+p+'" x2="'+(w-p)+'" y1="'+cy+'" y2="'+cy+'" stroke="#e5ebf4"/><text x="0" y="'+(cy+4)+'" font-size="11" fill="#7890a7">'+format(Math.round(val))+'</text>';}).join('');
 node.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Evolución por períodos de cinco días de las salidas registradas"><defs><linearGradient id="gerFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2380fa" stop-opacity=".32"/><stop offset="100%" stop-color="#2380fa" stop-opacity=".02"/></linearGradient></defs>'+ticks+'<path d="'+area+'" fill="url(#gerFill)"/><path d="'+path+'" stroke="#1268ed" stroke-width="3" fill="none"/>'+values.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="4" fill="white" stroke="#1268ed" stroke-width="2"/>').join('')+labels.map((l,i)=>'<text x="'+x(i)+'" y="220" text-anchor="middle" font-size="10" fill="#49627d">'+esc(l)+'</text>').join('')+'</svg>';
}
async function countReal(screenIds,start,end){
 if(!screenIds.length)return 0;
 const {count,error}=await db.from('reproducciones').select('id',{count:'exact',head:true})
 .in('pantalla_id',screenIds).gte('fecha_hora',start+'T00:00:00-03:00').lt('fecha_hora',end+'T00:00:00-03:00');
 if(error)throw error;
 return count;
}
async function fetchCounts(screens){
 // Only dates and screens count; client filters require an additional client-specific query.
 const allowed=new Set(screens.map(s=>s.id));
 const key=[...allowed].sort().join('|')+'|'+now()+'|'+($('gerClient')?.value||'');
 if(key===cachedKey&&cachedCounts)return cachedCounts;
 const start=dateAdd(now(),-29),finish=dateAdd(now(),1),screenIds=[...allowed];
 const client=$('gerClient')?.value||'';
 let campaignIds=null;
 if(client)campaignIds=model.campaigns.filter(c=>c.cliente===client).map(c=>c.id);
 const countQuery=async(from,to,ids)=>{
  if(!screenIds.length||ids&&ids.length===0)return 0;
  let q=db.from('reproducciones').select('id',{count:'exact',head:true}).in('pantalla_id',screenIds)
   .gte('fecha_hora',from+'T00:00:00-03:00').lt('fecha_hora',to+'T00:00:00-03:00');
  if(ids)q=q.in('campania_id',ids);
  const {count,error}=await q;
  if(error)throw error;
  return count||0;
 };
 const ranges=[];for(let day=0;day<30;day+=5)ranges.push([dateAdd(start,day),dateAdd(start,Math.min(30,day+5))]);
 // Counts in five-day buckets avoid materializing massive playback event arrays.
 const values=[];for(const [a,b] of ranges)values.push(await countQuery(a,b,campaignIds));
 const perScreen=[];for(const s of screens)perScreen.push({id:s.id,name:s.nombre,count:await db.from('reproducciones').select('id',{count:'exact',head:true}).eq('pantalla_id',s.id).gte('fecha_hora',start+'T00:00:00-03:00').lt('fecha_hora',finish+'T00:00:00-03:00').then(({count,error})=>{if(error)throw error;return count||0})});
 const result={values,labels:ranges.map(([d])=>d.slice(8,10)+'/'+d.slice(5,7)),total:values.reduce((a,b)=>a+b,0),perScreen,clientFiltered:!!client};
 cachedKey=key;cachedCounts=result;return result;
}
async function refreshCounts(screens,token){
 $('gerPlays').textContent='…';$('gerScreensTop').innerHTML='<tr><td colspan="3">Consultando reproducciones reales…</td></tr>';
 try{
  const data=await fetchCounts(screens);
  if(token!==request||!role())return;
  $('gerPlays').textContent=format(data.total);
  drawEvolution(data.values,data.labels);
  const sorted=[...data.perScreen].sort((a,b)=>b.count-a.count).slice(0,5);
  $('gerScreensTop').innerHTML=sorted.map((s,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(s.name)+'</td><td>'+format(s.count)+'</td></tr>').join('')||'<tr><td colspan="3">Sin pantallas seleccionadas</td></tr>';
  $('gerStatus').textContent=(data.clientFiltered?'Las cifras de salidas están filtradas por cliente; el ranking de pantallas refleja todas las reproducciones. ':'')+'Ocupación: cálculo por vigencias actuales; no reconstruye pausas históricas. Salidas: eventos registrados en los últimos 30 días.';
 }catch(e){
  if(token!==request)return;
  $('gerPlays').textContent='Sin datos';$('gerScreensTop').innerHTML='<tr><td colspan="3">No se pudo verificar la actividad</td></tr>';
  drawEvolution(null);$('gerStatus').textContent='No se pudo verificar la actividad: '+(e.message||e);
 }
}
function update(){
 if(!role())return;
 const m=base.getModel();if(!m||!$('page-gerencia'))return;
 model={...m,screens:(m.screens||[]).filter(s=>s.empresa_id===COMPANY),campaigns:(m.campaigns||[]).filter(c=>!c.eliminada)};
 if(!$('gerYear')?.options?.length)initFilters();
 const {screens,campaigns,year}=selected();
 const onlineCount=screens.filter(s=>online(s)===true).length;
 const percent=screens.length?Math.round(100*onlineCount/screens.length):0;
 $('gerOnline').textContent=m.playerQueryFailed?'—':onlineCount+'/'+screens.length;
 $('gerOnlinePercent').textContent=m.playerQueryFailed?'Sin datos de conexión':percent+'% operativas';
 $('gerOnlineBar').style.width=percent+'%';
 const active=campaigns.filter(c=>status(c)==='activa');
 $('gerActive').textContent=format(active.length);
 $('gerExpiring').textContent=format(active.filter(c=>simpleDate(c.fecha_hasta)<=dateAdd(now(),7)).length);
 $('gerClients').textContent=format(new Set(active.map(c=>c.cliente).filter(Boolean)).size);
 renderOccupancy(campaigns,year);renderDistribution(campaigns);renderTopClients(campaigns);renderAlerts(screens,campaigns);
 const token=++request;void refreshCounts(screens,token);
}
function adaptRole(){
 const manager=role();
 $('page-gerencia')?.classList.toggle('hidden',!manager);
 $('page-resumen')?.classList.toggle('hidden',manager);
 if(manager){
  document.querySelector('.nav[data-page="ordenes"]')?.classList.add('hidden');
  document.querySelector('.nav[data-page="usuarios"]')?.classList.add('hidden');
  $('pageTitle').textContent='Dashboard Gerencial';
 }else{
  document.querySelector('.nav[data-page="ordenes"]')?.classList.remove('hidden');
 }
}
function onData(){adaptRole();if(role()){initFilters();update();}}
window.addEventListener('arcuva-data-loaded',onData);
window.addEventListener('arcuva-page-resumen',()=>{adaptRole();if(role())update()});
['gerYear','gerScreen','gerCity','gerClient'].forEach(id=>$(id)?.addEventListener('change',update));
window.addEventListener('arcuva-page-campanias',()=>{if(role())$('page-gerencia')?.classList.add('hidden')});
window.addEventListener('arcuva-page-reportes',()=>{if(role())$('page-gerencia')?.classList.add('hidden')});
['pantallas','clientes'].forEach(page=>{
 document.querySelector('.nav[data-page="'+page+'"]')?.addEventListener('click',()=>{if(role())$('page-gerencia')?.classList.add('hidden')});
});
document.querySelector('.nav[data-page="resumen"]')?.addEventListener('click',()=>{if(role()){$('page-gerencia')?.classList.remove('hidden');$('page-resumen')?.classList.add('hidden')}});
})();