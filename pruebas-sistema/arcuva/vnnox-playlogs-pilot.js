// Piloto de diagnóstico VNNOX: solo lectura y solicitud de registros oficiales.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;
const $=id=>document.getElementById(id);
if(!base||!$('vnPilotRequest'))return;
const endpoint='https://qkstdmskuiclbcrncfun.supabase.co/functions/v1/vnnox-playlogs';
const oneDay=86400000;
const format=(d)=>new Date(d).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'});
const localDate=(offset=0)=>{
  const d=new Date(Date.now()+offset*oneDay);
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
};
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const from=$('vnPilotFrom'),to=$('vnPilotTo'),msg=$('vnPilotMessage'),requestBtn=$('vnPilotRequest'),history=$('vnPilotHistory');
from.value=localDate(-7);to.value=localDate(-1);
let busy=false;
async function call(body){
 const {data,error}=await base.db.auth.getSession();
 if(error||!data.session?.access_token)throw Error('Ingresá con tu cuenta de Arcuva para solicitar registros.');
 const response=await fetch(endpoint,{
  method:body?'POST':'GET',headers:{Authorization:'Bearer '+data.session.access_token,
  'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined
 });
 const json=await response.json().catch(()=>({}));
 if(!response.ok||json.ok===false)throw Error(json.error||'No se pudo consultar VNNOX. HTTP '+response.status);
 return json;
}
function extractUrl(payload){
 if(!payload)return null;
 let data;
 try{data=typeof payload==='string'?JSON.parse(payload):payload;}catch{return null;}
 const queue=[data];
 while(queue.length){
  const current=queue.shift();
  if(!current||typeof current!=='object')continue;
  for(const [k,v] of Object.entries(current)){
   if(typeof v==='string'&&/^https:\/\//i.test(v)&&/download|file|url|link|excel/i.test(k)&&
   /\.xlsx?(?:\?|$)|download|vnnox/i.test(v))return v;
   if(v&&typeof v==='object')queue.push(v);
  }
 }
 return null;
}
function render(data){
 const entries=data.requests||[];
 history.innerHTML=entries.length?'<table><thead><tr><th>Período</th><th>Pedido</th><th>Estado</th><th>Resultado</th></tr></thead><tbody>'+
 entries.map(r=>{
 const file=extractUrl(r.callback_payload);
 let status=r.estado==='recibida'?'Reporte recibido':r.estado==='solicitada'?'Procesando en VNNOX':r.estado==='error'?'Error':'Pendiente';
 return '<tr><td>'+esc(r.fecha_desde)+' al '+esc(r.fecha_hasta)+'</td>'+
 '<td>'+esc(format(r.solicitada_en))+'</td><td>'+esc(status)+'</td>'+
 '<td>'+(file?'<a href="'+esc(file)+'" target="_blank" rel="noopener noreferrer">Descargar Excel VNNOX</a>':esc(r.error_detalle||r.task_id||'Esperando archivo'))+'</td></tr>';
 }).join('')+'</tbody></table>':'No hay solicitudes de reproducción de Prueba - SMA.';
}
async function refresh(){
 if(busy)return;
 busy=true;$('vnPilotRefresh').disabled=true;
 try{
  const data=await call();
  render(data);
  msg.textContent='Estado actualizado. Los reportes recibidos deben cotejarse con los identificadores de campaña antes de registrarse como salidas.';
 }catch(e){msg.textContent='Error: '+e.message;}
 finally{busy=false;$('vnPilotRefresh').disabled=false;}
}
async function request(){
 if(busy)return;
 const dates={from:from.value,to:to.value};
 if(!dates.from||!dates.to||dates.from>dates.to){msg.textContent='Indicá un intervalo válido.';return;}
 if(!window.confirm('Se solicitarán registros de reproducción reales a VNNOX para Prueba - SMA. No modifica la programación. ¿Continuar?'))return;
 busy=true;requestBtn.disabled=true;
 try{
  msg.textContent='Enviando solicitud a VNNOX…';
  const result=await call({action:'request',...dates});
  msg.textContent='VNNOX recibió el pedido (tarea '+result.task_id+'). Usá «Consultar estado» para ver cuándo llega el Excel.';
 }catch(e){msg.textContent='No se pudo solicitar el reporte: '+e.message;}
 finally{busy=false;requestBtn.disabled=false;}
 await refresh();
}
$('vnPilotRefresh').addEventListener('click',refresh);
requestBtn.addEventListener('click',request);
window.addEventListener('arcuva-page-reportes',refresh);
})();