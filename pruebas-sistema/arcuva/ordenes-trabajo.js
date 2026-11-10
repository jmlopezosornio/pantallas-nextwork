/* Órdenes de trabajo: piloto Arcuva. Guardado con RLS; envíos iniciados por el usuario. */
(()=>{
 'use strict';
 const base=window.ArcuvaPortalBase;
 if(!base)return;
 const db=base.db,company='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
 const $=id=>document.getElementById(id);
 const esc=base.escapeHtml;
 let orders=[],loading=false,chosen=null,users=[],attachments=new Map();
 const storageBucket='ordenes-trabajo-arcuva';
 const mimeAllowed=new Set(['image/jpeg','image/png','image/webp','image/gif','application/pdf','video/mp4','video/quicktime','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
 const allowed=()=>{const p=base.getProfile();return p&&(p.es_superadmin===true||(p.empresa_id===company&&p.activo!==false));};
 const canWrite=()=>{const p=base.getProfile();return p&&(p.es_superadmin===true||(p.empresa_id===company&&['administrador','administrativo','operador'].includes(p.rol)));};
 const dateText=v=>v?base.dates(v):'A coordinar';
 const stamp=v=>v?new Date(v).toLocaleString('es-AR'):'—';
 const screenName=id=>base.getModel().screens.find(x=>x.id===id)?.nombre||'Pantalla no disponible';
 const screensOf=o=>(o.pantalla_ids?.length?o.pantalla_ids:(o.pantalla_id?[o.pantalla_id]:[]));
 const screenNames=o=>screensOf(o).map(screenName).join(', ')||'Sin pantallas';
 const localToday=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'});
 const getRequester=()=>base.getProfile()?.nombre||base.getProfile()?.email||'Usuario';
 const requestType=o=>({alta:'Alta',actualizacion:'Actualización',baja:'Baja'})[o.tipo_solicitud]||o.titulo||'Solicitud';
 const selectedScreens=()=>[...document.querySelectorAll('#otScreens input[type="checkbox"]:checked')].map(e=>e.value);
 const idText=o=>'OT-'+o.id.slice(0,8).toUpperCase();
 function message(text,err=false){const el=$('otMessage');if(el){el.textContent=text;el.className='ot-message '+(err?'ot-error':'ot-success');}}
 function resetForm(){
  $('otForm')?.reset();
  if($('otRequestDate'))$('otRequestDate').value=localToday();
  if($('otTechnician'))$('otTechnician').value=getRequester();
  document.querySelectorAll('#otScreens input[type="checkbox"]').forEach(x=>x.checked=false);
  chosen=null;
  const save=$('otSave');if(save)save.textContent='Guardar orden';
  const mail=$('otEmail');if(mail)mail.value='';
  if($('otFiles'))$('otFiles').value='';
  if($('otExistingFiles'))$('otExistingFiles').replaceChildren();
  updateFileSummary();
 }
 function updateScreens(){
  const container=$('otScreens');if(!container)return;
  const previous=new Set(selectedScreens());
  container.innerHTML=base.getModel().screens.filter(p=>p.empresa_id===company&&p.activo!==false)
    .map(p=>'<label class="ot-screen-checkbox"><input type="checkbox" value="'+esc(p.id)+'" '+(previous.has(p.id)?'checked':'')+'><span>'+esc(p.nombre)+'</span></label>').join('')||
    '<span class="ot-muted">No hay pantallas disponibles de Arcuva.</span>';
 }
 function updateUsers(){
  const select=$('otRecipient');if(!select)return;
  const previous=select.value;
  select.innerHTML='<option value="">Seleccionar usuario...</option>'+users.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.nombre||u.email)+' · '+esc(u.email||'')+'</option>').join('');
  if(users.some(u=>u.id===previous))select.value=previous;
  setRecipientContact();
 }
 function setRecipientContact(){
  const recipient=users.find(x=>x.id===$('otRecipient')?.value);
  $('otEmail').value=recipient?.email||'';
 }
 function detail(o){
  return [
   'ORDEN DE TRABAJO · ARCUVA / NEXTWORK',
   'N.º '+idText(o),
   'Fecha de solicitud: '+dateText(o.fecha_solicitud),
   'Pantallas: '+screenNames(o),
   'Trabajo solicitado: '+requestType(o),
   'Porcentaje de reproducción: '+(o.porcentaje_reproduccion||100)+'%',
   'Período: '+dateText(o.fecha_alta)+' al '+dateText(o.fecha_baja),
   'Solicitante: '+(o.tecnico||'No informado'),
   'Destinatario: '+(o.destinatario||'No informado'),
   '',
   'DESCRIPCIÓN DE LA TAREA',
   o.descripcion,
   '',
   'OBSERVACIONES',
   o.observaciones||'Sin observaciones',
   '',
   'Solicitamos confirmar recepción y coordinar la ejecución del trabajo.'
  ].join('\n');
 }
 function setSelected(o){
  chosen=o;
  const wanted=new Set(screensOf(o));
  document.querySelectorAll('#otScreens input[type="checkbox"]').forEach(input=>input.checked=wanted.has(input.value));
  const radio=document.querySelector('input[name="otType"][value="'+(o.tipo_solicitud||'alta')+'"]');
  if(radio)radio.checked=true;
  $('otPercent').value=String(o.porcentaje_reproduccion||100);
  $('otRequestDate').value=o.fecha_solicitud||localToday();
  $('otFrom').value=o.fecha_alta||'';
  $('otTo').value=o.fecha_baja||'';
  $('otDescription').value=o.descripcion||'';
  $('otTechnician').value=o.tecnico||getRequester();
  $('otRecipient').value=o.destinatario_usuario_id||'';
  setRecipientContact();
  $('otPhone').value=o.telefono_destino||'';
  $('otNotes').value=o.observaciones||'';
  $('otSave').textContent='Guardar modificaciones';
  showAttachments(o.id);
  message('Editando '+idText(o)+'. Los cambios se guardan antes de compartir.');
  document.getElementById('otForm')?.scrollIntoView({block:'start',behavior:'smooth'});
 }
 function render(){
  const box=$('otList');if(!box)return;
  if(!allowed()){box.innerHTML='<p>Acceso no autorizado.</p>';return;}
  box.innerHTML=orders.length?'<div class="ot-list-table-wrap"><table class="ot-list-table"><thead><tr>'+
   '<th>Orden</th><th>Solicitud</th><th>Pantallas</th><th>Trabajo</th><th>Reproducción</th><th>Estado</th><th>Acciones</th>'+
   '</tr></thead><tbody>'+orders.map(o=>'<tr>'+
   '<td><strong>'+esc(idText(o))+'</strong></td>'+
   '<td>'+esc(base.dates(o.fecha_solicitud||o.creada_en))+'</td>'+
   '<td>'+esc(screenNames(o))+'</td>'+
   '<td><strong>'+esc(requestType(o))+'</strong></td>'+
   '<td>'+esc(o.porcentaje_reproduccion||100)+'%</td>'+
   '<td><span class="ot-status">'+esc(o.estado)+'</span></td>'+
   '<td><div class="ot-actions"><button type="button" data-ot="preview" data-id="'+esc(o.id)+'">Ver</button>'+
   (canWrite()?'<button type="button" data-ot="edit" data-id="'+esc(o.id)+'">Editar</button>':'')+
   '<button type="button" data-ot="files" data-id="'+esc(o.id)+'">Adjuntos ('+esc((attachments.get(o.id)||[]).length)+')</button>'+
   '<button type="button" data-ot="whatsapp" data-id="'+esc(o.id)+'">WhatsApp</button>'+
   (canWrite()&&o.estado==='borrador'?'<button type="button" data-ot="sent" data-id="'+esc(o.id)+'">Marcar enviada</button>':'')+
   '</div></td></tr>').join('')+'</tbody></table></div>':
   '<div class="ot-empty">Todavía no hay órdenes de trabajo registradas. Completá el formulario para crear la primera.</div>';
  box.querySelectorAll('[data-ot]').forEach(b=>b.addEventListener('click',()=>{
   const o=orders.find(x=>x.id===b.dataset.id);if(!o)return;
   const action=b.dataset.ot;
   if(action==='preview')preview(o);
   else if(action==='edit')setSelected(o);
   else if(action==='files')preview(o);
   else if(action==='whatsapp')shareWhatsApp(o);
   else if(action==='sent')markSent(o);
  }));
 }
 async function load(){
  if(!allowed()||loading)return;
  loading=true;
  try{
   const [{data,error},{data:usersData,error:userError}]=await Promise.all([
    db.from('ordenes_trabajo')
     .select('id,empresa_id,pantalla_id,pantalla_ids,creada_en,fecha_solicitud,fecha_alta,fecha_baja,tipo_solicitud,porcentaje_reproduccion,destinatario_usuario_id,titulo,descripcion,ubicacion,tecnico,destinatario,email_destino,telefono_destino,estado,observaciones')
     .eq('empresa_id',company).order('creada_en',{ascending:false}).limit(200),
    db.rpc('arcuva_destinatarios_ordenes_trabajo')
   ]);
   if(error)throw error;
   if(userError)throw new Error('No se pudieron consultar los usuarios de Arcuva: '+userError.message);
   orders=data||[];users=usersData||[];
   await loadAttachments();
   updateScreens();updateUsers();
   if(chosen)showAttachments(chosen.id);
   if(!chosen){$('otTechnician').value=getRequester();$('otRequestDate').value=localToday();}
   render();
  }catch(e){message('No se pudieron cargar las órdenes: '+e.message,true);}
  finally{loading=false;}
 }
 async function save(ev){
  ev?.preventDefault();
  const button=$('otSave');
  if(button?.disabled)return;
  const invalid=(reason,field)=>{
    message(reason,true);
    if(field)$(field)?.focus();
    return false;
  };
  if(!canWrite())return invalid('Tu usuario no tiene permisos para crear órdenes. Verificá tu acceso a Arcuva.');
  if(!base.getProfile())return invalid('No hay una sesión activa. Volvé a ingresar al sistema.');
  try{
    const ids=selectedScreens();
    const description=$('otDescription')?.value.trim()||'';
    const tipo=document.querySelector('input[name="otType"]:checked')?.value||'';
    const porcentaje=Number($('otPercent')?.value);
    const destinatarioId=$('otRecipient')?.value||'';
    const recipient=users.find(x=>x.id===destinatarioId);
    const alta=$('otFrom')?.value||null,baja=$('otTo')?.value||null;
    const phone=$('otPhone')?.value.trim()||'';
    if(!ids.length)return invalid('Seleccioná una o varias pantallas antes de guardar.','otSelectAll');
    if(!['alta','actualizacion','baja'].includes(tipo))return invalid('Elegí Alta, Actualización o Baja.');
    if(![25,50,75,100,150].includes(porcentaje))return invalid('Elegí un porcentaje de reproducción válido.','otPercent');
    if(!description||description.length<5)return invalid('Ingresá una descripción de la tarea de al menos 5 caracteres.','otDescription');
    if(!recipient)return invalid('Seleccioná un destinatario del listado de usuarios de Arcuva o el superadministrador.','otRecipient');
    if(alta&&baja&&baja<alta)return invalid('La fecha de baja no puede ser anterior a la fecha de alta.','otTo');
    if(phone&&phone.replace(/\D/g,'').length<10)return invalid('El WhatsApp debe incluir código de país y área, o quedar vacío.','otPhone');
    const files=Array.from($('otFiles')?.files||[]);
    const existing=chosen?(attachments.get(chosen.id)||[]).length:0;
    if(files.length+existing>5)return invalid('Una orden admite hasta 5 adjuntos.','otFiles');
    for(const file of files){
      if(!mimeAllowed.has(file.type))return invalid('Tipo de archivo no permitido: '+file.name,'otFiles');
      if(file.size<1||file.size>20*1024*1024)return invalid('El archivo '+file.name+' debe tener entre 1 byte y 20 MB.','otFiles');
    }
    const payload={
      empresa_id:company,pantalla_ids:ids,pantalla_id:ids[0],
      tipo_solicitud:tipo,porcentaje_reproduccion:porcentaje,
      fecha_alta:alta,fecha_baja:baja,
      titulo:({alta:'Alta de campaña',actualizacion:'Actualización de campaña',baja:'Baja de campaña'})[tipo],
      descripcion:description,prioridad:'normal',
      tecnico:chosen?.tecnico||getRequester(),
      destinatario_usuario_id:destinatarioId,
      destinatario:recipient.nombre||recipient.email,
      email_destino:recipient.email||null,telefono_destino:phone||null,
      observaciones:$('otNotes')?.value.trim()||null
    };
    button.disabled=true;
    button.textContent='Guardando…';
    message('Guardando orden de trabajo en NextWork…');
    const result=chosen
      ?await db.from('ordenes_trabajo').update(payload).eq('id',chosen.id).eq('empresa_id',company).select('id').single()
      :await db.from('ordenes_trabajo').insert({...payload,fecha_solicitud:localToday()}).select('id').single();
    if(result.error)throw result.error;
    if(!result.data?.id)throw Error('El servidor no confirmó el guardado de la orden.');
    const number='OT-'+result.data.id.slice(0,8).toUpperCase();
    let failed=[];
    if(files.length){
      for(let i=0;i<files.length;i++){
        message('Orden '+number+' guardada. Cargando adjunto '+(i+1)+' de '+files.length+'…');
        try{await uploadAttachment(result.data.id,files[i]);}
        catch(e){failed.push(files[i].name+': '+(e?.message||e));}
      }
    }
    if(failed.length){
      chosen={...payload,id:result.data.id};
      await load();
      message(number+' guardada, pero hubo adjuntos sin cargar: '+failed.join(' / ')+'. Conservá los archivos originales y volvé a adjuntarlos desde Editar.',true);
    }else{
      resetForm();await load();
      message(number+' guardada correctamente'+(files.length?' con '+files.length+' adjunto(s)':'')+'. Podés compartirla por WhatsApp desde el historial.');
    }
  }catch(error){
    console.error('Error al guardar orden de trabajo:',error);
    const detail=error?.message||String(error);
    message('No se pudo guardar la orden: '+detail,true);
  }finally{
    if(button){button.disabled=false;button.textContent=chosen?'Guardar modificaciones':'Guardar orden';}
  }
 }
 async function markSent(o){
  if(!canWrite())return;
  if(!confirm('¿Confirmás que efectivamente enviaste '+idText(o)+' por correo o WhatsApp?'))return;
  const {error}=await db.from('ordenes_trabajo').update({estado:'enviada'}).eq('id',o.id).eq('empresa_id',company);
  if(error)return message('No se pudo actualizar el estado: '+error.message,true);
  await load();message('Orden marcada como enviada según tu confirmación.');
 }
 async function loadAttachments(){
  const ids=orders.map(o=>o.id);
  attachments=new Map(ids.map(id=>[id,[]]));
  if(!ids.length)return;
  const {data,error}=await db.from('ordenes_trabajo_adjuntos')
    .select('id,orden_id,nombre_archivo,ruta_storage,mime_type,tamano_bytes,creado_en')
    .in('orden_id',ids).order('creado_en',{ascending:true});
  if(error)throw new Error('No se pudieron consultar los adjuntos: '+error.message);
  for(const item of data||[])attachments.get(item.orden_id)?.push(item);
 }
 function updateFileSummary(){
  const files=[...($('otFiles')?.files||[])],el=$('otFileSummary');
  if(!el)return;
  el.textContent=files.length?files.length+' archivo(s) seleccionado(s): '+files.map(f=>f.name+' ('+(f.size/1024/1024).toFixed(1)+' MB)').join(', '):'';
 }
 async function uploadAttachment(orderId,file){
  const safeExtension=(file.name.split('.').pop()||'dat').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8);
  const path=orderId+'/'+crypto.randomUUID()+'.'+safeExtension;
  const {error:uploadError}=await db.storage.from(storageBucket)
   .upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
  if(uploadError)throw uploadError;
  const {error:metadataError}=await db.from('ordenes_trabajo_adjuntos').insert({
   orden_id:orderId,nombre_archivo:file.name.slice(0,255),ruta_storage:path,
   mime_type:file.type,tamano_bytes:file.size
  });
  if(metadataError)throw new Error('El archivo se cargó, pero no se pudo registrar: '+metadataError.message);
 }
 async function signedFile(item,ttl=3600){
  const {data,error}=await db.storage.from(storageBucket).createSignedUrl(item.ruta_storage,ttl);
  if(error||!data?.signedUrl)throw new Error('No se pudo generar el enlace de '+item.nombre_archivo+': '+(error?.message||'sin URL'));
  return data.signedUrl;
 }
 async function openAttachment(item){
  const popup=window.open('','_blank');
  if(!popup)return message('Permití las ventanas emergentes para abrir el archivo.',true);
  popup.opener=null;
  try{popup.location.replace(await signedFile(item));}
  catch(error){popup.close();message(error.message,true);}
 }
 function attachmentsMarkup(o){
  const items=attachments.get(o.id)||[];
  return items.length?'<div class="ot-file-list">'+items.map(a=>
    '<div class="ot-file-row"><span>'+esc(a.nombre_archivo)+' · '+(a.tamano_bytes/1024/1024).toFixed(1)+' MB</span>'+
    '<button type="button" data-ot-file="'+esc(a.id)+'">Abrir / descargar</button></div>').join('')+'</div>':
    '<p class="ot-muted">Esta orden no tiene archivos adjuntos.</p>';
 }
 function bindAttachments(root,o){
  root.querySelectorAll('[data-ot-file]').forEach(btn=>btn.addEventListener('click',()=>{
    const item=(attachments.get(o.id)||[]).find(x=>x.id===btn.dataset.otFile);
    if(item)openAttachment(item);
  }));
 }
 function showAttachments(orderId){
  const root=$('otExistingFiles');if(!root)return;
  const o=orders.find(x=>x.id===orderId);
  root.innerHTML=o?'<strong>Archivos guardados</strong>'+attachmentsMarkup(o):'';
  if(o)bindAttachments(root,o);
 }
 async function shareWhatsApp(o){
  const popup=window.open('','_blank');
  if(!popup)return message('Habilitá las ventanas emergentes para compartir por WhatsApp.',true);
  popup.opener=null;
  try{
    const attached=attachments.get(o.id)||[];
    message('Preparando WhatsApp y enlaces de los adjuntos…');
    const urls=await Promise.all(attached.map(async a=>a.nombre_archivo+': '+await signedFile(a,7*24*60*60)));
    const fullMessage=detail(o)+(urls.length?'\n\nARCHIVOS ADJUNTOS (enlaces válidos 7 días)\n'+urls.join('\n'):'');
    const number=(o.telefono_destino||'').replace(/\D/g,'');
    const target=number.length>=10&&number.length<=15?'https://wa.me/'+number+'?text='+encodeURIComponent(fullMessage):
      'https://api.whatsapp.com/send?text='+encodeURIComponent(fullMessage);
    popup.location.replace(target);
    message('Se abrió WhatsApp con la orden y '+attached.length+' enlace(s). Confirmá el envío allí.');
  }catch(error){
    popup.close();message('No se pudo preparar el mensaje: '+(error?.message||error),true);
  }
 }
 function preview(o){
  const container=$('otPreview');if(!container)return;
  container.innerHTML='<div class="ot-preview-overlay"><div class="ot-preview-card">'+
   '<div class="ot-preview-heading"><h3>Orden '+esc(idText(o))+'</h3><button type="button" id="otPreviewClose" class="secondary">Cerrar</button></div>'+
   '<pre>'+esc(detail(o))+'</pre>'+attachmentsMarkup(o)+
   '<div class="ot-actions"><button type="button" id="otPrint" class="primary">Imprimir / PDF</button>'+
   '<button type="button" id="otPreviewWa" class="secondary">Enviar por WhatsApp</button></div>'+
   '</div></div>';
  $('otPreviewClose').addEventListener('click',()=>container.replaceChildren());
  bindAttachments(container,o);
  $('otPreviewWa').addEventListener('click',()=>shareWhatsApp(o));
  $('otPrint').addEventListener('click',()=>printOrder(o));
 }
 function printOrder(o){
  const win=window.open('','_blank','width=840,height=700');
  if(!win){message('Habilitá ventanas emergentes para imprimir o guardar como PDF.',true);return;}
  const content=esc(detail(o));
  win.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+esc(idText(o))+'</title><style>body{font:15px/1.65 Arial,sans-serif;padding:38px;color:#17365b}pre{white-space:pre-wrap;font:inherit}h1{border-bottom:3px solid #17365b;padding-bottom:14px}</style></head><body><h1>ARCUVA · NEXTWORK</h1><pre>'+content+'</pre></body></html>');
  win.document.close();win.focus();win.print();
 }
 $('otForm')?.addEventListener('submit',save);
 $('otReset')?.addEventListener('click',()=>{resetForm();message('Formulario limpio.');});
 $('otRefresh')?.addEventListener('click',load);
 $('otRecipient')?.addEventListener('change',setRecipientContact);
 $('otFiles')?.addEventListener('change',updateFileSummary);
 $('otSelectAll')?.addEventListener('click',()=>document.querySelectorAll('#otScreens input[type="checkbox"]').forEach(x=>x.checked=true));
 $('otSelectNone')?.addEventListener('click',()=>document.querySelectorAll('#otScreens input[type="checkbox"]').forEach(x=>x.checked=false));
 window.addEventListener('arcuva-page-ordenes',load);
 window.addEventListener('arcuva-data-loaded',()=>{
  if(!$('page-ordenes')?.classList.contains('hidden'))updateScreens();
 });
 window.ArcuvaOrders=Object.freeze({load});
})();