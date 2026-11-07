// Diagnóstico remoto de lectura para Taurus en el portal Arcuva.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;
if(!base)return;
const $=id=>document.getElementById(id),esc=base.escapeHtml;
let serial=0;
const api='https://qkstdmskuiclbcrncfun.supabase.co/functions/v1/vnnox-api';
function text(v){
 if(v===undefined||v===null||v==='')return 'No informado';
 return typeof v==='object'?JSON.stringify(v):String(v);
}
function row(label,val){
 return '<div class="nw-diag-row"><strong>'+esc(label)+'</strong><span>'+esc(text(val))+'</span></div>';
}
function findField(data,field,depth=0){
 if(depth>5||data==null||typeof data!=='object')return undefined;
 if(Object.prototype.hasOwnProperty.call(data,field))return data[field];
 if(Array.isArray(data)){
  for(const item of data){const result=findField(item,field,depth+1);if(result!==undefined)return result;}
 }else{
  for(const key of ['data','rows','result','status','device','player','detail','basic','info']){
    if(Object.prototype.hasOwnProperty.call(data,key)){
     const result=findField(data[key],field,depth+1);
     if(result!==undefined)return result;
    }
  }
 }
 return undefined;
}
function getValue(section,fields){
 for(const field of fields){const val=findField(section?.data,field);if(val!==undefined&&val!==null)return val;}
 return null;
}
function section(label,part,fields=[]){
 if(!part)return '<div class="nw-diag-area">'+row(label,'No consultado')+'</div>';
 const ok=part.httpStatus>=200&&part.httpStatus<300;
 let html='<div class="nw-diag-area"><div class="nw-diag-area-head"><strong>'+esc(label)+'</strong><span class="'+(ok?'nw-diag-ok':'nw-diag-warning')+'">HTTP '+esc(text(part.httpStatus))+'</span></div>';
 if(ok&&fields.length){
  for(const [title,keys] of fields){
   const val=getValue(part,keys);
   if(val!==null)html+=row(title,val);
  }
 }
 if(!ok)html+='<p class="nw-diag-warning">VNNOX no entregó esta consulta. No implica necesariamente que el Taurus esté apagado.</p>';
 return html+'</div>';
}
function close(){
 serial++;
 $('taurusDiagnosticRoot')?.replaceChildren();
}
async function open(screenId){
 const screen=base.getModel().screens.find(x=>x.id===screenId);
 const player=(base.getModel().playerRows||[]).find(x=>x.pantalla_id===screenId&&x.tipo==='novastar_taurus');
 if(!screen||!player)return;
 const current=++serial,root=$('taurusDiagnosticRoot');
 if(!root)return;
 root.innerHTML='<div class="admin-backdrop" role="presentation"><div class="admin-dialog nw-diag-dialog" role="dialog" aria-modal="true" aria-label="Diagnóstico de Taurus">'+
  '<div class="dialog-head"><h3>Diagnóstico · '+esc(screen.nombre)+'</h3><button type="button" class="secondary" id="nwDiagClose" aria-label="Cerrar">×</button></div>'+
  '<p class="nw-diag-notice">Consulta de solo lectura. No se envían tandas ni comandos al Taurus.</p>'+
  '<div id="nwDiagContent"><p>Consultando VNNOX…</p></div>'+
  '<div class="dialog-actions"><button type="button" class="secondary" id="nwDiagCloseBottom">Cerrar</button><button type="button" class="secondary" id="nwDiagRefresh">Volver a consultar</button></div></div></div>';
 $('nwDiagClose').addEventListener('click',close);
 $('nwDiagCloseBottom').addEventListener('click',close);
 $('nwDiagRefresh').addEventListener('click',()=>open(screenId));
 const holder=$('nwDiagContent');
 const updated=Date.parse(player.actualizado_en||'');
 let html='<div class="nw-diag-area">'+row('Pantalla',screen.nombre)+row('Resolución configurada',screen.ancho+' × '+screen.alto)+
   row('Estado confirmado por VNNOX',updated&&Date.now()-updated<5*60000?(player.vnnox_online_status===1?'En línea':player.vnnox_online_status===0?'Fuera de línea':'No informado'):'Sin verificación reciente')+
   row('Última verificación',Number.isFinite(updated)?new Date(updated).toLocaleString('es-AR'):'No disponible')+
   row('ID de reproductor guardado',player.vnnox_player_id||'Pendiente')+'</div>';
 if(!player.vnnox_player_id){
  holder.innerHTML=html+'<p class="nw-diag-warning">Falta asociar el Player ID interno. Usá «Editar → Verificar en VNNOX».</p>';
  return;
 }
 try{
  const {data:session,error:sessionError}=await base.db.auth.getSession();
  if(sessionError||!session?.session?.access_token)throw Error('Tu sesión venció. Iniciá sesión nuevamente.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),18000);
  let response;
  try{
   response=await fetch(api+'?action=diagnostic-status&screenId='+encodeURIComponent(screenId),{
    method:'GET',headers:{Authorization:'Bearer '+session.session.access_token},
    signal:controller.signal,cache:'no-store'
   });
  }finally{clearTimeout(timeout);}
  let result={};
  try{result=await response.json();}catch{throw Error('VNNOX devolvió un formato no válido.');}
  if(current!==serial)return;
  if(!response.ok||!result.ok)throw Error(result.error||'No se pudo obtener el diagnóstico (HTTP '+response.status+').');
  const status=getValue(result.online,['onlineStatus']);
  html+=section('Conectividad de VNNOX',result.online,[['Estado informado',['onlineStatus']],['Última conexión',['lastOnlineTime']]]);
  html+=section('Estado operativo',result.running,[
    ['Reproducción',['playingStatus','playStatus']],['Firmware',['version','firmwareVersion']],['Memoria disponible',['availableMemory']]
  ]);
  html+=section('Monitoreo de pantalla',result.screenMonitor,[
    ['Estado de pantalla',['screenStatus','status']],['Brillo',['brightness']],['Temperatura',['temperature']]
  ]);
  html+=section('Parámetros del equipo',result.basics,[
    ['Almacenamiento disponible',['availableStorage']],['Volumen',['volume']],['IP',['ip']]
  ]);
  html+='<p class="nw-diag-notice"><strong>Programa en reproducción:</strong> los datos anteriores no acreditan por sí solos el nombre del programa activo ni que la pantalla LED esté iluminada.</p>'+
    '<p class="nw-diag-notice"><strong>Captura remota de imagen:</strong> aún no disponible en NextWork. No debe considerarse verificación visual.</p>';
  holder.innerHTML=html;
 }catch(err){
  if(current!==serial)return;
  holder.innerHTML=html+'<p class="nw-diag-warning">No se pudo completar el diagnóstico: '+esc(err?.message||String(err))+'. La programación del Taurus no fue modificada.</p>';
 }
}
window.ArcuvaTaurusDiagnostic=Object.freeze({open});
})();