/* Arcuva · certificación fotográfica de órdenes (móvil y escritorio).
   Evidencia separada del estado operativo de la orden. */
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;
if(!base)return;
const db=base.db, esc=base.escapeHtml;
const COMPANY='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
const BUCKET='certificaciones-arcuva';
const $=id=>document.getElementById(id);
let activeOrder=null, selectedFile=null, photoPreviewUrl=null, busy=false;
const orderNumber=o=>'OT-'+String(o.id).slice(0,8).toUpperCase();
function canCertify(o){
 const p=base.getProfile();
 return !!p&&(p.es_superadmin===true||(p.empresa_id===COMPANY&&p.activo!==false&&
 (p.rol==='administrador'||(['operador','administrativo'].includes(p.rol)&&o.destinatario_usuario_id===p.id))));
}
function reportError(e){return e?.message||String(e);}
function setStatus(message,isError=false){
 const el=$('certStatus');if(!el)return;
 el.textContent=message;el.style.color=isError?'#bc293c':'#25634a';
}
function close(){
 if(busy)return;
 if(photoPreviewUrl)URL.revokeObjectURL(photoPreviewUrl);
 photoPreviewUrl=null;selectedFile=null;activeOrder=null;
 $('certArcuvaOverlay')?.remove();
}
function renderOverlay(o){
 const existing=$('certArcuvaOverlay');if(existing)existing.remove();
 const overlay=document.createElement('div');
 overlay.id='certArcuvaOverlay';overlay.className='cert-arcuva-overlay';
 const editable=canCertify(o);
 overlay.innerHTML='<section class="cert-arcuva-dialog" role="dialog" aria-modal="true" aria-labelledby="certArcuvaTitle">'+
  '<div class="cert-arcuva-heading"><div><span>ARCUVA · CONSTANCIA FOTOGRÁFICA</span><h2 id="certArcuvaTitle">'+esc(orderNumber(o))+'</h2>'+
  '<p>'+esc(o.cliente_nombre||'Sin cliente registrado')+' · '+esc(o.titulo||'Orden de trabajo')+'</p></div>'+
  '<button type="button" id="certClose" class="secondary">Cerrar</button></div>'+
  (editable?'<div class="cert-arcuva-capture">'+
  '<p><strong>1. Sacá una foto de la publicidad instalada</strong></p>'+
  '<div class="cert-arcuva-buttons"><label class="cert-arcuva-button cert-primary">📷 Sacar foto <input id="certCamera" type="file" accept="image/*" capture="environment" hidden></label>'+
  '<label class="cert-arcuva-button">Elegir foto <input id="certGallery" type="file" accept="image/*" hidden></label></div>'+
  '<div id="certSelectedImage"></div>'+
  '<label for="certNotes">Observación (opcional)</label><textarea id="certNotes" rows="2" maxlength="500" placeholder="Ej.: publicidad instalada y verificada"></textarea>'+
  '<button id="certUpload" type="button" disabled class="primary">2. Guardar certificación con fecha y hora</button>'+
  '<p class="cert-arcuva-help">La fecha y hora las registra NextWork al guardar. Esta acción no cambia el estado de la orden.</p>'+
  '</div>':'<p class="cert-arcuva-help">Acceso de consulta: solo el destinatario de la orden o un administrador puede cargar fotos.</p>')+
  '<div id="certStatus" role="status" aria-live="polite"></div>'+
  '<div class="cert-arcuva-history"><h3>Fotos certificadas</h3><div id="certHistory">Cargando historial…</div><div id="certImagePreview"></div></div>'+
  '</section>';
 document.body.appendChild(overlay);
 overlay.querySelector('#certClose').addEventListener('click',close);
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 overlay.querySelector('#certCamera')?.addEventListener('change',e=>setPhoto(e.target.files?.[0]));
 overlay.querySelector('#certGallery')?.addEventListener('change',e=>setPhoto(e.target.files?.[0]));
 overlay.querySelector('#certUpload')?.addEventListener('click',upload);
}
function setPhoto(file){
 if(photoPreviewUrl)URL.revokeObjectURL(photoPreviewUrl);
 photoPreviewUrl=null;selectedFile=null;
 const container=$('certSelectedImage'),button=$('certUpload');
 if(button)button.disabled=true;
 if(container)container.replaceChildren();
 if(!file)return;
 if(!file.type.startsWith('image/'))return setStatus('Seleccioná una fotografía válida.',true);
 if(file.size>30*1024*1024)return setStatus('La foto original supera los 30 MB. Elegí una imagen más pequeña.',true);
 selectedFile=file;
 photoPreviewUrl=URL.createObjectURL(file);
 const img=document.createElement('img');img.src=photoPreviewUrl;img.alt='Fotografía seleccionada para certificar';
 img.className='cert-arcuva-preview';
 container?.appendChild(img);
 if(button)button.disabled=false;
 setStatus('Foto seleccionada. Presioná Guardar para certificar.');
}
async function toJpeg(file){
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('No se pudo abrir la foto. Usá JPG o PNG.'));});
  const max=1800,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.83));
  if(!blob||blob.size>8*1024*1024)throw new Error('No se pudo preparar la imagen para subirla (máximo 8 MB).');
  return blob;
 }finally{URL.revokeObjectURL(url);}
}
async function upload(){
 if(busy||!activeOrder||!selectedFile||!canCertify(activeOrder))return;
 const profile=base.getProfile();
 const button=$('certUpload');busy=true;if(button)button.disabled=true;
 try{
  setStatus('Preparando y subiendo la foto…');
  const blob=await toJpeg(selectedFile);
  const id=crypto.randomUUID();
  const path=activeOrder.id+'/'+profile.id+'/'+id+'.jpg';
  const saved=await db.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',cacheControl:'3600',upsert:false});
  if(saved.error)throw saved.error;
  const {error}=await db.from('certificaciones_publicidad_arcuva').insert({
   orden_id:activeOrder.id,usuario_id:profile.id,foto_path:path,
   observacion:$('certNotes')?.value.trim()||null
  });
  if(error)throw new Error('La foto se subió pero no pudo asociarse a la orden. '+error.message);
  setStatus('Certificación guardada correctamente con fecha y hora del servidor.');
  selectedFile=null;
  if(photoPreviewUrl)URL.revokeObjectURL(photoPreviewUrl);
  photoPreviewUrl=null;$('certSelectedImage')?.replaceChildren();
  if($('certNotes'))$('certNotes').value='';
  for(const id of ['certCamera','certGallery'])if($(id))$(id).value='';
  await loadHistory();
  window.dispatchEvent(new Event('arcuva-certificacion-guardada'));
 }catch(e){setStatus('No se pudo guardar la certificación: '+reportError(e),true);}
 finally{busy=false;if(button)button.disabled=!selectedFile;}
}
async function showPhoto(path){
 const preview=$('certImagePreview');if(!preview)return;
 preview.textContent='Cargando foto…';
 const {data,error}=await db.storage.from(BUCKET).createSignedUrl(path,120);
 if(error||!data?.signedUrl){preview.textContent='No se pudo abrir la fotografía: '+reportError(error);return;}
 preview.replaceChildren();
 const image=document.createElement('img');image.src=data.signedUrl;image.alt='Fotografía de certificación';
 image.className='cert-arcuva-preview';preview.appendChild(image);
}
async function loadHistory(){
 const box=$('certHistory');if(!box||!activeOrder)return;
 const orderId=activeOrder.id;
 const {data,error}=await db.from('certificaciones_publicidad_arcuva')
 .select('id,orden_id,usuario_id,foto_path,certificada_en,observacion')
 .eq('orden_id',orderId).order('certificada_en',{ascending:false});
 if(!activeOrder||activeOrder.id!==orderId)return;
 if(error){box.textContent='No se pudo consultar el historial: '+reportError(error);return;}
 box.replaceChildren();
 if(!data?.length){box.textContent='Todavía no hay fotos certificadas para esta orden.';return;}
 for(const c of data){
  const item=document.createElement('div');item.className='cert-arcuva-history-row';
  const info=document.createElement('div');const title=document.createElement('strong');
  title.textContent=new Date(c.certificada_en).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'medium'});
  const note=document.createElement('small');note.textContent=c.observacion||'Evidencia fotográfica registrada';
  info.append(title,note);
  const btn=document.createElement('button');btn.type='button';btn.className='secondary';
  btn.textContent='Ver foto';btn.addEventListener('click',()=>showPhoto(c.foto_path));
  item.append(info,btn);box.appendChild(item);
 }
}
async function open(orderId){
 if(!base.getProfile())return;
 try{
  const {data,error}=await db.from('ordenes_trabajo')
    .select('id,empresa_id,cliente_nombre,titulo,destinatario_usuario_id')
    .eq('id',orderId).eq('empresa_id',COMPANY).single();
  if(error||!data)throw error||new Error('Orden no encontrada');
  activeOrder=data;selectedFile=null;busy=false;
  renderOverlay(data);await loadHistory();
 }catch(e){alert('No se pudo abrir la certificación: '+reportError(e));}
}
let deepLinkStarted=false;
async function openOrderFromLink(){
 if(deepLinkStarted||!base.getProfile())return;
 const id=new URLSearchParams(window.location.search).get('orden')||'';
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id))return;
 deepLinkStarted=true;
 document.querySelector('.nav[data-page="ordenes"]')?.click();
 // Evita abrir la misma certificación en cada actualización del portal.
 await open(id);
 const url=new URL(window.location.href);url.searchParams.delete('orden');
 window.history.replaceState(null,'',url.pathname+url.search+url.hash);
}
window.addEventListener('arcuva-data-loaded',openOrderFromLink);
window.ArcuvaCertificaciones=Object.freeze({open,canCertify});
})();