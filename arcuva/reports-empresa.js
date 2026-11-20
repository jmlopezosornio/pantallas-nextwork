// NextWork - Reportes Arcuva, portal estable de Arcuva.
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
const measurableTypes=new Set(['windows','raspberry']);
function measurementScreenIds(){
 const m=current();
 if(m.playerQueryFailed)return new Set();
 return new Set((m.playerRows||[])
  .filter(p=>measurableTypes.has(String(p.tipo||'').toLowerCase()))
  .map(p=>p.pantalla_id));
}
const noMeasurement='Sin medición individual';
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
 const plays=r.plays===null?(r.unmeasured?noMeasurement:'—'):number(r.plays);
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
   $('rptPlaysInfo').textContent='Modo General: sin conteo. Seleccioná «Entre fechas» para ver salidas individuales de Windows/Raspberry Pi; Taurus/VNNOX no se mide por campaña.';
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
 const measurable=measurementScreenIds();
 const playersUnknown=current().playerQueryFailed===true;
 try{
   // Conteos exactos en el servidor: no descargamos los registros uno por uno.
   // Consultas por campaña y pantallas autorizadas a Arcuva.
   for(let i=0;i<rows.length;i+=6){
     const batch=rows.slice(i,i+6);
     const results=await Promise.all(batch.map(async r=>{
       const allIds=selectedScreen?[selectedScreen]:r.pantallaIds;
       const ids=allIds.filter(id=>measurable.has(id));
       if(!ids.length)return {id:r.id,count:null,unmeasured:true};
       const {count,error}=await db.from('reproducciones')
         .select('id',{count:'exact',head:true})
         .eq('campania_id',r.id)
         .in('pantalla_id',ids)
         .gte('fecha_hora',begin).lt('fecha_hora',end);
       if(error)throw new Error(error.message);
       if(!Number.isSafeInteger(count)||count<0)throw new Error('Conteo de reproducciones no disponible.');
       return {id:r.id,count,unmeasured:ids.length<allIds.length};
     }));
     if(seq!==countRequest)return;
     results.forEach(r=>counts.set(r.id,r));
   }
   if(seq!==countRequest)return;
   rows.forEach(r=>{
     const c=counts.get(r.id);
     r.plays=c?.count??null;
     r.unmeasured=c?.unmeasured??true;
   });
   const measuredRows=rows.filter(r=>r.plays!==null);
   const total=measuredRows.reduce((sum,r)=>sum+r.plays,0);
   const unmeasured=rows.filter(r=>r.unmeasured).length;
   countsReady=true;
   $('rptPlaysInfo').textContent=(playersUnknown
    ?'No se pudo comprobar el tipo de reproductor. No se muestran salidas no verificadas.'
    :'Salidas registradas por reproductores Windows/Raspberry Pi: '+number(total)+
     '. Campañas con pantallas sin medición individual: '+unmeasured+'.')+
     ' VNNOX/Taurus no se contabiliza. Las salidas se basan exclusivamente en eventos individuales de reproducción.';
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
// Exportación PDF independiente de los encabezados/pies automáticos de Chrome.
let reportPdfLibraries=null;
function loadReportPdfLibraries(){
 if(reportPdfLibraries)return reportPdfLibraries;
 const load=url=>new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=url;script.async=true;
   script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar el generador PDF.'));
   document.head.appendChild(script);
 });
 reportPdfLibraries=(async()=>{
   if(!window.jspdf?.jsPDF)await load('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js');
   if(!window.jspdf?.jsPDF?.API?.autoTable)await load('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js');
   if(!window.jspdf?.jsPDF?.API?.autoTable)throw new Error('No está disponible el generador de tablas PDF.');
 })().catch(error=>{reportPdfLibraries=null;throw error;});
 return reportPdfLibraries;
}
async function reportLogoPng(){
 const src=$('sidebarLogo')?.getAttribute('src');
 if(!src)return null;
 try{
   const image=new Image();image.crossOrigin='anonymous';
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=src;});
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   return {data:canvas.toDataURL('image/png'),ratio:image.naturalWidth/image.naturalHeight};
 }catch(error){console.warn('Logo de Arcuva no disponible para PDF:',error);return null;}
}
async function printReport(){
 if(!rows?.length){alert('No hay campañas para imprimir con estos filtros.');return;}
 const w=window.open('','_blank');if(!w){alert('Habilitá las ventanas emergentes para generar el PDF.');return;}
 w.document.write('<!doctype html><html lang="es"><meta charset="utf-8"><title>Generando reporte Arcuva</title><body style="font:16px Arial,sans-serif;padding:30px;color:#173258">Generando reporte PDF de Arcuva…</body></html>');
 try{
   if(mode==='fechas'&&!countsReady)await fetchCounts();
   if(mode==='fechas'&&(!countsReady||countIssue))throw new Error(countIssue||'No se pudo confirmar la cantidad de reproducciones.');
   await loadReportPdfLibraries();
   const logo=await reportLogoPng();
   const doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
   const width=297,height=210,left=12,right=12,bottom=20;
   const filters=[
     'Período: '+labelPeriod(),
     'Cliente: '+selectedText('rptCliente','Todos'),
     'Campaña: '+selectedText('rptCampania','Todas'),
     'Pantalla: '+selectedText('rptPantalla','Todas'),
     'Estado: '+selectedText('rptEstado','Activas')
   ];
   const footerDate=new Date().toLocaleString('es-AR');
   const drawFrame=(pageNumber)=>{
     // Encabezado institucional original. Sin fecha/título/URL automáticos del navegador.
     if(logo){
       const logoHeight=Math.min(20,35/logo.ratio);
       doc.addImage(logo.data,'PNG',left,12,logoHeight*logo.ratio,logoHeight);
     }else{
       doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(23,58,111);
       doc.text('ARCUVA',left,23);
     }
     doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(11,43,89);
     doc.text('Reporte de Clientes y Campañas',width-right,21,{align:'right'});
     doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(101,119,144);
     doc.text('Arcuva · Sistema de Gestión de Pantallas',width-right,27,{align:'right'});
     doc.setDrawColor(23,105,210);doc.setLineWidth(0.5);doc.line(left,36,width-right,36);
     if(pageNumber===1){
       doc.setFillColor(237,244,252);doc.roundedRect(left,41,width-left-right,18,2,2,'F');
       const slot=(width-left-right)/5;
       doc.setFontSize(7.3);doc.setTextColor(40,58,86);
       filters.forEach((label,i)=>{
         const parts=doc.splitTextToSize(label,slot-6).slice(0,3);
         doc.text(parts,left+i*slot+3,46);
       });
     }
     // Pie institucional original, colocado dentro del área imprimible del A4.
     doc.setDrawColor(204,213,225);doc.setLineWidth(0.25);doc.line(left,height-bottom+1,width-right,height-bottom+1);
     doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,116,139);
     doc.text('Reporte generado el '+footerDate,left,height-bottom+6);
     doc.text('Arcuva · Powered by NextWork',width-right,height-bottom+6,{align:'right'});
   };
   const body=rows.map(r=>[
     r.cliente,r.campania,display(r.desde)+' – '+display(r.hasta),
     r.pantallas.join(', ')||'Sin pantalla',r.pct+'%',
     r.plays===null?(r.unmeasured?noMeasurement:'—'):number(r.plays)
   ]);
   doc.autoTable({
     head:[['Cliente','Campaña','Vigencia','Pantallas','% Salidas','Salidas registradas']],
     body,startY:66,
     margin:{top:43,bottom:bottom+12,left,right},
     theme:'grid',
     styles:{font:'helvetica',fontSize:8,cellPadding:2.3,overflow:'linebreak',lineColor:[220,229,238],lineWidth:0.18,textColor:[23,36,59],valign:'middle'},
     headStyles:{fillColor:[13,69,123],textColor:[255,255,255],fontStyle:'bold',fontSize:8.3,cellPadding:3},
     alternateRowStyles:{fillColor:[244,247,251]},
     columnStyles:{0:{cellWidth:36},1:{cellWidth:42},2:{cellWidth:40},3:{cellWidth:111},4:{cellWidth:19},5:{cellWidth:25}},
     rowPageBreak:'avoid',
     didDrawPage:data=>drawFrame(data.pageNumber)
   });
   const url=URL.createObjectURL(doc.output('blob'));
   w.location.replace(url);
   setTimeout(()=>URL.revokeObjectURL(url),120000);
 }catch(error){
   console.error('No se pudo generar el PDF de Arcuva',error);
   w.close();
   alert('No se pudo generar el PDF: '+(error?.message||error));
 }
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