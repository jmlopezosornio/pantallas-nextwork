// NextWork - Reportes Arcuva — portal estable.
// Reutiliza exclusivamente el modelo de campañas/pantallas autorizado al usuario.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;if(!base)return;
const $=id=>document.getElementById(id),esc=base.escapeHtml,display=base.dates;
const tenant='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
let mode='general',rows=[],countRequest=0,countsReady=false,countIssue='';
const number=n=>Number(n||0).toLocaleString('es-AR');
const iso=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||'').slice(0,10))?String(v).slice(0,10):'';
const localISO=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const current=()=>base.getModel();
const allowed=()=>base.getProfile()&& (base.getProfile().empresa_id===tenant||base.getProfile().es_superadmin===true);
const selectedText=(id,fallback)=>$(id)?.selectedOptions?.[0]?.textContent||fallback;
const matches=(c,from,to)=>(!to||iso(c.fecha_desde)<=to)&&(!from||iso(c.fecha_hasta)>=from);
function selectOptions(id,items,all){
 const e=$(id);if(!e)return;
 const keep=e.value;
 e.replaceChildren(new Option(all,''));
 items.forEach(i=>e.add(new Option(String(i.label),String(i.value))));
 if([...e.options].some(o=>o.value===keep))e.value=keep;
}
function campaignStatus(c){
 if(c.eliminada===true)return 'eliminada';
 if(c.pausada===true)return 'pausada';
 const s=String(c.estado||'').trim().toLowerCase();
 if(s==='finalizada'||(iso(c.fecha_hasta)&&iso(c.fecha_hasta)<localISO(new Date())))return 'finalizada';
 if(s==='proxima'||(iso(c.fecha_desde)&&iso(c.fecha_desde)>localISO(new Date())))return 'proxima';
 return 'activa';
}
function matchesStatus(c,selected){
 const state=campaignStatus(c);
 if(selected==='todas')return true;
 if(selected==='vigentes')return state==='activa'||state==='pausada';
 return state===selected;
}
function screensFor(c){return (c.pantallaIds||[]);}
function fill(){
 if(!allowed())return;
 const m=current();const cs=m.campaigns||[],screens=(m.screens||[]).filter(s=>s.empresa_id===tenant);
 const clients=[...new Set(cs.map(c=>c.cliente).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 selectOptions('rptCliente',clients.map(v=>({value:v,label:v})),'Todos');
 selectOptions('rptCampania',cs.map(c=>({value:c.id,label:c.campania})).sort((a,b)=>String(a.label).localeCompare(String(b.label),'es')),'Todas');
 selectOptions('rptPantalla',screens.map(s=>({value:s.id,label:s.nombre})).sort((a,b)=>String(a.label).localeCompare(String(b.label),'es')),'Todas');
}
function updateMode(next){
 mode=next==='fechas'?'fechas':'general';
 document.querySelectorAll('[data-rpt-mode]').forEach(b=>b.classList.toggle('active',b.dataset.rptMode===mode));
 document.querySelectorAll('[data-rpt-date]').forEach(el=>el.hidden=mode!=='fechas');
 render();
}
function labelPeriod(){
 if(mode==='general')return 'General';
 const from=$('rptDesde')?.value||'',to=$('rptHasta')?.value||'';
 return from&&to?display(from)+' al '+display(to):from?'Desde '+display(from):to?'Hasta '+display(to):'Entre fechas';
}
function readRows(){
 const m=current(),client=$('rptCliente')?.value||'',campaign=$('rptCampania')?.value||'',screen=$('rptPantalla')?.value||'',status=$('rptEstado')?.value||'activa';
 const from=mode==='fechas'?$('rptDesde')?.value||'':'',to=mode==='fechas'?$('rptHasta')?.value||'':'';
 if(from&&to&&from>to)return null;
 const screenMap=new Map((m.screens||[]).filter(s=>s.empresa_id===tenant).map(s=>[s.id,s.nombre]));
 return (m.campaigns||[]).filter(c=>{
 const ids=screensFor(c);
 return matchesStatus(c,status)&&(!client||c.cliente===client)&&(!campaign||c.id===campaign)&&(!screen||ids.includes(screen))&&(mode==='general'||matches(c,from,to));
 }).map(c=>({id:c.id,pantallaIds:screensFor(c).filter(id=>screenMap.has(id)),cliente:String(c.cliente||'Sin cliente'),campania:String(c.campania||''),desde:c.fecha_desde,hasta:c.fecha_hasta,pantallas:screensFor(c).map(id=>screenMap.get(id)).filter(Boolean),pct:Number(c.porcentaje)||0,plays:null}))
 .sort((a,b)=>a.cliente.localeCompare(b.cliente,'es')||a.campania.localeCompare(b.campania,'es'));
}
function reportCells(r){
 const plays=r.plays===null?'—':number(r.plays);
 return '<tr><td>'+esc(r.cliente)+'</td><td><strong>'+esc(r.campania)+'</strong></td><td class="rpt-dates">'+display(r.desde)+' – '+display(r.hasta)+'</td><td>'+esc(r.pantallas.join(', ')||'Sin pantalla')+'</td><td class="rpt-pct">'+r.pct+'%</td><td class="rpt-pct">'+plays+'</td></tr>';
}
function updateReportBody(){
 const body=$('rptBody');if(!body)return;
 body.innerHTML=rows?.length?rows.map(reportCells).join(''):'<tr><td colspan="6" class="rpt-empty">No hay campañas para los filtros seleccionados.</td></tr>';
}
async function fetchCounts(){
 const seq=++countRequest;
 countsReady=false;countIssue='';
 if(mode!=='fechas'){
   $('rptPlaysInfo').textContent='Modo General: seleccioná «Entre fechas» para obtener el número real de salidas.';
   countsReady=true;return;
 }
 const from=$('rptDesde')?.value||'',to=$('rptHasta')?.value||'',selectedScreen=$('rptPantalla')?.value||'';
 if(!from||!to){countIssue='Seleccioná ambas fechas para consultar las reproducciones.';$('rptPlaysInfo').textContent=countIssue;return;}
 if(from>to)return;
 if(!rows?.length){$('rptPlaysInfo').textContent='No hay campañas para contabilizar en este período.';countsReady=true;return;}
 $('rptPlaysInfo').textContent='Consultando las salidas reales registradas en Supabase…';
 const db=base.db;
 const toExclusive=new Date(to+'T12:00:00Z');toExclusive.setUTCDate(toExclusive.getUTCDate()+1);
 const end=toExclusive.toISOString().slice(0,10)+'T00:00:00-03:00';
 const begin=from+'T00:00:00-03:00';
 const counts=new Map();
 try{
   // Conteos exactos en el servidor: no descargamos los registros uno por uno.
   // Consultas por campaña y pantallas autorizadas a Arcuva.
   for(let i=0;i<rows.length;i+=6){
     const batch=rows.slice(i,i+6);
     const results=await Promise.all(batch.map(async r=>{
       const ids=selectedScreen?[selectedScreen]:r.pantallaIds;
       if(!ids.length)return {id:r.id,count:0};
       const {count,error}=await db.from('reproducciones')
         .select('id',{count:'exact',head:true})
         .eq('campania_id',r.id)
         .in('pantalla_id',ids)
         .gte('fecha_hora',begin).lt('fecha_hora',end);
       if(error)throw new Error(error.message);
       if(!Number.isSafeInteger(count)||count<0)throw new Error('Conteo de reproducciones no disponible.');
       return {id:r.id,count};
     }));
     if(seq!==countRequest)return;
     results.forEach(r=>counts.set(r.id,r.count));
   }
   if(seq!==countRequest)return;
   rows.forEach(r=>r.plays=counts.get(r.id)??0);
   const total=rows.reduce((sum,r)=>sum+r.plays,0);
   countsReady=true;
   $('rptPlaysInfo').textContent='Salidas registradas en el período: '+number(total)+'. Se contabilizan eventos de reproducción por campaña y pantalla; el porcentaje de participación no representa salidas realizadas.';
   updateReportBody();
 }catch(err){
   if(seq!==countRequest)return;
   countIssue='No se pudo verificar el número de reproducciones: '+String(err.message||err);
   $('rptPlaysInfo').textContent=countIssue;
   updateReportBody();
 }
}
function render(){
 if(!allowed())return;
 fill();rows=readRows();
 const body=$('rptBody');if(!body)return;
 ++countRequest;
 if(rows===null){
   body.innerHTML='<tr><td colspan="6" class="rpt-empty">La fecha Desde no puede ser posterior a Hasta.</td></tr>';
   $('rptCount').textContent='';$('rptSummary').textContent='Revisá el período seleccionado';
   $('rptPlaysInfo').textContent='Corregí las fechas para consultar salidas.';
   return;
 }
 $('rptSummary').textContent='Período: '+labelPeriod()+' · Cliente: '+selectedText('rptCliente','Todos')+' · Campaña: '+selectedText('rptCampania','Todas')+' · Pantalla: '+selectedText('rptPantalla','Todas')+' · Estado: '+selectedText('rptEstado','Activas');
 $('rptCount').textContent=rows.length+' campaña'+(rows.length===1?'':'s');
 updateReportBody();
 void fetchCounts();
}
function reset(){
 mode='general';
 $('rptDesde').value=localISO(new Date(new Date().getFullYear(),new Date().getMonth(),1));
 $('rptHasta').value=localISO(new Date());
 ['rptCliente','rptCampania','rptPantalla'].forEach(id=>{if($(id))$(id).value='';});
 $('rptEstado').value='activa';
 updateMode('general');
}
async function printReport(){
 if(!rows?.length){alert('No hay campañas para imprimir con estos filtros.');return;}
 const w=window.open('','_blank','width=1200,height=800');if(!w){alert('Habilitá las ventanas emergentes para imprimir el reporte.');return;}
 if(mode==='fechas'&&!countsReady){await fetchCounts();}
 if(mode==='fechas'&&(!countsReady||countIssue)){w.close();alert(countIssue||'No se pudo confirmar la cantidad de reproducciones. Intentá nuevamente.');return;}
 const logo=$('sidebarLogo')?.getAttribute('src')||'';
 const head=logo?'<img src="'+esc(logo)+'" alt="Arcuva">':'<strong>Arcuva</strong>';
 const filters=['Período: '+labelPeriod(),'Cliente: '+selectedText('rptCliente','Todos'),'Campaña: '+selectedText('rptCampania','Todas'),'Pantalla: '+selectedText('rptPantalla','Todas'),'Estado: '+selectedText('rptEstado','Activas')];
 const trs=rows.map(r=>'<tr><td>'+esc(r.cliente)+'</td><td>'+esc(r.campania)+'</td><td>'+display(r.desde)+' – '+display(r.hasta)+'</td><td>'+esc(r.pantallas.join(', ')||'Sin pantalla')+'</td><td>'+r.pct+'%</td><td>'+(r.plays===null?'—':number(r.plays))+'</td></tr>').join('');
 w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Arcuva · Reporte de Clientes y Campañas</title><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17243b;margin:0;padding:12mm}.head{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:2px solid #1769d2;margin-bottom:15px}.head img{max-width:160px;max-height:70px;border-radius:12px;object-fit:contain}.head h1{font-size:22px;color:#0b2b59;margin:0}.head p{font-size:11px;color:#657790}.filters{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;background:#edf4fc;padding:12px;border-radius:8px;font-size:10px;margin-bottom:15px}table{border-collapse:collapse;width:100%;font-size:10px}th{background:#0d457b;color:white;text-align:left;padding:9px}td{padding:8px;border:1px solid #dce5ee}tr:nth-child(even){background:#f4f7fb}.footer{display:flex;justify-content:space-between;border-top:1px solid #ccd5e1;padding-top:10px;margin-top:16px;color:#64748b;font-size:9px}</style></head><body><div class="head"><div>'+head+'</div><div><h1>Reporte de Clientes y Campañas</h1><p>Arcuva · Sistema de Gestión de Pantallas</p></div></div><div class="filters">'+filters.map(s=>'<div>'+esc(s)+'</div>').join('')+'</div><table><thead><tr><th>Cliente</th><th>Campaña</th><th>Vigencia</th><th>Pantallas</th><th>% Salidas</th><th>Salidas registradas</th></tr></thead><tbody>'+trs+'</tbody></table><div class="footer"><span>Reporte generado el '+esc(new Date().toLocaleString('es-AR'))+'</span><span>Arcuva · Powered by NextWork</span></div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>');
 w.document.close();
}
function init(){
 if(!$('rptBody'))return;
 document.querySelectorAll('[data-rpt-mode]').forEach(b=>b.addEventListener('click',()=>updateMode(b.dataset.rptMode)));
 ['rptDesde','rptHasta','rptCliente','rptCampania','rptPantalla','rptEstado'].forEach(id=>$(id)?.addEventListener('change',render));
 $('rptReset')?.addEventListener('click',reset);$('rptPrint')?.addEventListener('click',printReport);
 reset();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.addEventListener('arcuva-data-loaded',render);
window.addEventListener('arcuva-page-reportes',render);
})();