/* NextWork · vista de transición multiempresa (solo lectura, entorno de pruebas).
   Este módulo NO reasigna registros ni reemplaza las políticas RLS.
   Las asignaciones previstas se usan exclusivamente para simular los reportes
   antes de efectuar una migración controlada de pantallas/campañas/clientes. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TARGETS={
  'arcuva':{name:'Arcuva',desc:'Operación de Arcuva'},
  'hidricos':{name:'Recursos Hídricos',desc:'Operación de Recursos Hídricos'},
  'test':{name:'NextWork · Pruebas internas',desc:'Dispositivos internos para ensayos'}
};
// Identificadores de las cuatro pantallas existentes. No se modifican.
const plannedScreens={
  'e0a1ab21-ef95-4444-9a9c-a6bb39e130ca':'arcuva',
  'e85aa802-60d1-4791-b2ad-d09a8a331be8':'hidricos',
  '83f091fd-df99-478d-a04f-57b24deeeb20':'test',
  '83659a82-fb83-4933-b48f-5e2688d1f0cf':'test'
};
let current='all',snapshot=null,loaded=false,loading=false;
function formatDate(v){if(!v)return '—';const s=String(v).slice(0,10);const p=s.split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:'—';}
function dateRangeToday(){
  const today=new Date();
  const tomorrow=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);
  const start=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  return {start:start.toISOString(),end:tomorrow.toISOString()};
}
function getOwner(screen,companies){
  if(plannedScreens[screen.id])return plannedScreens[screen.id];
  const company=companies.find(c=>c.id===screen.empresa_id);
  if(!company||company.slug==='nextwork')return 'test';
  if(company.slug==='arcuva')return 'arcuva';
  if(company.slug==='recursos-hidricos')return 'hidricos';
  return 'other';
}
function hiddenNavigation(active){
  if(!active){if(typeof configureRoleNavigation==='function')configureRoleNavigation();return;}
  document.querySelectorAll('.nav-btn[data-page]').forEach(el=>{
    el.classList.toggle('hidden',el.dataset.page!=='dashboard');
  });
}
async function buildSnapshot(scope){
  const [screenResult,companiesResult,linksResult,viewResult,baseResult]=await Promise.all([
    sb.from('pantallas').select('id,nombre,ubicacion,empresa_id,ancho,alto,activo').order('nombre'),
    sb.from('empresas').select('id,slug,nombre_fantasia,logo_url,color_primario,activo').order('nombre_fantasia'),
    sb.from('campanias_pantallas').select('campania_id,pantalla_id'),
    sb.from('vista_campanias').select('id,cliente_id,cliente,campania,fecha_desde,fecha_hasta,porcentaje,estado'),
    sb.from('campanias').select('id,eliminada')
  ]);
  const error=[screenResult,companiesResult,linksResult,viewResult,baseResult].find(r=>r.error)?.error;
  if(error)throw new Error(error.message);
  const companies=companiesResult.data||[];
  const allScreens=screenResult.data||[];
  const screens=allScreens.filter(p=>getOwner(p,companies)===scope);
  const screenIds=new Set(screens.map(p=>p.id));
  const matches=(linksResult.data||[]).filter(l=>screenIds.has(l.pantalla_id));
  const linkByCampaign=new Map();
  for(const link of matches){
    if(!linkByCampaign.has(link.campania_id))linkByCampaign.set(link.campania_id,[]);
    linkByCampaign.get(link.campania_id).push(link.pantalla_id);
  }
  const archived=new Set((baseResult.data||[]).filter(c=>c.eliminada===true).map(c=>c.id));
  const campaigns=(viewResult.data||[]).filter(c=>linkByCampaign.has(c.id)&&!archived.has(c.id));
  const clients=[...new Map(campaigns.map(c=>[c.cliente_id||c.cliente,c.cliente||'Sin cliente'])).values()].sort((a,b)=>a.localeCompare(b,'es'));
  const {start,end}=dateRangeToday();
  let reproductionCount=0;
  if(screens.length){
    const {count,error:reproError}=await sb.from('reproducciones')
      .select('id',{count:'exact',head:true})
      .in('pantalla_id',screens.map(p=>p.id))
      .gte('fecha_hora',start).lt('fecha_hora',end);
    if(reproError)throw new Error(reproError.message);
    reproductionCount=count||0;
  }
  const corporation=companies.find(c=>c.slug===(scope==='test'?'nextwork':scope==='hidricos'?'recursos-hidricos':scope));
  return {
    scope,company:corporation||null,
    companyExists:!!corporation,
    target:TARGETS[scope],
    screens,allScreens,companies,campaigns,clients,linkByCampaign,
    reproductionCount,generatedAt:new Date()
  };
}
function screenNames(c,view){
  const ids=view.linkByCampaign.get(c.id)||[];
  return ids.map(id=>view.screens.find(p=>p.id===id)?.nombre).filter(Boolean).join(', ')||'—';
}
function readOnlyTable(headers,rows,empty){
  if(!rows.length)return '<div class="stage-empty">'+esc(empty)+'</div>';
  return '<div class="stage-table-scroll"><table class="stage-table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'
    +rows.join('')+'</tbody></table></div>';
}
function redraw(view){
  const stage=$('stageCompanyPreview'); if(!stage)return;
  const label=view.target.name;
  const ownerNote=view.companyExists
    ? 'La empresa está registrada. La clasificación mostrada es una propuesta, no el propietario definitivo de todos los registros.'
    : 'Esta empresa todavía no tiene una ficha propia en Supabase. La vista es solo una simulación de organización.';
  const originalOwners=new Map(view.companies.map(c=>[c.id,c.nombre_fantasia]));
  const screenRows=view.screens.map(p=>'<tr><td>'+esc(p.nombre)+'</td><td>'+esc(p.ubicacion||'—')+'</td><td>'+esc(originalOwners.get(p.empresa_id)||'—')+'</td><td><strong>'+esc(label)+'</strong></td></tr>');
  const campaignRows=view.campaigns.slice().sort((a,b)=>(a.cliente||'').localeCompare(b.cliente||'','es'))
    .map(c=>'<tr><td>'+esc(c.cliente)+'</td><td>'+esc(c.campania)+'</td><td>'+esc(screenNames(c,view))+'</td><td>'+formatDate(c.fecha_desde)+' – '+formatDate(c.fecha_hasta)+'</td><td>'+Number(c.porcentaje||0)+'%</td></tr>');
  const totalActive=view.campaigns.filter(c=>c.estado==='activa').length;
  const internal=view.scope==='test';
  stage.innerHTML=''
   +'<div class="stage-heading"><div><div class="stage-eyebrow">PREVISUALIZACIÓN · SIN MODIFICAR DATOS</div><h2>'+esc(label)+'</h2><p>'+esc(view.target.desc)+' · Vista de lectura únicamente</p></div>'
   +'<div class="stage-actions"><button type="button" class="btn btn-outline" onclick="stageRefreshPreview()">Actualizar</button><button type="button" class="btn btn-primary" onclick="stagePrintPreview()">Imprimir / PDF</button></div></div>'
   +'<div class="stage-notice">Las empresas siguen usando sus asociaciones actuales en Supabase. '+esc(ownerNote)
   +(internal?' Las campañas de prueba permanecen aquí, incluso cuando el cliente de una publicidad también figure en Arcuva.':'')
   +'</div>'
   +'<div class="stage-kpis">'
   +'<div><span>Pantallas previstas</span><strong>'+view.screens.length+'</strong></div>'
   +'<div><span>Campañas asociadas</span><strong>'+view.campaigns.length+'</strong></div>'
   +'<div><span>Campañas activas</span><strong>'+totalActive+'</strong></div>'
   +'<div><span>Clientes en campañas</span><strong>'+view.clients.length+'</strong></div>'
   +'<div><span>Reproducciones hoy</span><strong>'+view.reproductionCount.toLocaleString('es-AR')+'</strong></div>'
   +'</div>'
   +'<h3>Pantallas de '+esc(label)+'</h3>'
   +readOnlyTable(['Pantalla','Ubicación','Empresa actual en Supabase','Asignación prevista'],screenRows,'Sin pantallas previstas.')
   +'<h3>Clientes con campañas en estas pantallas</h3>'
   +(view.clients.length?'<div class="stage-pills">'+view.clients.map(c=>'<span>'+esc(c)+'</span>').join('')+'</div>':'<div class="stage-empty">Sin clientes para esta vista.</div>')
   +'<h3>Campañas y pantallas vinculadas</h3>'
   +readOnlyTable(['Cliente','Campaña','Pantalla','Vigencia','% salidas'],campaignRows,'Sin campañas.')
   +'<p class="stage-footnote">Esta simulación no reemplaza la separación real de registros ni las políticas de seguridad RLS. El traslado definitivo se hará después de validar las asociaciones.</p>';
}
async function applyScope(scope){
  if(!isSuperAdmin())return;
  if(loading)return;
  if(scope!=='all'&&!TARGETS[scope])scope='all';
  current=scope;
  const selector=$('stageCompanySelector');
  if(selector)selector.value=scope;
  const original=$('stageOriginalDashboard'),preview=$('stageCompanyPreview');
  const active=scope!=='all';
  if(original)original.classList.toggle('hidden',active);
  if(preview)preview.classList.toggle('hidden',!active);
  hiddenNavigation(active);
  if(typeof showPage==='function')showPage('dashboard');
  if(!active){snapshot=null;return;}
  if(preview)preview.innerHTML='<div class="stage-empty">Consultando las campañas y pantallas…</div>';
  loading=true;
  if(selector)selector.disabled=true;
  try{
    snapshot=await buildSnapshot(scope);
    if(current===scope)redraw(snapshot);
  }catch(e){
    console.error('No se pudo mostrar la vista previa:',e);
    if(preview)preview.innerHTML='<div class="stage-empty">No se pudo cargar la previsualización: '+esc(e.message||String(e))+'</div>';
  }finally{
    loading=false;if(selector)selector.disabled=false;
  }
}
function safeWrite(s){return esc(s);}
function printPreview(){
  const data=snapshot;
  if(!data||data.scope!==current)return;
  const popup=window.open('','_blank','width=1200,height=850');
  if(!popup){alert('Habilitá las ventanas emergentes para imprimir el reporte.');return;}
  const name=data.target.name;
  const rows=data.campaigns.map(c=>'<tr><td>'+safeWrite(c.cliente)+'</td><td>'+safeWrite(c.campania)+'</td><td>'+safeWrite(screenNames(c,data))+'</td><td>'+formatDate(c.fecha_desde)+' – '+formatDate(c.fecha_hasta)+'</td><td>'+Number(c.porcentaje||0)+'%</td></tr>').join('');
  const logo=data.company?.logo_url&&/^https:\/\//i.test(data.company.logo_url)?'<img src="'+safeWrite(data.company.logo_url)+'" alt="">':'';
  popup.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte de Clientes y Campañas · '+safeWrite(name)+'</title>'
   +'<style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#10223c;margin:0}header{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:3px solid #4338ca;padding-bottom:12px;margin-bottom:18px}header img{max-height:60px;max-width:180px}h1{margin:0;font-size:23px}h2{font-size:15px;margin-top:22px}table{border-collapse:collapse;width:100%;font-size:10px}th{background:#132e57;color:white;text-align:left}th,td{padding:8px;border:1px solid #dce4ed}tr:nth-child(even){background:#f4f7fb}.note{font-size:10px;color:#746226}footer{font-size:9px;border-top:1px solid #ddd;margin-top:14px;padding-top:10px;color:#667085}</style></head><body>'
   +'<header><div>'+logo+'<div><strong>'+safeWrite(name)+'</strong><div style="font-size:10px;color:#64748b">Plataforma NextWork</div></div></div><div><h1>Reporte de Clientes y Campañas</h1><div>Vista preliminar de asignación por empresas</div></div></header>'
   +'<p><strong>Resumen:</strong> '+data.screens.length+' pantallas · '+data.clients.length+' clientes · '+data.campaigns.length+' campañas · '+data.reproductionCount+' reproducciones hoy</p>'
   +'<h2>Pantallas</h2><p>'+data.screens.map(p=>safeWrite(p.nombre)).join(' · ')+'</p>'
   +'<h2>Campañas</h2><table><thead><tr><th>Cliente</th><th>Campaña</th><th>Pantallas</th><th>Vigencia</th><th>%</th></tr></thead><tbody>'+rows+'</tbody></table>'
   +'<footer>Simulación administrativa; los permisos reales todavía dependen de la base actual. Generado '+new Date().toLocaleString('es-AR')+'</footer>'
   +'<script>window.addEventListener("load",function(){window.print()})<\/script></body></html>');
  popup.document.close();
}
function reset(){
  current='all';snapshot=null;
  const selector=$('stageCompanySelector');
  if(selector)selector.value='all';
  const wrap=$('stageCompanySelectorWrap');
  if(wrap)wrap.classList.add('hidden');
  $('stageCompanyPreview')?.classList.add('hidden');
  $('stageOriginalDashboard')?.classList.remove('hidden');
}
function init(){
  if(!isSuperAdmin()){reset();return;}
  const wrap=$('stageCompanySelectorWrap');
  const select=$('stageCompanySelector');
  if(!wrap||!select)return;
  if(!loaded){
    select.addEventListener('change',e=>applyScope(e.target.value));
    loaded=true;
  }
  wrap.classList.remove('hidden');
  // Siempre iniciar con la vista global. No usar persistencia para prevenir una
  // reentrada accidental a una vista simulada luego de volver a iniciar sesión.
  applyScope('all');
}
window.stageRefreshPreview=()=>applyScope(current==='all'?'all':current);
window.stagePrintPreview=printPreview;
window.addEventListener('stage-session-ready',init);
window.addEventListener('stage-session-ended',reset);
// La sesión puede finalizar antes de cargar este archivo externo. No usamos
// observadores ni temporizadores, como en los hotfix que afectaron el menú.
if(typeof currentProfile!=='undefined'&&currentProfile) init();
})();