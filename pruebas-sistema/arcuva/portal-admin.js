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
  let campaignTab='vigentes';
  const today=()=>localDay(new Date());
  function statusForCampaign(c){
    const raw=snapshotCampaigns.find(x=>x.id===c.id);
    if(c.eliminada===true||raw?.eliminada===true)return 'eliminada';
    if(raw?.pausada===true||c.pausada===true)return 'pausadas';
    if(c.fecha_desde>today())return 'futuras';
    if(c.fecha_hasta<today())return 'pasadas';
    return 'vigentes';
  }
  function campaignMediaUrl(c){
    const path=snapshotCampaigns.find(x=>x.id===c.id)?.archivo_url||c.archivo_url||'';
    if(!path)return '';
    try{const u=new URL(path);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}
  }
  function renderCampaignTable(){
    if(!base.getProfile())return;
    const model=base.getModel(), screenFilter=$('campaignScreenFilter');
    if(screenFilter){
      const selected=screenFilter.value;
      screenFilter.innerHTML='<option value="">Todas las pantallas</option>'+model.screens.filter(p=>p.empresa_id===COMPANY_ID).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.nombre)+'</option>').join('');
      if([...screenFilter.options].some(o=>o.value===selected))screenFilter.value=selected;
    }
    const campaigns=model.campaigns.filter(c=>c.eliminada!==true&&snapshotCampaigns.some(x=>x.id===c.id&&x.eliminada!==true));
    const search=($('campaignSearch')?.value||'').trim().toLocaleLowerCase('es');
    const type=$('campaignTypeFilter')?.value||'',screen=screenFilter?.value||'';
    const searched=campaigns.filter(c=>{
      const text=[c.campania,c.cliente,...(c.pantallas||[])].join(' ').toLocaleLowerCase('es');
      return (!search||text.includes(search))&&(!type||c.tipo_contenido===type)&&(!screen||(c.pantallaIds||[]).includes(screen));
    });
    const counts={todas:searched.length,vigentes:0,futuras:0,pasadas:0,pausadas:0};
    searched.forEach(c=>{const bucket=statusForCampaign(c);if(bucket in counts)counts[bucket]++;});
    document.querySelectorAll('#campaignTabs [data-campaign-tab]').forEach(b=>{
      const tab=b.dataset.campaignTab;b.classList.toggle('active',tab===campaignTab);
      const n=b.querySelector('.tab-count');if(n)n.textContent=String(counts[tab]||0);
    });
    const filtered=campaignTab==='todas'?searched:searched.filter(c=>statusForCampaign(c)===campaignTab);
    const panel=$('campaignTable');
    if($('campaignListCount'))$('campaignListCount').textContent=filtered.length+' campaña'+(filtered.length===1?'':'s')+' · '+(campaignTab==='todas'?'Todas':({vigentes:'Vigentes',futuras:'Futuras',pasadas:'Pasadas',pausadas:'Pausadas'}[campaignTab]||''));
    if(!filtered.length){panel.innerHTML=empty('No hay campañas que coincidan con los filtros seleccionados.');return;}
    const rows=filtered.map(c=>{
      const raw=snapshotCampaigns.find(x=>x.id===c.id);
      const authorized=!!raw&&canEdit&&groupWritable(raw.grupo_id);
      const superadmin=base.getProfile()?.es_superadmin===true&&!!raw&&groupWritable(raw.grupo_id);
      const status=statusForCampaign(c);
      const label={vigentes:'Vigente',futuras:'Futura',pasadas:'Pasada',pausadas:'Pausada'}[status]||status;
      const menu=(authorized||superadmin)?'<div class="campaign-menu-wrap"><button class="campaign-more" type="button" data-campaign-menu="'+esc(c.id)+'" aria-label="Acciones para '+esc(c.campania)+'" aria-expanded="false">⋮</button><div class="campaign-menu hidden" data-campaign-options="'+esc(c.id)+'">'+
        (authorized?'<button type="button" data-edit-campaign="'+esc(c.id)+'">Editar</button><button type="button" data-pause-campaign="'+esc(c.id)+'">'+(raw.pausada?'Reactivar':'Pausar')+'</button>':'')+
        (superadmin?'<button type="button" class="menu-danger" data-delete-campaign="'+esc(c.id)+'">Eliminar</button>':'')+
        '</div></div>':'<span class="tiny">—</span>';
      const media=campaignMediaUrl(c),kind=c.tipo_contenido||'video';
      const typeLabel=kind==='imagen'?'Imagen':kind==='web'?'Web':'Video';
      const content='<span class="campaign-type-chip">'+esc(typeLabel)+(kind==='video'&&Number(c.duracion_seg)>0?' · '+esc(Number(c.duracion_seg))+'s':'')+'</span>'+
        (media?'<button type="button" class="campaign-media-btn" data-preview-campaign="'+esc(c.id)+'">Vista previa</button><a class="campaign-media-btn" href="'+esc(media)+'" target="_blank" rel="noopener noreferrer" download>Descargar</a>':'<span class="tiny">Sin archivo</span>');
      return '<tr><td class="campaign-action-cell">'+menu+'</td><td><strong>'+esc(c.campania)+'</strong></td><td>'+esc(c.cliente||'—')+'</td><td><span class="campaign-screen-chip">'+esc((c.pantallas||[]).join(', ')||'Sin pantalla')+'</span></td><td class="campaign-date">'+dates(c.fecha_desde)+'</td><td class="campaign-date">'+dates(c.fecha_hasta)+'</td><td><strong>'+esc(c.porcentaje)+'%</strong></td><td><span class="campaign-state state-'+esc(status)+'">'+esc(label)+'</span></td><td class="campaign-content">'+content+'</td></tr>';
    });
    panel.innerHTML='<div class="campaign-table-scroll"><table class="campaign-list-table"><thead><tr>'+['Acciones','Campaña','Cliente','Pantalla / Grupo','Desde','Hasta','Frecuencia','Estado','Contenido'].map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
    panel.querySelectorAll('[data-campaign-menu]').forEach(btn=>btn.addEventListener('click',()=>{
      const target=panel.querySelector('[data-campaign-options="'+btn.dataset.campaignMenu+'"]');
      panel.querySelectorAll('[data-campaign-options]').forEach(menu=>{if(menu!==target)menu.classList.add('hidden');});
      target?.classList.toggle('hidden');
      btn.setAttribute('aria-expanded',String(target&&!target.classList.contains('hidden')));
    }));
    panel.querySelectorAll('[data-edit-campaign]').forEach(btn=>btn.addEventListener('click',()=>openCampaign(btn.dataset.editCampaign)));
    panel.querySelectorAll('[data-pause-campaign]').forEach(btn=>btn.addEventListener('click',()=>toggleCampaignPause(btn.dataset.pauseCampaign)));
    panel.querySelectorAll('[data-delete-campaign]').forEach(btn=>btn.addEventListener('click',()=>deleteCampaign(btn.dataset.deleteCampaign)));
    panel.querySelectorAll('[data-preview-campaign]').forEach(btn=>btn.addEventListener('click',()=>previewCampaign(btn.dataset.previewCampaign)));
  }
  function previewCampaign(id){
    const c=base.getModel().campaigns.find(x=>x.id===id&&x.eliminada!==true);
    if(!c)return;
    const url=campaignMediaUrl(c);
    if(!url)return alert('El contenido no tiene una URL válida para vista previa.');
    const kind=c.tipo_contenido;
    let media='';
    if(kind==='video')media='<video controls autoplay playsinline preload="metadata" src="'+esc(url)+'"></video>';
    else if(kind==='imagen')media='<img alt="Vista previa de '+esc(c.campania)+'" src="'+esc(url)+'">';
    else media='<iframe title="Vista previa de '+esc(c.campania)+'" src="'+esc(url)+'" sandbox="allow-scripts allow-forms allow-popups" referrerpolicy="no-referrer"></iframe>';
    const root=$('adminModalRoot');if(!root)return;
    root.innerHTML='<div class="admin-backdrop" role="presentation"><div class="admin-dialog campaign-preview-dialog" role="dialog" aria-modal="true" aria-label="Vista previa"><div class="dialog-head"><h3>Vista previa · '+esc(c.campania)+'</h3><button type="button" class="secondary" id="closeCampaignPreview" aria-label="Cerrar">×</button></div><div class="campaign-preview-box">'+media+'</div></div></div>';
    $('closeCampaignPreview').addEventListener('click',closeDialog);
    root.querySelector('.admin-backdrop').addEventListener('click',e=>{if(e.target===root.querySelector('.admin-backdrop'))closeDialog();});
  }
  async function deleteCampaign(id){
    const user=base.getProfile(),raw=snapshotCampaigns.find(x=>x.id===id);
    if(!user?.es_superadmin||!raw||raw.eliminada||!groupWritable(raw.grupo_id))return alert('Solo Superadmin puede eliminar campañas.');
    if(!confirm('¿Eliminar la campaña '+raw.nombre+'? Se conservará en el histórico y dejará de mostrarse en este listado.'))return;
    try{
      await permission(raw.grupo_id);
      const {data,error}=await db.from('campanias').update({eliminada:true,pausada:true}).eq('id',raw.id).eq('grupo_id',raw.grupo_id).eq('eliminada',false).select('id');
      if(error)throw error;
      if(data?.length!==1)throw Error('No se confirmó la eliminación.');
      await base.reload();
      alert('Campaña eliminada del listado. Se conserva en el historial.');
    }catch(err){alert(err.message||'No se pudo eliminar la campaña.');}
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
  function screenCheckboxes(selectedIds=[]){
    const list=getActiveScreens().filter(p=>groupForScreen(p.id)===validGroup);
    if(!list.length)return '<div class="empty">No hay pantallas autorizadas para Arcuva.</div>';
    const selected=new Set(Array.isArray(selectedIds)?selectedIds:[selectedIds].filter(Boolean));
    return list.map(p=>'<label class="screen-checkbox"><input type="checkbox" class="campaign-screen" value="'+esc(p.id)+'" '+(selected.has(p.id)?'checked':'')+'><span>'+esc(p.nombre)+'</span><small>'+esc(p.ancho)+' × '+esc(p.alto)+' px</small></label>').join('');
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
    out.innerHTML='<div class="admin-field full"><label for="campaignFile">'+(video?'Video MP4 (H.264 recomendado)':'Imagen JPG, PNG o WebP')+'</label><input id="campaignFile" type="file" accept="'+(video?'video/mp4,.mp4':'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp')+'"><small>'+(oldPath?'Contenido actual conservado si no seleccionás un archivo nuevo.' :'Seleccioná un archivo MP4; el servidor adaptará su resolución para cada pantalla.')+'</small></div>';
    $('campaignFile').addEventListener('change',updateFileMetadata);
    $('mediaDuration').classList.toggle('hidden',video);
  }
  function getVideoMetadata(file){
    return new Promise((resolve,reject)=>{
      const v=document.createElement('video'),url=URL.createObjectURL(file);
      let finished=false;
      const finish=(err,metadata)=>{
        if(finished)return;
        finished=true;
        v.onloadedmetadata=null;v.onerror=null;
        URL.revokeObjectURL(url);v.removeAttribute('src');v.load();
        err?reject(err):resolve(metadata);
      };
      v.preload='metadata';
      v.onloadedmetadata=()=>{
        const duration=Number(v.duration),width=Number(v.videoWidth),height=Number(v.videoHeight);
        finish(!Number.isFinite(duration)||duration<=0||!width||!height
          ?Error('No se pudo determinar la duración o las dimensiones reales del video.'):null,
          {duration,width,height});
      };
      v.onerror=()=>finish(Error('No se pudo leer el video. Comprobá que sea MP4 compatible.'));
      v.src=url;
    });
  }
  function targetVideoScreens(id,selectedScreenIds){
    const ids=selectedScreenIds;
    const authorized=new Set(getActiveScreens().filter(p=>groupForScreen(p.id)===validGroup).map(p=>p.id));
    return getActiveScreens().filter(p=>ids.includes(p.id)&&authorized.has(p.id));
  }
  async function verifyVideoDimensions(file,id,selectedScreenIds){
    const metadata=await getVideoMetadata(file);
    const screens=targetVideoScreens(id,selectedScreenIds);
    if(!screens.length)throw Error('No se pudieron determinar las pantallas destino del video.');
    // La resolución de origen no determina compatibilidad con la pantalla.
    // El Taurus Server genera un MP4 por pantalla con escalado proporcional
    // y relleno, y valida su formato antes de publicarlo.
    if(metadata.duration>300)throw Error('El video dura '+metadata.duration.toFixed(1)+
      ' segundos. Revisá el archivo: por seguridad se bloquean videos superiores a 5 minutos.');
    return metadata;
  }
  async function updateFileMetadata(){
    const file=$('campaignFile')?.files?.[0];
    const feedback=$('fileDetails');if(!feedback)return;
    feedback.textContent=file?'Archivo: '+file.name:'';
    if(file&&$('campaignType').value==='video'){
      try{
        const metadata=await getVideoMetadata(file);
        if($('campaignFile')?.files?.[0]===file){
          $('campaignDuration').value=String(Math.round(metadata.duration*100)/100);
          feedback.textContent='Video: '+metadata.width+'×'+metadata.height+
            ' px · '+metadata.duration.toFixed(2)+' segundos. El servidor adaptará el video a la resolución de cada pantalla antes de publicarlo.';
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
    const previousScreens=id?(base.getModel().campaigns.find(c=>c.id===id)?.pantallaIds||[]):[];
    const info=id
      ?'<div class="message note-role">Podés agregar o quitar pantallas sin duplicar la campaña ni volver a cargar el contenido. Los cambios se guardan en NextWork y pueden reflejarse en los Taurus cuando el servidor procese una nueva programación.</div>'
      :'<div class="message notice"><strong>Seguridad:</strong> la campaña nueva se creará <b>pausada</b>. Después podrás activarla conscientemente desde el listado.</div>';
    const extra='<div class="admin-field full"><label>Pantallas de destino *</label><div class="screens-list">'+
      screenCheckboxes(id?previousScreens:[getActiveScreens().find(p=>groupForScreen(p.id)===validGroup)?.id])+
      '</div><small>Marcá las pantallas donde debe reproducirse la campaña. Debe quedar al menos una.</small></div>';
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
    const selectedScreenIds=[...document.querySelectorAll('.campaign-screen:checked')].map(x=>x.value);
    const permittedIds=getActiveScreens().filter(s=>groupForScreen(s.id)===validGroup).map(s=>s.id);
    if(!selectedScreenIds.length||selectedScreenIds.some(s=>!permittedIds.includes(s)))return fail('Seleccioná al menos una pantalla autorizada de Arcuva.');
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
      if(file){
        try{
          const verified=await verifyVideoDimensions(file,id,selectedScreenIds);
          duracion=Math.round(verified.duration*100)/100;
        }catch(err){return fail(err.message);}
      }
      if(!file)duracion=Number(existing?.tipo_contenido==='video'?existing.duracion_seg:0);
      if(!Number.isFinite(duracion)||duracion<=0||duracion>86400)return fail('No se pudo determinar la duración del video.');
    }else if(![5,10,15,20].includes(duracion))return fail('La duración admitida es 5, 10, 15 o 20 segundos.');
    const originalIds=id?(base.getModel().campaigns.find(c=>c.id===id)?.pantallaIds||[]):[];
    const added=selectedScreenIds.filter(screenId=>!originalIds.includes(screenId));
    const removed=originalIds.filter(screenId=>!selectedScreenIds.includes(screenId));
    const screenNames=new Map(getActiveScreens().map(p=>[p.id,p.nombre]));
    const changes=[added.length?'Agregar: '+added.map(x=>screenNames.get(x)||x).join(', '):'',
      removed.length?'Quitar: '+removed.map(x=>screenNames.get(x)||x).join(', '):''].filter(Boolean);
    const ok=window.confirm(id
      ?'Se guardarán los cambios de la campaña en Arcuva.'+(changes.length?'\\n\\nPantallas:\\n'+changes.join('\\n'):'\\n\\nSin cambios en las pantallas asignadas.')+
        '\\n\\nEsto puede modificar la programación publicitaria cuando los reproductores se sincronicen. ¿Continuar?'
      :'Se creará una campaña PAUSADA de Arcuva. No se activará automáticamente. ¿Continuar?');
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
        if(added.length||removed.length){
          const {data:count,error:linkError}=await db.rpc('arcuva_actualizar_pantallas_campania',{
            p_campania_id:id,p_pantalla_ids:selectedScreenIds
          });
          if(linkError)throw Error('Se guardaron los datos de campaña, pero no las pantallas asignadas: '+linkError.message);
          if(count!==selectedScreenIds.length)throw Error('No se pudo verificar la cantidad de pantallas asignadas.');
        }
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
  window.addEventListener('arcuva-page-campanias',()=>{campaignTab='vigentes';renderCampaignTable();});
  $('campaignSearch').addEventListener('input',renderCampaignTable);
  $('campaignTypeFilter').addEventListener('change',renderCampaignTable);
  $('campaignScreenFilter').addEventListener('change',renderCampaignTable);
  document.querySelectorAll('#campaignTabs [data-campaign-tab]').forEach(btn=>btn.addEventListener('click',()=>{campaignTab=btn.dataset.campaignTab;renderCampaignTable();}));
  window.ArcuvaAdminRefresh=refresh;
  window.ArcuvaAdminReset=reset;
})();