// NextWork /pruebas-sistema - geolocalizacion REAL, persistida en Supabase.
// No modifica reproductores, campañas, resolución ni horarios.
(function(){
'use strict';
const btnId='nx-geo-action';
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const superUser=()=>typeof isSuperAdmin==='function' && isSuperAdmin();
const manager=()=>superUser() || (typeof isAdmin==='function' && isAdmin());
const currentCompany=()=>{try{return currentProfile?.empresa_id||null;}catch{return null;}};
const parse = raw=>{
 const s=String(raw||'').trim();
 let m=s.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
 if(m)return [Number(m[1]),Number(m[2])];
 let u;try{u=new URL(s);}catch{return null;}
 if(!/(^|\.)google\.[a-z.]+$|(^|\.)goo\.gl$/.test(u.hostname))return null;
 const v=u.searchParams.get('q')||u.searchParams.get('query')||u.searchParams.get('ll')||'';
 m=v.match(/(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/)||
   u.pathname.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/)||
   u.pathname.match(/!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
 return m?[Number(m[1]),Number(m[2])]:null;
};
const ok=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&a>=-90&&a<=90&&b>=-180&&b<=180;
function coords(){
 const a=document.getElementById('nxgeo-lat')?.value, b=document.getElementById('nxgeo-lng')?.value;
 if(!a?.trim()||!b?.trim())return null;
 const lat=Number(a),lng=Number(b);
 return ok(lat,lng)?{latitud:lat,longitud:lng}:null;
}
function notice(msg,err=false){const t=document.getElementById('nxgeo-status');if(t){t.textContent=msg;t.style.color=err?'#b91c1c':'#167a4d';}}
function setCoords(a,b){if(!ok(a,b)){notice('Coordenadas fuera del rango permitido.',true);return;}document.getElementById('nxgeo-lat').value=a.toFixed(6);document.getElementById('nxgeo-lng').value=b.toFixed(6);notice('Ubicación cargada. Confirmá antes de guardar.');}
window.openScreenGeo = async function(screenId){
 if(!manager())return;
 const p=(typeof cachePantallas!=='undefined'?cachePantallas:[]).find(x=>String(x.id)===String(screenId));
 if(!p)return;
 if(!superUser() && (!currentCompany() || String(currentCompany())!==String(p.empresa_id))){alert('No tenés permisos para editar esta pantalla.');return;}
 const root=document.getElementById('modalRoot');if(!root)return;
 root.innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this) closeModal()"><div class="modal" style="max-width:660px">
 <h3>Georreferenciar · ${esc(p.nombre)}</h3>
 <p class="small">Podés obtener la ubicación con el GPS del celular o pegar coordenadas de Google Maps. Los enlaces cortos no siempre incluyen las coordenadas.</p>
 <div class="field full"><label>Enlace de Google Maps o latitud, longitud</label><input id="nxgeo-map" type="text" placeholder="Pegar enlace o -40.15, -71.35"></div>
 <div class="actions" style="justify-content:flex-start;flex-wrap:wrap">
 <button class="btn btn-ghost" type="button" id="nxgeo-parse">Interpretar Google Maps</button>
 <button class="btn btn-primary" type="button" id="nxgeo-gps">Usar GPS del celular</button></div>
 <div class="form-grid">
 <div class="field"><label>Latitud</label><input id="nxgeo-lat" inputmode="decimal" type="number" min="-90" max="90" step="any" value="${Number.isFinite(Number(p.latitud))&&p.latitud!=null?p.latitud:''}"></div>
 <div class="field"><label>Longitud</label><input id="nxgeo-lng" inputmode="decimal" type="number" min="-180" max="180" step="any" value="${Number.isFinite(Number(p.longitud))&&p.longitud!=null?p.longitud:''}"></div></div>
 <p id="nxgeo-status" class="small" role="status">Las coordenadas se guardarán en la ficha real de esta pantalla.</p>
 <div class="actions"><button class="btn btn-ghost" id="nxgeo-view">Ver en Google Maps</button><button class="btn btn-ghost" id="nxgeo-cancel">Cancelar</button><button class="btn btn-primary" id="nxgeo-save">Guardar ubicación</button></div></div></div>`;
 document.getElementById('nxgeo-parse').onclick=()=>{const c=parse(document.getElementById('nxgeo-map').value);c?setCoords(...c):notice('No se encontraron coordenadas. Copiá un enlace completo o las coordenadas desde Google Maps.',true);};
 document.getElementById('nxgeo-gps').onclick=()=>{
  if(!navigator.geolocation){notice('Este navegador no permite geolocalización.',true);return;}
  notice('Solicitando permiso de ubicación…');
  navigator.geolocation.getCurrentPosition(x=>setCoords(x.coords.latitude,x.coords.longitude),e=>notice('No se pudo acceder al GPS: '+e.message,true),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 };
 document.getElementById('nxgeo-view').onclick=()=>{const c=coords();if(!c){notice('Ingresá coordenadas válidas.',true);return;}window.open('https://www.google.com/maps?q='+c.latitud+','+c.longitud,'_blank','noopener,noreferrer');};
 document.getElementById('nxgeo-cancel').onclick=()=>window.openScreenDetail(screenId);
 document.getElementById('nxgeo-save').onclick=async()=>{
  const c=coords();if(!c){notice('Coordenadas inválidas.',true);return;}
  const button=document.getElementById('nxgeo-save');button.disabled=true;notice('Guardando…');
  try{
   let request=sb.from('pantallas').update({latitud:c.latitud,longitud:c.longitud}).eq('id',screenId);
   if(!superUser())request=request.eq('empresa_id',currentCompany());
   const {data,error}=await request.select('id,latitud,longitud').maybeSingle();
   if(error)throw error;
   if(!data)throw new Error('No se actualizó ninguna pantalla. Revisá la empresa asociada y los permisos.');
   if(typeof loadPantallas==='function')await loadPantallas();
   notice('Ubicación guardada correctamente.');
   window.setTimeout(()=>window.openScreenDetail(screenId),650);
  }catch(err){console.error(err);notice('No se pudo guardar: '+(err?.message||err),true);}
  finally{button.disabled=false;}
 };
};
// En esta versión de pruebas, el Administrador sólo recibe editor geográfico.
// El Superadmin mantiene la edición técnica existente.
const previousEdit=window.openScreenEdit;
if(typeof previousEdit==='function'){
 window.openScreenEdit=function(screenId){
  if(superUser())return previousEdit(screenId);
  return window.openScreenGeo(screenId);
 };
}
const detail=window.openScreenDetail;
if(typeof detail==='function'){
 window.openScreenDetail=function(id){
  detail(id);
  if(!manager())return;
  const actions=document.querySelector('.screen-detail-actions');
  if(!actions)return;
  const technical=actions.querySelector('[data-screen-edit-btn]');
  if(technical && !superUser())technical.textContent='Editar ubicación GPS';
  if(actions.querySelector('#'+btnId) || !superUser())return;
  const b=document.createElement('button');b.id=btnId;b.className='btn btn-ghost btn-sm';b.textContent='Ubicación GPS / Maps';b.onclick=()=>window.openScreenGeo(id);
  actions.appendChild(b);
 };
}
})();