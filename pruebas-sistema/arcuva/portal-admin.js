// Arcuva: gestión de clientes y campañas dentro de su empresa.
// Las políticas RLS en Supabase determinan quién puede escribir; no hay service-role.
// La creación de campañas comienza PAUSADA, y no se hace publicación automática en VNNOX.
(()=>{
  'use strict';
  const COMPANY_ID='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
  const base=window.ArcuvaPortalBase;
  if(!base)return;
  const {db,escapeHtml:esc,dates,empty}=base;
  const $=id=>document.getElementById(id);
  let groups=[],clients=[],memberships=[],groupScreens=[],scopeIds=new Set(),canEdit=false,validGroup='',pending=false,currentDialog='',revision=0;
  let snapshotCampaigns=[];
  const allowedPercentages=new Set([25,50,75,100,150]);
  function localDay(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
  const urlValid=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!!u.hostname;}catch{return false;}};
  const htmlAttr=esc;
  const eName=record=>String(record?.nombre||'');
  function groupForScreen(screenId){
    const ids=new Set(groups.filter(g=>g.empresa_id===COMPANY_ID&&g.activo).map(g=>g.id));
    return groupScreens.find(l=>l.pantalla_id===screenId&&ids.has(l.grupo_id))?.grupo_id||'';
  }
  function getActiveScreens(){
    return base.getModel().screens.filter(s=>s.empresa_id===COMPANY_ID&&s.activo===true);
  }
  function groupWritable(groupId){
    const user=base.getProfile();
    if(!user||!groups.some(g=>g.id===groupId&&g.empresa_id===COMPANY_ID&&g.activo))return false;
    if(user.es_superadmin===true)return true;
    if(user.empresa_id!==COMPANY_ID)return false;
    if(user.rol==='administrador')return true;
    return memberships.some(m=>m.grupo_id===groupId&&['operador','administrador'].includes(m.rol_grupo));
  }
  function banner(message,ok=false){
    const box=$('roleInfo');
    if(!box)return;
    box.className='message '+(ok?'role-writer':'note-role');
    box.textContent=message;
  }
  function renderActions(){
    const current=base.getProfile();
    canEdit=!!current&&!!validGroup&&groupWritable(validGroup);
    const btnC=$('addCampaignBtn'),btnClient=$('addClientBtn');
    if(btnC)btnC.classList.toggle('hidden',!canEdit||!getActiveScreens().length);
    if(btnClient)btnClient.classList.toggle('hidden',!canEdit);
    if(!current)banner('Iniciá sesión para consultar los datos de Arcuva.');
    else if(!validGroup)banner('Arcuva no tiene un grupo técnico accesible para este usuario. No es posible modificar campañas.');
    else if(canEdit)banner('Edición habilitada para Arcuva. Atención: esta versión utiliza la base real; las campañas nuevas quedan pausadas y los cambios no se sincronizan automáticamente con Taurus.',true);
    else banner('Acceso de consulta. Para editar campañas y clientes, el superadministrador debe asignar el rol Operador o Administrador en Arcuva.');
  }
  function renderClientTable(){
    if(!base.getProfile())return;
    const panel=$('clientTable');
    const sorted=clients.slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
    if(!sorted.length){panel.innerHTML=empty('Todavía no hay clientes visibles de Arcuva.');return;}
    const rows=sorted.map(c=>{
      const count=snapshotCampaigns.filter(x=>x.cliente_id===c.id).length;
      const action=canEdit&&groupWritable(c.grupo_id)
        ?'<button type="button" class="secondary small-btn" data-edit-client="'+esc(c.id)+'">Editar</button>'
        :'<span class="tiny">Solo consulta</span>';
      return '<tr><td><strong>'+esc(c.nombre)+'</strong></td><td>'+esc(c.email||'—')+'</td><td>'+esc(c.telefono||'—')+'</td><td>'+count+'</td><td>'+action+'</td></tr>';
    });
    panel.innerHTML=table(['Cliente','Email','Teléfono','Campañas','Acción'],rows);
    panel.querySelectorAll('[data-edit-client]').forEach(btn=>btn.addEventListener('click',()=>openClient(btn.dataset.editClient)));
  }
  function renderCampaignTable(){
    if(!base.getProfile())return;
    const filtered=base.getModel().campaigns.filter(c=>{
      const text=String(c.campania||'')+' '+String(c.cliente||'');
      return text.toLocaleLowerCase('es').includes(($('campaignSearch').value||'').trim().toLocaleLowerCase('es'));
    });
    const panel=$('campaignTable');
    if(!filtered.length){panel.innerHTML=empty('No hay campañas visibles que coincidan con el filtro.');return;}
    const rows=filtered.map(c=>{
      const raw=snapshotCampaigns.find(x=>x.id===c.id);
      const groupId=raw?.grupo_id||'';
      const authorized=canEdit&&groupWritable(groupId);
      const button=authorized
        ?'<div class="action-group"><button type="button" class="secondary small-btn" data-edit-campaign="'+esc(c.id)+'">Editar</button><button type="button" class="secondary small-btn" data-pause-campaign="'+esc(c.id)+'">'+(raw?.pausada?'Reactivar':'Pausar')+'</button></div>'
        :'<span class="tiny">Solo consulta</span>';
      const state=raw?.pausada?'Pausada':(c.estado||'Activa');
      return '<tr><td><strong>'+esc(c.campania)+'</strong><span class="tiny">'+esc(c.tipo_contenido||'')+'</span></td><td>'+esc(c.cliente)+'</td><td>'+dates(c.fecha_desde)+' – '+dates(c.fecha_hasta)+'</td><td>'+esc((c.pantallas||[]).join(', '))+'</td><td>'+esc(c.porcentaje)+'%</td><td>'+esc(state)+'</td><td>'+button+'</td></tr>';
    });
    panel.innerHTML=table(['Campaña','Cliente','Vigencia','Pantallas','Participación','Estado','Acciones'],rows);
    panel.querySelectorAll('[data-edit-campaign]').forEach(btn=>btn.addEventListener('click',()=>openCampaign(btn.dataset.editCampaign)));
    panel.querySelectorAll('[data-pause-campaign]').forEach(btn=>btn.addEventListener('click',()=>toggleCampaignPause(btn.dataset.pauseCampaign)));
  }
  function table(columns,rows){
    return '<div class="scroll"><table><thead><tr>'+columns.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
  }
  function renderCounts(){
    const count = $('numClients');
    if(count) count.textContent=String(clients.length);
  }
  async function refresh(){
    const stamp=++revision;
    const user=base.getProfile();
    if(!user){reset();return;}
    const screens=getActiveScreens();
    const screenIds=screens.map(p=>p.id);
    const queries=[
      db.from('grupos').select('id,nombre,empresa_id,activo').eq('empresa_id',COMPANY_ID).eq('activo',true),
      db.from('usuarios_grupos').select('grupo_id,rol_grupo').eq('usuario_id',user.id),
      db.from('grupos_pantallas').select('grupo_id,pantalla_id').in('pantalla_id',screenIds.length?screenIds:['00000000-0000-0000-0000-000000000000'])
    ];
    const [gr,ug,gp]=await Promise.all(queries);
    if(stamp!==revision||!base.getProfile())return;
    if(gr.error||ug.error||gp.error){
      console.warn('Arcuva administración: grupos o permisos no disponibles',gr.error||ug.error||gp.error);
      groups=[];memberships=[];groupScreens=[];validGroup='';canEdit=false;clients=[];snapshotCampaigns=[];
      renderActions();renderClientTable();renderCampaignTable();return;
    }
    groups=(gr.data||[]).filter(g=>g.empresa_id===COMPANY_ID&&g.activo);
    memberships=ug.data||[];
    groupScreens=(gp.data||[]).filter(r=>screenIds.includes(r.pantalla_id));
    scopeIds=new Set(groups.map(g=>g.id));
    validGroup=groupForScreen(screenIds[0])||groups.find(g=>g.nombre==='Arcuva')?.id||groups[0]?.id||'';
    const qClients=db.from('clientes').select('id,nombre,grupo_id,cuit,tipo_factura,direccion,telefono,email').in('grupo_id',scopeIds.size?[...scopeIds]:['00000000-0000-0000-0000-000000000000']).order('nombre');
    const ids=base.getModel().campaigns.map(c=>c.id);
    const qCampaigns=db.from('campanias').select('id,grupo_id,cliente_id,nombre,tipo_contenido,archivo_url,duracion_seg,fecha_desde,fecha_hasta,porcentaje,pausada,eliminada').in('id',ids.length?ids:['00000000-0000-0000-0000-000000000000']);
    const [cl,ca]=await Promise.all([qClients,qCampaigns]);
    if(stamp!==revision||!base.getProfile())return;
    if(cl.error||ca.error){
      console.warn('Arcuva administración: no se pudieron consultar clientes o campañas',cl.error||ca.error);
      clients=[];snapshotCampaigns=[];validGroup='';renderActions();renderClientTable();renderCampaignTable();return;
    }
    clients=(cl.data||[]).filter(c=>scopeIds.has(c.grupo_id));
    snapshotCampaigns=(ca.data||[]).filter(c=>scopeIds.has(c.grupo_id)&&c.eliminada!==true);
    renderActions();renderCounts();renderClientTable();renderCampaignTable();
  }
  function reset(){
    ++revision;groups=[];clients=[];memberships=[];groupScreens=[];scopeIds=new Set();snapshotCampaigns=[];validGroup='';canEdit=false;
    closeDialog();renderActions();
  }
  function closeDialog(){
    currentDialog='';pending=false;
    const root=$('adminModalRoot');if(root)root.innerHTML='';
  }
  function modal(title,content,saveHandler){
    const root=$('adminModalRoot');
    root.innerHTML='<div class="admin-backdrop" role="presentation"><div class="admin-dialog" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><div class="dialog-head"><h3>'+esc(title)+'</h3><button class="secondary" type="button" id="closeAdminDialog" aria-label="Cerrar">×</button></div>'
      +'<div class="message notice"><strong>Atención:</strong> este portal está conectado a la base real. Guardar datos produce cambios efectivos en Arcuva. Recursos Hídricos no se modifica.</div>'
      +'<form id="adminForm">'+content+'<div class="dialog-error hidden" id="adminError" role="alert"></div><div class="dialog-actions"><button type="button" class="secondary" id="cancelAdminDialog">Cancelar</button><button type="submit" class="primary" id="adminSaveBtn">Guardar</button></div></form></div></div>';
    $('closeAdminDialog').addEventListener('click',closeDialog);
    $('cancelAdminDialog').addEventListener('click',closeDialog);
    $('adminForm').addEventListener('submit',e=>{e.preventDefault();saveHandler();});
    root.querySelector('.admin-backdrop').addEventListener('click',e=>{if(e.target===root.querySelector('.admin-backdrop')&&!pending)closeDialog();});
  }
  function fail(message){
    const target=$('adminError');if(!target)return alert(message);
    target.textContent=String(message||'Error al guardar');target.classList.remove('hidden');
  }
  function saving(value){
    pending=value;
    const btn=$('adminSaveBtn');if(btn){btn.disabled=value;btn.textContent=value?'Guardando…':'Guardar';}
  }
  async function permission(groupId){
    const user=base.getProfile();
    if(!groupWritable(groupId)||!user)throw Error('Tu usuario no tiene permiso para editar en Arcuva.');
    // Revalidación antes de la escritura. RLS de Supabase es la autoridad definitiva.
    const {data:auth,error:authError}=await db.auth.getUser();
    if(authError||auth?.user?.id!==user.id)throw Error('La sesión ha vencido.');
    if(user.es_superadmin===true)return;
    const {data:roleRow,error:err}=await db.from('usuarios_grupos').select('rol_grupo').eq('usuario_id',user.id).eq('grupo_id',groupId).maybeSingle();
    if(user.rol==='administrador')return;
    if(err||!['operador','administrador'].includes(roleRow?.rol_grupo))throw Error('Tu permiso de edición ya no está activo.');
  }
  function openClient(id=''){
    if(!canEdit)return;
    const item=id?clients.find(c=>c.id===id):null;
    if(id&&!item)return;
    const groupId=item?.grupo_id||validGroup;
    if(!groupWritable(groupId))return alert('No tenés permiso de edición en este grupo.');
    currentDialog='client';
    modal(id?'Editar cliente':'Nuevo cliente','<div class="admin-grid">'
      +'<div class="admin-field full"><label for="clientName">Nombre comercial *</label><input id="clientName" name="clientName" maxlength="120" required value="'+htmlAttr(item?.nombre||'')+'"></div>'
      +'<div class="admin-field"><label for="clientCuit">CUIT</label><input id="clientCuit" maxlength="32" value="'+htmlAttr(item?.cuit||'')+'"></div>'
      +'<div class="admin-field"><label for="clientInvoice">Condición / Facturación</label><input id="clientInvoice" maxlength="60" value="'+htmlAttr(item?.tipo_factura||'')+'"></div>'
      +'<div class="admin-field"><label for="clientEmail">Email</label><input id="clientEmail" type="email" maxlength="150" value="'+htmlAttr(item?.email||'')+'"></div>'
      +'<div class="admin-field"><label for="clientPhone">Teléfono</label><input id="clientPhone" maxlength="60" value="'+htmlAttr(item?.telefono||'')+'"></div>'
      +'<div class="admin-field full"><label for="clientAddress">Dirección</label><input id="clientAddress" maxlength="220" value="'+htmlAttr(item?.direccion||'')+'"></div>'
      +'</div>',()=>saveClient(id,groupId));
  }
  async function saveClient(id,groupId){
    if(pending)return;
    const nombre=$('clientName').value.trim();
    if(!nombre){fail('Ingresá el nombre del cliente.');return;}
    if(nombre.length>120){fail('El nombre es demasiado largo.');return;}
    const payload={nombre,cuit:$('clientCuit').value.trim()||null,tipo_factura:$('clientInvoice').value.trim()||null,
      email:$('clientEmail').value.trim()||null,telefono:$('clientPhone').value.trim()||null,direccion:$('clientAddress').value.trim()||null};
    saving(true);
    try{
      await permission(groupId);
      if(id){
        const current=clients.find(c=>c.id===id&&c.grupo_id===groupId);
        if(!current)throw Error('El cliente ya no está dentro de Arcuva.');
        const {data,error}=await db.from('clientes').update(payload).eq('id',id).eq('grupo_id',groupId).select('id');
        if(error)throw error;
        if(data?.length!==1)throw Error('No se pudo confirmar la actualización del cliente.');
      }else{
        const {data,error}=await db.from('clientes').insert({...payload,grupo_id:groupId}).select('id');
        if(error)throw error;
        if(data?.length!==1)throw Error('No se pudo confirmar el alta del cliente.');
      }
      closeDialog();await base.reload();
    }catch(err){fail(err.message||'No se pudo guardar el cliente.');}
    finally{saving(false);}
  }
  function screenCheckboxes(selectedId=''){
    const list=getActiveScreens().filter(p=>groupForScreen(p.id)===validGroup);
    if(!list.length)return '<div class="empty">No hay pantallas autorizadas para Arcuva.</div>';
    return list.map(p=>'<label class="screen-checkbox"><input type="checkbox" class="campaign-screen" value="'+esc(p.id)+'" '+(selectedId===p.id?'checked':'')+'><span>'+esc(p.nombre)+'</span></label>').join('');
  }
  function clientOptions(selected=''){
    const own=clients.filter(c=>c.grupo_id===validGroup);
    return own.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===selected?'selected':'')+'>'+esc(c.nombre)+'</option>').join('');
  }
  function contentUI(type,oldPath=''){
    const out=$('campaignContentArea');
    if(!out)return;
    if(type==='web'){
      out.innerHTML='<div class="admin-field full"><label for="campaignUrl">Dirección de la página web *</label><input id="campaignUrl" type="url" placeholder="https://..." value="'+esc(oldPath)+'"></div>';
      $('mediaDuration').classList.remove('hidden');return;
    }
    const video=type==='video';
    out.innerHTML='<div class="admin-field full"><label for="campaignFile">'+(video?'Video MP4 (H.264 recomendado)':'Imagen JPG, PNG o WebP')+'</label><input id="campaignFile" type="file" accept="'+(video?'video/mp4,.mp4':'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp')+'"><small>'+(oldPath?'Contenido actual conservado si no seleccionás un archivo nuevo.':'Seleccioná un archivo compatible con la pantalla.')+'</small></div>';
    $('campaignFile').addEventListener('change',updateFileMetadata);
    $('mediaDuration').classList.toggle('hidden',video);
  }
  function getVideoDuration(file){
    return new Promise((resolve,reject)=>{
      const v=document.createElement('video'),url=URL.createObjectURL(file);
      const finish=(err,duration)=>{v.onloadedmetadata=null;v.onerror=null;URL.revokeObjectURL(url);v.removeAttribute('src');v.load();err?reject(err):resolve(duration);};
      v.preload='metadata';
      v.onloadedmetadata=()=>{const n=v.duration;finish(!Number.isFinite(n)||n<=0?Error('Duración de video inválida.'):null,n);};
      v.onerror=()=>finish(Error('No se pudo leer la duración del video.'));
      v.src=url;
    });
  }
  async function updateFileMetadata(){
    const file=$('campaignFile')?.files?.[0];
    const feedback=$('fileDetails');if(!feedback)return;
    feedback.textContent=file?'Archivo: '+file.name:'';
    if(file&&$('campaignType').value==='video'){
      try{
        const seconds=await getVideoDuration(file);
        if($('campaignFile')?.files?.[0]===file){
          $('campaignDuration').value=String(Math.round(seconds*100)/100);
          feedback.textContent='Video seleccionado · Duración: '+seconds.toFixed(2)+' segundos.';
        }
      }catch(err){feedback.textContent=err.message;}
    }
  }
  function openCampaign(id=''){
    if(!canEdit)return;
    const item=id?snapshotCampaigns.find(c=>c.id===id):null;
    if(id&&!item)return;
    if(item&&item.grupo_id!==validGroup)return alert('La campaña no pertenece al grupo autorizado de Arcuva.');
    if(!getActiveScreens().some(s=>groupForScreen(s.id)===validGroup))return alert('No hay pantallas habilitadas en Arcuva.');
    if(!clients.some(c=>c.grupo_id===validGroup))return alert('Primero creá un cliente en Arcuva.');
    currentDialog='campaign';
    const start=item?.fecha_desde||localDay(new Date());
    const ending=item?.fecha_hasta||localDay(new Date(Date.now()+30*86400000));
    const kind=item?.tipo_contenido||'video';
    const info=id
      ?'<div class="message note-role">La asignación a pantallas existente se conserva. Cambiar el contenido, el porcentaje o las fechas puede afectar SMA 01 cuando se publique una nueva programación.</div>'
      :'<div class="message notice"><strong>Seguridad:</strong> la campaña nueva se creará <b>pausada</b>. Después podrás activarla conscientemente desde el listado.</div>';
    const extra=id
      ?'<div class="admin-field full"><label>Pantallas vinculadas</label><div class="frozen-screens">'+esc((base.getModel().campaigns.find(c=>c.id===id)?.pantallas||[]).join(', '))+'</div></div>'
      :'<div class="admin-field full"><label>Pantallas de destino *</label><div class="screens-list">'+screenCheckboxes(getActiveScreens()[0]?.id)+'</div></div>';
    modal(id?'Editar campaña':'Nueva campaña',info+'<div class="admin-grid">'
      +'<div class="admin-field full"><label for="campaignName">Nombre de campaña *</label><input id="campaignName" required maxlength="150" value="'+esc(item?.nombre||'')+'"></div>'
      +'<div class="admin-field"><label for="campaignClient">Cliente *</label><select id="campaignClient" required>'+clientOptions(item?.cliente_id)+'</select></div>'
      +'<div class="admin-field"><label for="campaignType">Contenido *</label><select id="campaignType">'
      +['video','imagen','web'].map(x=>'<option value="'+x+'" '+(x===kind?'selected':'')+'>'+({video:'Video MP4',imagen:'Imagen',web:'Página web'})[x]+'</option>').join('')
      +'</select></div>'
      +'<div class="admin-field full" id="campaignContentArea"></div>'
      +'<div class="admin-field" id="mediaDuration"><label for="campaignDuration">Duración en segundos *</label><select id="campaignDuration">'
      +[5,10,15,20].map(n=>'<option value="'+n+'" '+(Number(item?.duracion_seg||10)===n?'selected':'')+'>'+n+' segundos</option>').join('')+'</select></div>'
      +'<div class="admin-field"><label for="campaignPercent">Participación *</label><select id="campaignPercent">'
      +[25,50,75,100,150].map(n=>'<option value="'+n+'" '+(Number(item?.porcentaje??100)===n?'selected':'')+'>'+n+'%</option>').join('')+'</select></div>'
      +'<div class="admin-field"><label for="campaignStart">Fecha desde *</label><input id="campaignStart" type="date" value="'+esc(start)+'" required></div>'
      +'<div class="admin-field"><label for="campaignEnd">Fecha hasta *</label><input id="campaignEnd" type="date" value="'+esc(ending)+'" required></div>'
      +extra+'<div class="admin-field full"><div id="fileDetails" class="tiny"></div></div>'
      +'</div>',()=>saveCampaign(id));
    const select=$('campaignType');
    select.addEventListener('change',()=>{
      // Nunca se hereda un archivo de un tipo anterior.
      const src=snapshotCampaigns.find(c=>c.id===id);
      contentUI(select.value,src?.tipo_contenido===select.value?src?.archivo_url||'':'');
      $('fileDetails').textContent='';
      if(select.value==='video'){
        const input=$('campaignDuration');
        input.outerHTML='<input type="number" id="campaignDuration" min="0.1" step="0.01" readonly value="'+(src?.tipo_contenido==='video'?esc(src.duracion_seg||''):'')+'">';
      }else{
        const cur=$('campaignDuration');
        cur.outerHTML='<select id="campaignDuration">'+[5,10,15,20].map(n=>'<option value="'+n+'" '+(Number(src?.duracion_seg||10)===n?'selected':'')+'>'+n+' segundos</option>').join('')+'</select>';
      }
    });
    select.dispatchEvent(new Event('change'));
    if(kind==='video'&&item)$('campaignDuration').value=String(item.duracion_seg||'');
    $('campaignClient').value=item?.cliente_id||clients.find(c=>c.grupo_id===validGroup)?.id||'';
  }
  function validateFile(file,type){
    const ext=file.name.split('.').pop()?.toLowerCase();
    const expected=type==='video'?['mp4']:['jpg','jpeg','png','webp'];
    if(!expected.includes(ext))throw Error('Tipo de archivo no permitido.');
    if(file.size<=0||file.size>200*1024*1024)throw Error('El archivo debe pesar entre 1 byte y 200 MB.');
    if(type==='video'&&!['video/mp4',''].includes(file.type))throw Error('El video debe ser MP4.');
    if(type==='imagen'&&!['image/jpeg','image/png','image/webp',''].includes(file.type))throw Error('Formato de imagen no permitido.');
  }
  async function mediaPath(type,clienteId){
    const file=$('campaignFile')?.files?.[0];
    if(!file)return '';
    validateFile(file,type);
    const ext=file.name.split('.').pop().toLowerCase();
    const path='campanias/'+clienteId+'/'+crypto.randomUUID()+'.'+ext;
    const {error:uploadError}=await db.storage.from('publicidades').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||(type==='video'?'video/mp4':'image/'+ext)});
    if(uploadError)throw uploadError;
    return path;
  }
  async function saveCampaign(id){
    if(pending)return;
    const existing=id?snapshotCampaigns.find(c=>c.id===id):null;
    if(id&&!existing)return fail('No se encontró la campaña original.');
    const clientId=$('campaignClient').value;
    const customer=clients.find(c=>c.id===clientId&&c.grupo_id===validGroup);
    const nombre=$('campaignName').value.trim(),type=$('campaignType').value;
    const desde=$('campaignStart').value,hasta=$('campaignEnd').value,percent=Number($('campaignPercent').value);
    if(!customer)return fail('Seleccioná un cliente propio de Arcuva.');
    if(!nombre||nombre.length>150)return fail('Ingresá un nombre válido.');
    if(!desde||!hasta||hasta<desde)return fail('Revisá el rango de fechas de la campaña.');
    if(!allowedPercentages.has(percent))return fail('La participación debe ser 25%, 50%, 75%, 100% o 150%.');
    const selectedScreenIds=id
      ?[]:[...document.querySelectorAll('.campaign-screen:checked')].map(x=>x.value);
    const permittedIds=getActiveScreens().filter(s=>groupForScreen(s.id)===validGroup).map(s=>s.id);
    if(!id&&(!selectedScreenIds.length||selectedScreenIds.some(s=>!permittedIds.includes(s))))return fail('Elegí una pantalla válida de Arcuva.');
    const file=$('campaignFile')?.files?.[0];
    let archivo='',duracion=Number($('campaignDuration').value);
    if(type==='web'){
      archivo=$('campaignUrl')?.value.trim()||'';
      if(!urlValid(archivo))return fail('Ingresá una dirección HTTP o HTTPS válida.');
    }else{
      const prior=existing?.tipo_contenido===type?existing.archivo_url:'';
      archivo=prior||'';
      if(!file&&!archivo)return fail('Seleccioná un archivo de contenido.');
      if(file)try{validateFile(file,type);}catch(err){return fail(err.message);}
    }
    if(type==='video'){
      if(!file)duracion=Number(existing?.tipo_contenido==='video'?existing.duracion_seg:0);
      if(!Number.isFinite(duracion)||duracion<=0||duracion>86400)return fail('No se pudo determinar la duración del video.');
    }else if(![5,10,15,20].includes(duracion))return fail('La duración admitida es 5, 10, 15 o 20 segundos.');
    const ok=window.confirm(id
      ?'Estás por modificar una campaña de Arcuva en la base real. Esto podría afectar SMA 01 cuando se publique. ¿Continuar?'
      :'Se creará una campaña PAUSADA de Arcuva en la base real. No se activará ni sincronizará automáticamente. ¿Continuar?');
    if(!ok)return;
    saving(true);
    try{
      await permission(validGroup);
      if(file){archivo=await mediaPath(type,clientId);}
      const payload={cliente_id:clientId,nombre,tipo_contenido:type,archivo_url:archivo,
        duracion_seg:duracion,fecha_desde:desde,fecha_hasta:hasta,porcentaje:percent};
      if(id){
        if(existing.grupo_id!==validGroup)throw Error('La campaña no pertenece al grupo de Arcuva.');
        const {data,error}=await db.from('campanias').update(payload).eq('id',id).eq('grupo_id',validGroup).select('id');
        if(error)throw error;
        if(data?.length!==1)throw Error('No se pudo confirmar la edición de campaña.');
      }else{
        const {data,error}=await db.from('campanias').insert({...payload,grupo_id:validGroup,pausada:true}).select('id');
        if(error)throw error;
        if(data?.length!==1)throw Error('No se pudo confirmar el alta de la campaña.');
        const newId=data[0].id;
        const {error:linkError}=await db.from('campanias_pantallas').insert(selectedScreenIds.map(pantalla_id=>({campania_id:newId,pantalla_id})));
        if(linkError){
          await db.from('campanias').update({eliminada:true,pausada:true}).eq('id',newId);
          throw Error('La campaña quedó pausada, pero no se pudieron vincular pantallas: '+linkError.message);
        }
      }
      closeDialog();await base.reload();
      alert('Campaña guardada. No se enviaron cambios a Taurus automáticamente.');
    }catch(err){fail(err.message||'No se pudo guardar la campaña.');}
    finally{saving(false);}
  }
  async function toggleCampaignPause(id){
    const raw=snapshotCampaigns.find(x=>x.id===id),visible=base.getModel().campaigns.find(x=>x.id===id);
    if(!raw||!visible||!canEdit||!groupWritable(raw.grupo_id))return;
    const newValue=!raw.pausada;
    if(!window.confirm(newValue
      ?'¿Pausar la campaña '+raw.nombre+'? La programación del Taurus podrá requerir una sincronización para reflejarlo.'
      :'¿Reactivar la campaña '+raw.nombre+'? Puede comenzar a reproducirse en SMA 01 cuando se sincronice.'))return;
    try{
      await permission(raw.grupo_id);
      const {data,error}=await db.from('campanias').update({pausada:newValue}).eq('id',id).eq('grupo_id',raw.grupo_id).select('id');
      if(error)throw error;
      if(data?.length!==1)throw Error('No se confirmó el cambio de estado.');
      await base.reload();
      alert('Estado guardado. La publicación en Taurus requiere sincronización; no se ha realizado en esta operación.');
    }catch(err){alert(err.message||'No se pudo cambiar el estado de la campaña.');}
  }
  $('addClientBtn').addEventListener('click',()=>openClient());
  $('addCampaignBtn').addEventListener('click',()=>openCampaign());
  $('campaignSearch').addEventListener('input',renderCampaignTable);
  window.ArcuvaAdminRefresh=refresh;
  window.ArcuvaAdminReset=reset;
})();