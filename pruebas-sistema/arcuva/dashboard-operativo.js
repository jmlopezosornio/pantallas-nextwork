// Dashboard analítico de Arcuva. Todas las consultas usan sesión y RLS.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;
if(!base)return;
const COMPANY_ID='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
const {db,escapeHtml:esc}=base,$=id=>document.getElementById(id);
const timezone='America/Argentina/Buenos_Aires';
const num=n=>Number(n||0).toLocaleString('es-AR');
const localDay=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const today=()=>localDay(new Date());
const addDay=(iso,days)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const fmtDay=d=>d.slice(8,10)+'/'+d.slice(5,7);
const screenCity=p=>{
 const x=String(p.ubicacion||p.nombre||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(x.includes('bariloche')||x.includes('cerro catedral'))return 'San Carlos de Bariloche';
 if(x.includes('san martin')||x.includes('sma'))return 'San Martín de los Andes';
 if(x.includes('neuquen'))return 'Neuquén';
 return String(p.ubicacion||'Sin ciudad registrada').trim()||'Sin ciudad registrada';
};
const status=c=>{
 if(c.eliminada)return 'eliminada';
 if(c.pausada)return 'pausada';
 const t=today();
 if(String(c.fecha_hasta||'')<t)return 'finalizada';
 if(String(c.fecha_desde||'')>t)return 'programada';
 return 'activa';
};
const overlaps=(c,from,to)=>String(c.fecha_desde||'')<=to&&String(c.fecha_hasta||'')>=from;
const elText=(id,text)=>{const e=$(id);if(e)e.textContent=text;};
let page=0,request=0,started=false;
let lastKey='',lastRaw=null;
const pageSize=7;
function setOptions(id,items,all){
 const e=$(id);if(!e)return;
 const chosen=e.value;
 e.replaceChildren(new Option(all,''));
 items.forEach(item=>e.add(new Option(item.label,item.value)));
 if([...e.options].some(o=>o.value===chosen))e.value=chosen;
}
function init(){
 if(started||!$('nwDashCity'))return;
 started=true;
 const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),1,12);
 $('nwDashFrom').value=localDay(first);
 $('nwDashTo').value=today();
 ['nwDashFrom','nwDashTo','nwDashCity','nwDashClient','nwDashCampaign'].forEach(id=>$(id).addEventListener('change',()=>{page=0;refresh();}));
 $('nwDashRefresh').addEventListener('click',()=>refresh(true));
}
function donut(campaigns){
 const keys=['activa','pausada','finalizada','programada'],labels=['Activas','Pausadas','Finalizadas','Programadas'],colors=['#41b65a','#f0b735','#9da5b1','#59aaf0'];
 const counts=keys.map(k=>campaigns.filter(c=>status(c)===k).length);
 const total=counts.reduce((a,b)=>a+b,0),root=$('nwStatusChart');if(!root)return;
 if(!total){root.innerHTML='<div class="nw-chart-empty">No hay campañas en este período.</div>';return;}
 let angle=0;const sections=counts.map((n,i)=>{
 const prev=angle;angle+=n/total*100;return colors[i]+' '+prev+'% '+angle+'%';
 });
 const legend=labels.map((label,i)=>'<div class="nw-donut-item"><i style="background:'+colors[i]+'"></i><span>'+label+'</span><strong>'+counts[i]+' ('+Math.round(counts[i]/total*100)+'%)</strong></div>').join('');
 root.innerHTML='<div class="nw-donut-wrap"><div class="nw-donut" style="background:conic-gradient('+sections.join(',')+')"><div><strong>'+total+'</strong><small>campañas</small></div></div><div class="nw-donut-legend">'+legend+'</div></div>';
}
function barChart(id,items,maxItems){
 const root=$(id);if(!root)return;
 const data=items.slice(0,maxItems),max=Math.max(1,...data.map(x=>x.count));
 if(!data.length||data.every(x=>x.count===0)){
 root.innerHTML='<div class="nw-chart-empty">Todavía no hay salidas registradas para estos filtros.</div>';return;
 }
 root.innerHTML='<div class="nw-bar-list">'+data.map(x=>'<div class="nw-bar-row"><span title="'+esc(x.name)+'">'+esc(x.name)+'</span><div class="nw-bar-track"><i style="width:'+(x.count/max*100).toFixed(1)+'%"></i></div><strong>'+num(x.count)+'</strong></div>').join('')+'</div>';
}
function dailyChart(records,from,to){
 const root=$('nwDailyChart');if(!root)return;
 if(!records.length){root.innerHTML='<div class="nw-chart-empty">Sin reproducciones registradas en el período.</div>';return;}
 const totalDays=Math.min(366,Math.round((new Date(to+'T12:00:00Z')-new Date(from+'T12:00:00Z'))/86400000)+1);
 const bins=Math.min(totalDays,31),all={};
 records.forEach(r=>{const day=localDay(new Date(r.fecha_hora));all[day]=(all[day]||0)+1;});
 const dateList=Array.from({length:totalDays},(_,i)=>addDay(from,i));
 const data=Array.from({length:bins},(_,i)=>{
 const a=Math.floor(i*dateList.length/bins),b=Math.floor((i+1)*dateList.length/bins);
 return {label:fmtDay(dateList[a]),count:dateList.slice(a,Math.max(a+1,b)).reduce((v,d)=>v+(all[d]||0),0)};
 });
 const width=600,height=190,pad=23,high=Math.max(1,...data.map(d=>d.count));
 const xy=data.map((d,i)=>({x:pad+i*(width-2*pad)/Math.max(1,bins-1),y:height-pad-(d.count/high)*(height-2*pad),count:d.count}));
 const line=xy.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
 const fill=line+' L'+xy[xy.length-1].x+' '+(height-pad)+' L'+pad+' '+(height-pad)+' Z';
 const lines=[0,1,2,3,4].map(j=>{const y=pad+j*(height-2*pad)/4;return '<line x1="'+pad+'" y1="'+y+'" x2="'+(width-pad)+'" y2="'+y+'" stroke="#e5edf6"/>';}).join('');
 root.innerHTML='<div class="nw-line-chart"><svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Evolución de las salidas registradas"><defs><linearGradient id="nwAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#448ded" stop-opacity=".30"/><stop offset="1" stop-color="#448ded" stop-opacity=".02"/></linearGradient></defs>'+lines+'<path d="'+fill+'" fill="url(#nwAreaGradient)"/><path d="'+line+'" fill="none" stroke="#227add" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+xy.map((p,i)=>i%Math.max(1,Math.ceil(xy.length/12))===0?'<circle cx="'+p.x+'" cy="'+p.y+'" r="3" fill="#fff" stroke="#227add" stroke-width="2"><title>'+data[i].label+': '+num(data[i].count)+' salidas</title></circle>':'').join('')+'</svg><div class="nw-chart-axis"><span>'+fmtDay(from)+'</span><span>'+fmtDay(to)+'</span></div></div>';
}
function summaryTable(elements){
 const target=$('nwElementsTable'),pager=$('nwElementsPager');if(!target||!pager)return;
 if(!elements.length){target.innerHTML='<div class="nw-chart-empty">No hay elementos en esta selección.</div>';pager.innerHTML='';return;}
 const pages=Math.ceil(elements.length/pageSize);page=Math.max(0,Math.min(page,pages-1));
 const html=elements.slice(page*pageSize,(page+1)*pageSize).map(e=>'<tr><td>'+esc(e.nombre)+'</td><td>'+esc(screenCity(e))+'</td><td>'+num(e.activeCount)+'</td><td>'+(e.playDays?(e.plays/e.playDays).toLocaleString('es-AR',{maximumFractionDigits:1}):'—')+'</td></tr>').join('');
 target.innerHTML='<table class="nw-elements-table"><thead><tr><th>Elemento</th><th>Ciudad</th><th>Campañas activas</th><th>Promedio diario*</th></tr></thead><tbody>'+html+'</tbody></table>';
 pager.innerHTML=pages>1?'<button type="button" id="nwPrevPage" '+(page===0?'disabled':'')+'>Anterior</button><span>Página '+(page+1)+' de '+pages+'</span><button type="button" id="nwNextPage" '+(page===pages-1?'disabled':'')+'>Siguiente</button>':'';
 $('nwPrevPage')?.addEventListener('click',()=>{page--;summaryTable(elements);});
 $('nwNextPage')?.addEventListener('click',()=>{page++;summaryTable(elements);});
}
async function getPlayers(ids){
 if(!ids.length)return {data:[]};
 return db.from('players').select('pantalla_id,estado,ultima_conexion,vnnox_online_status').in('pantalla_id',ids);
}
async function getPlays(ids,from,to,selectedCampaignIds){
 if(!ids.length||(selectedCampaignIds&&selectedCampaignIds.length===0))return {data:[],truncated:false};
 const fromStamp=from+'T00:00:00-03:00',until=addDay(to,1)+'T00:00:00-03:00';
 const limit=1000,cap=30000;let out=[];
 while(out.length<cap){
   let query=db.from('reproducciones').select('fecha_hora,pantalla_id,campania_id').in('pantalla_id',ids)
     .gte('fecha_hora',fromStamp).lt('fecha_hora',until).order('fecha_hora',{ascending:true}).range(out.length,out.length+limit-1);
   if(selectedCampaignIds)query=query.in('campania_id',selectedCampaignIds);
   const {data,error}=await query;
   if(error)return {error};
   out=out.concat(data||[]);
   if(!data||data.length<limit)return {data:out,truncated:false};
 }
 return {data:out,truncated:true};
}
async function refresh(force=false){
 init();
 if(!base.getProfile()||!$('nwKpiScreens'))return;
 const id=++request,model=base.getModel(),screens=model.screens.filter(p=>p.empresa_id===COMPANY_ID);
 const cities=[...new Set(screens.map(screenCity))].sort((a,b)=>a.localeCompare(b,'es'));
 setOptions('nwDashCity',cities.map(c=>({label:c,value:c})),'Todas las ciudades');
 const city=$('nwDashCity').value;
 const cityScreens=screens.filter(p=>!city||screenCity(p)===city),screenIds=new Set(cityScreens.map(s=>s.id));
 const cityCampaigns=model.campaigns.filter(c=>!c.eliminada&&(c.pantallaIds||[]).some(id=>screenIds.has(id)));
 const clients=[...new Set(cityCampaigns.map(c=>c.cliente).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 setOptions('nwDashClient',clients.map(c=>({label:c,value:c})),'Todos');
 const client=$('nwDashClient').value;
 const clientCampaigns=cityCampaigns.filter(c=>!client||c.cliente===client);
 setOptions('nwDashCampaign',clientCampaigns.map(c=>({label:c.campania,value:c.id})).sort((a,b)=>a.label.localeCompare(b.label,'es')),'Todas');
 const selectedCampaign=$('nwDashCampaign').value;
 const from=$('nwDashFrom').value||today(),to=$('nwDashTo').value||today();
 if(from>to){elText('nwDashNotice','La fecha inicial no puede ser posterior a la final.');return;}
 const days=(new Date(to+'T12:00:00Z')-new Date(from+'T12:00:00Z'))/86400000+1;
 if(days>366){elText('nwDashNotice','Seleccioná un período de hasta 366 días para visualizar los gráficos.');return;}
 const campaignPool=clientCampaigns.filter(c=>(!selectedCampaign||c.id===selectedCampaign)&&overlaps(c,from,to));
 const filteredIds=new Set(campaignPool.map(c=>c.id));
 const filteredScreenIds=new Set(campaignPool.flatMap(c=>c.pantallaIds||[]));
 const relevantScreens=cityScreens.filter(s=>!client&&!selectedCampaign||filteredScreenIds.has(s.id));
 const ids=relevantScreens.map(s=>s.id);
 const scopedCampaigns=campaignPool.filter(c=>(c.pantallaIds||[]).some(id=>ids.includes(id)));
 elText('nwDashNotice','Actualizando indicadores y reproducciones…');
 const key=[ids.join(','),from,to,client,selectedCampaign].join('|');
 let plays,players;
 if(!force&&lastKey===key&&lastRaw){({plays,players}=lastRaw);}
 else{
   [plays,players]=await Promise.all([
     getPlays(ids,from,to,(client||selectedCampaign)?[...filteredIds]:null),
     getPlayers(ids)
   ]);
   if(id!==request||!base.getProfile())return;
   if(!plays.error&&!players.error){lastKey=key;lastRaw={plays,players};}
 }
 if(id!==request||!base.getProfile())return;
 const records=plays.data||[],byScreen=new Map(ids.map(id=>[id,[]]));
 for(const r of records){if(byScreen.has(r.pantalla_id))byScreen.get(r.pantalla_id).push(r);}
 const activeCampaigns=scopedCampaigns.filter(c=>status(c)==='activa');
 const elems=relevantScreens.map(p=>{
   const rows=byScreen.get(p.id)||[];
   return {...p,plays:rows.length,playDays:new Set(rows.map(r=>localDay(new Date(r.fecha_hora)))).size,
     activeCount:activeCampaigns.filter(c=>(c.pantallaIds||[]).includes(p.id)).length};
 });
 const ordered=elems.slice().sort((a,b)=>b.plays-a.plays||a.nombre.localeCompare(b.nombre,'es'));
 elText('nwKpiScreens',num(elems.length));elText('nwKpiCampaigns',num(scopedCampaigns.length));
 elText('nwKpiActive',num(activeCampaigns.length));
 elText('nwKpiClients',num(new Set(scopedCampaigns.map(c=>c.cliente_id||c.cliente)).size));
 elText('nwKpiPlays',plays.error?'—':plays.truncated?'≥ '+num(records.length):num(records.length));
 donut(scopedCampaigns);
 if(plays.error){
   for(const x of ['nwScreenChart','nwDailyChart','nwRankingChart','nwElementsTable'])$(x).innerHTML='<div class="nw-chart-empty">No se pudieron consultar las reproducciones. Revisá los permisos de lectura.</div>';
   $('nwElementsPager').innerHTML='';
 }else{
   barChart('nwScreenChart',ordered.map(x=>({name:x.nombre,count:x.plays})),5);
   dailyChart(records,from,to);
   summaryTable(elems.slice().sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')));
   barChart('nwRankingChart',ordered.map(x=>({name:x.nombre,count:x.plays})),8);
 }
 let online=0,offline=0;
 if(players.error){elText('nwKpiOnline','—');elText('nwKpiOffline','—');}
 else{
   const now=Date.now();
   for(const s of relevantScreens){
     const list=(players.data||[]).filter(p=>p.pantalla_id===s.id);
     const recent=list.some(p=>p.ultima_conexion&&now-new Date(p.ultima_conexion).getTime()<=600000&&now>=new Date(p.ultima_conexion).getTime()&&String(p.estado||'').toLowerCase()==='online');
     if(recent)online++;else offline++;
   }
   elText('nwKpiOnline',num(online));elText('nwKpiOffline',num(offline));
 }
 const warnings=[];
 if(plays.error)warnings.push('No se pudieron leer las salidas registradas.');
 else if(plays.truncated)warnings.push('Hay más de '+num(records.length)+' registros. La visualización es parcial; ampliá el módulo de agregación para obtener totales exactos.');
 else if(!records.length)warnings.push('Sin salidas registradas en el período seleccionado.');
 if(players.error)warnings.push('No se pudo consultar el estado de conexión.');
 elText('nwDashNotice',warnings.length?warnings.join(' '):'Información actualizada · Promedio diario calculado solo sobre días con reproducciones registradas.');
}
window.addEventListener('arcuva-data-loaded',()=>refresh(true));
window.addEventListener('arcuva-page-resumen',()=>refresh());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&base.getProfile())refresh(true);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
