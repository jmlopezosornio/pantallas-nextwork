// Gestión nativa de pantallas de Arcuva (sin redireccionar al entorno de pruebas).
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;
if(!base)return;
const db=base.db,$=id=>document.getElementById(id),esc=base.escapeHtml;
const COMPANY='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
let busy=false;
function allowed(){
 const p=base.getProfile();
 return !!p&&(p.es_superadmin===true||(p.empresa_id===COMPANY&&p.rol==='administrador'));
}
function field(label,id,type='text',value='',extra=''){
 return '<div class="admin-field"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></div>';
}
function select(label,id,opts,val){
 return '<div class="admin-field"><label for="'+id+'">'+esc(label)+'</label><select id="'+id+'">'+opts.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===val?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></div>';
}
function close(force=false){
 if(busy&&!force)return;
 const root=$('screenManageModal');
 if(root)root.replaceChildren();
}
function modal(title,html,save){
 const root=$('screenManageModal');if(!root)return;
 root.innerHTML='<div class="admin-backdrop"><div class="admin-dialog"><div class="dialog-head"><h3>'+esc(title)+'</h3><button type="button" class="secondary" data-screen-cancel aria-label="Cerrar">×</button></div>'+
  '<form id="screenManageForm"><div class="admin-grid">'+html+'</div><div id="screenManageMessage" class="message hidden" role="alert"></div>'+
  '<div class="dialog-actions"><button type="button" class="secondary" data-screen-cancel>Cancelar</button><button class="primary" type="submit" id="screenManageSave">Guardar cambios</button></div></form></div></div>';
 root.querySelectorAll('[data-screen-cancel]').forEach(b=>b.addEventListener('click',close));
 $('screenManageForm').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;$('screenManageSave').disabled=true;
 try{await save();close(true);await base.reload();}
 catch(err){const m=$('screenManageMessage');if(m){m.textContent=err?.message||'No se pudo guardar.';m.classList.remove('hidden');}}
 finally{busy=false;const b=$('screenManageSave');if(b)b.disabled=false;}
 });
}
const playerTypes=[['','Sin vincular'],['novastar_taurus','NovaStar Taurus / VNNOX'],['windows','PC Windows'],['raspberry','Raspberry Pi']];
function playerInputs(player){
 return select('Tipo de reproductor','screenPlayerType',playerTypes,player?.tipo||'')+
 '<div class="admin-field full" id="screenVnnoxFields"><div class="admin-grid">'+
 field('ID del reproductor VNNOX','screenVnnoxId','text',player?.vnnox_player_id||'','maxlength="128"')+
 field('Número de serie del Taurus (SN)','screenVnnoxSn','text',player?.vnnox_sn||'','maxlength="128"')+
 '</div><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px">'+
 '<button type="button" class="secondary" id="screenVerifyVnnox">Verificar en VNNOX</button>'+
 '<span id="screenVnnoxResult" class="tiny" role="status">Identificación pendiente de verificar.</span></div>'+
 '<small>La verificación consulta VNNOX sin modificar el Taurus ni enviar publicidad. Guardá los cambios después de confirmar su identidad.</small></div>';
}
function bindPlayerVisibility(){
 const s=$('screenPlayerType'),group=$('screenVnnoxFields');
 if(!s||!group)return;
 const update=()=>group.style.display=s.value==='novastar_taurus'?'block':'none';
 s.addEventListener('change',update);update();
}
function bindVnnoxVerify(screenId){
 const btn=$('screenVerifyVnnox');
 if(!btn)return;
 btn.addEventListener('click',async()=>{
  if(!screenId){$('screenVnnoxResult').textContent='Primero creá la pantalla y después verificá su Taurus desde Editar.';return;}
  const serial=$('screenVnnoxSn')?.value.trim();
  if(!serial){$('screenVnnoxResult').textContent='Ingresá el número de serie (SN) del equipo.';return;}
  btn.disabled=true;
  const note=$('screenVnnoxResult');note.textContent='Buscando el número de serie en VNNOX…';
  try{
    const {data,error}=await db.functions.invoke('vnnox-lookup-screen',{body:{screenId,serial}});
    if(error||!data?.ok)throw Error(data?.error||error?.message||'VNNOX no confirmó el equipo.');
    if(String(data.sn||'').toUpperCase()!==serial.toUpperCase())throw Error('El número de serie no coincide.');
    const current=$('screenVnnoxId')?.value.trim()||'';
    if(current&&current!==data.playerId){
      const accepted=window.confirm('El identificador que ingresaste no coincide con el ID interno de VNNOX.\\n\\nActual: '+current+'\\nVNNOX: '+data.playerId+'\\n\\n¿Reemplazarlo por el ID verificado?');
      if(!accepted){note.textContent='No se cambió el identificador. Revisá la vinculación antes de publicar.';return;}
    }
    $('screenVnnoxId').value=data.playerId;
    note.textContent='VNNOX confirmado: '+(data.name||serial)+' · '+(data.onlineStatus===1?'En línea':data.onlineStatus===0?'Fuera de línea':'Estado no informado')+'. Guardá los cambios para registrar el ID.';
  }catch(err){note.textContent='No se pudo verificar: '+(err.message||err);}
  finally{btn.disabled=false;}
 });
}
function screenInputs(screen){
 return '<div class="admin-field full">'+field('Nombre de pantalla *','screenName','text',screen?.nombre||'','required maxlength="150"')+'</div>'+
 field('Ubicación','screenPlace','text',screen?.ubicacion||'','maxlength="220"')+
 field('Ancho (px) *','screenWidth','number',screen?.ancho||'','required min="1" step="1"')+
 field('Alto (px) *','screenHeight','number',screen?.alto||'','required min="1" step="1"')+
 field('Hora de encendido','screenOn','time',(screen?.hora_inicio||'06:00').slice(0,5))+
 field('Hora de apagado','screenOff','time',(screen?.hora_fin||'01:00').slice(0,5));
}
function readData(){
 const nombre=$('screenName').value.trim(),ubicacion=$('screenPlace').value.trim();
 const ancho=Number($('screenWidth').value),alto=Number($('screenHeight').value);
 if(!nombre||!Number.isInteger(ancho)||!Number.isInteger(alto)||ancho<1||alto<1)
  throw Error('Completá nombre y resolución válida.');
 const tipo=$('screenPlayerType').value;
 if(!playerTypes.some(([val])=>val===tipo))throw Error('Tipo de reproductor inválido.');
 const vnnoxId=$('screenVnnoxId').value.trim(),vnnoxSn=$('screenVnnoxSn').value.trim();
 if(vnnoxId.length>128||vnnoxSn.length>128)throw Error('Identificador de VNNOX demasiado largo.');
 return {screen:{nombre,ubicacion:ubicacion||null,ancho,alto,
  hora_inicio:$('screenOn').value||'06:00',hora_fin:$('screenOff').value||'01:00'},
  player:{tipo,proveedor:tipo==='novastar_taurus'?'vnnox':null,
  vnnox_player_id:tipo==='novastar_taurus'?(vnnoxId||null):null,
  vnnox_sn:tipo==='novastar_taurus'?(vnnoxSn||null):null}};
}
async function linkPlayer(pantallaId,existing,values){
 if(!values.tipo){
  if(existing)throw Error('No se puede desvincular desde este formulario: elegí un tipo de reproductor.');
  return;
 }
 if(existing){
  const {data,error}=await db.from('players').update(values).eq('pantalla_id',pantallaId).eq('id',existing.id).select('id');
  if(error)throw Error('Pantalla guardada, pero falló la vinculación: '+error.message);
  if(data?.length!==1)throw Error('No se confirmó la actualización del reproductor.');
 }else{
  const {data,error}=await db.from('players').insert({pantalla_id:pantallaId,estado:'offline',...values}).select('id');
  if(error)throw Error('Pantalla guardada, pero falló la vinculación: '+error.message);
  if(data?.length!==1)throw Error('No se confirmó el alta del reproductor.');
 }
}
async function edit(id){
 if(!allowed())return;
 const screen=base.getModel().screens.find(s=>s.id===id&&s.empresa_id===COMPANY);
 if(!screen)return;
 const {data:player,error}=await db.from('players').select('id,tipo,proveedor,vnnox_player_id,vnnox_sn')
  .eq('pantalla_id',id).maybeSingle();
 if(error){alert('No se pudo leer el reproductor: '+error.message);return;}
 const body=screenInputs(screen)+playerInputs(player);
 modal('Editar pantalla · '+screen.nombre,body,async()=>{
  if(!allowed())throw Error('No tenés permiso de administración.');
  const {screen:patch,player:info}=readData();
  if(player&&!info.tipo)throw Error('El reproductor existente no se puede eliminar desde este formulario.');
  if(player&&info.tipo!==player.tipo&&!confirm('Vas a cambiar el tipo de un reproductor existente. ¿Confirmás que no hay publicaciones en curso?'))throw Error('Cambio de reproductor cancelado.');
  const {data,error:updateError}=await db.from('pantallas').update(patch).eq('id',id).eq('empresa_id',COMPANY).select('id');
  if(updateError)throw updateError;
  if(data?.length!==1)throw Error('No se confirmó la edición de pantalla.');
  await linkPlayer(id,player,info);
 });
 bindPlayerVisibility();
 bindVnnoxVerify(id);
}
async function add(){
 if(!allowed())return;
 const {data:groups,error}=await db.from('grupos').select('id,nombre,empresa_id,activo')
  .eq('empresa_id',COMPANY).eq('activo',true).order('nombre');
 if(error){alert('No se pudieron leer los grupos: '+error.message);return;}
 if(!groups?.length){alert('Primero creá un grupo de Arcuva en la administración de NextWork.');return;}
 const groupUI=select('Grupo de Arcuva *','screenGroup',groups.map(g=>[g.id,g.nombre]),groups[0].id);
 modal('Nueva pantalla · Arcuva',groupUI+screenInputs(null)+playerInputs(null),async()=>{
  if(!allowed())throw Error('No tenés permiso de administración.');
  const {screen,player}=readData();
  const group=$('screenGroup').value;
  if(!groups.some(g=>g.id===group))throw Error('Grupo no autorizado.');
  const {data:id,error}=await db.rpc('admin_crear_pantalla_con_empresa',{
   p_empresa_id:COMPANY,p_grupo_id:group,p_nombre:screen.nombre,
   p_ubicacion:screen.ubicacion,p_ancho:screen.ancho,p_alto:screen.alto,
   p_hora_inicio:screen.hora_inicio,p_hora_fin:screen.hora_fin,
   p_licencia_estado:'prueba',p_licencia_hasta:null
  });
  if(error)throw error;
  if(!id)throw Error('No se confirmó la creación de pantalla.');
  await linkPlayer(id,null,player);
 });
 bindPlayerVisibility();
 bindVnnoxVerify(null);
}
$('addArcuvaScreen')?.addEventListener('click',add);
window.ArcuvaScreenManage=Object.freeze({edit,add});
})();