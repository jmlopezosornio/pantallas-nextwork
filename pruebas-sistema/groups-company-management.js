// NextWork · Grupos por empresa · SOLO /pruebas-sistema/.
// No modifica menús ni agrega timers/MutationObserver.
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let companyScreens=[],lockedCompanyId=null;

async function stageOpenGroup(id=''){
  if(!canManageGroups())return;
  const [companiesResult,screensResult,groupResult,linksResult]=await Promise.all([
    isSuperAdmin()
      ? sb.from('empresas').select('id,nombre_fantasia').eq('activo',true).order('nombre_fantasia')
      : sb.from('empresas').select('id,nombre_fantasia').eq('id',currentProfile.empresa_id),
    sb.from('pantallas').select('id,nombre,ubicacion,empresa_id').order('nombre'),
    id?sb.from('grupos').select('*').eq('id',id).single():Promise.resolve({data:null,error:null}),
    id?sb.from('grupos_pantallas').select('pantalla_id').eq('grupo_id',id):Promise.resolve({data:[],error:null})
  ]);
  const error=[companiesResult,screensResult,groupResult,linksResult].find(x=>x.error)?.error;
  if(error){alert('No se pudo abrir el grupo: '+error.message);return;}
  const companies=companiesResult.data||[];
  const current=groupResult.data||null;
  companyScreens=screensResult.data||[];
  lockedCompanyId=current?.empresa_id||null;
  const empresaId=current?.empresa_id || (!isSuperAdmin()?currentProfile.empresa_id:companies[0]?.id);
  if(!empresaId){alert('No hay empresas activas disponibles.');return;}
  const checkSet=new Set((linksResult.data||[]).map(x=>x.pantalla_id));
  const companyOptions=companies.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===empresaId?'selected':'')+'>'+esc(c.nombre_fantasia)+'</option>').join('');
  const screenMarkup=companyScreens.map(p=>'<label class="group-screen-item" data-scope="'+esc(p.empresa_id)+'">'
    +'<input type="checkbox" class="stageGroupScreen" value="'+esc(p.id)+'" '+(checkSet.has(p.id)?'checked':'')+'>'
    +'<span>'+esc(p.nombre)+' <span class="small">· '+esc(p.ubicacion||'')+'</span></span></label>').join('');
  $('modalRoot').innerHTML='<div class="modal-backdrop"><div class="modal" style="max-width:750px">'
    +'<h3>'+(current?'Editar grupo':'Nuevo grupo')+'</h3>'
    +'<div class="form-grid">'
    +'<div class="field full"><label>Empresa propietaria</label>'
    +'<select id="stageGroupEmpresa" '+((lockedCompanyId||!isSuperAdmin())?'disabled':'')+' onchange="stageGroupCompanyChange()">'+companyOptions+'</select>'
    +'<div class="small">Los grupos solamente pueden contener pantallas de su empresa.</div></div>'
    +'<div class="field"><label>Nombre del grupo</label><input id="stageGroupNombre" '+(current?.nombre==='GENERAL'?'readonly':'')+'></div>'
    +'<div class="field"><label>Estado</label><select id="stageGroupActivo" '+(current?.nombre==='GENERAL'?'disabled':'')+'>'
    +'<option value="true">Activo</option><option value="false">Inactivo</option></select></div>'
    +'<div class="field full"><label>Descripción</label><input id="stageGroupDescripcion"></div>'
    +'<div class="field full"><label>Pantallas de la empresa</label>'
    +'<div class="group-screen-list">'+screenMarkup+'</div><div id="stageGroupHint" class="small" style="margin-top:8px"></div></div>'
    +'</div><div class="actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'
    +'<button class="btn btn-primary" id="stageGroupSaveButton" onclick="stageSaveGroup(\''+esc(id)+'\')">Guardar grupo</button></div>'
    +'</div></div>';
  $('stageGroupNombre').value=current?.nombre||'';
  $('stageGroupDescripcion').value=current?.descripcion||'';
  $('stageGroupActivo').value=current?.activo===false?'false':'true';
  stageGroupCompanyChange();
}
function stageGroupCompanyChange(){
  const companyId=$('stageGroupEmpresa')?.value;
  let available=0;
  document.querySelectorAll('[data-scope]').forEach(label=>{
    const allow=label.dataset.scope===companyId;
    label.style.display=allow?'':'none';
    const cb=label.querySelector('input[type=checkbox]');
    if(cb){cb.disabled=!allow;if(!allow)cb.checked=false;}
    if(allow)available++;
  });
  if($('stageGroupHint'))$('stageGroupHint').textContent=available
    ? 'Elegí las pantallas de esta empresa que integran el grupo.'
    : 'No hay pantallas de esta empresa todavía. Podés guardar el grupo vacío y agregar las pantallas después.';
}
async function stageSaveGroup(id=''){
  if(!canManageGroups())return;
  const empresaId=$('stageGroupEmpresa')?.value,nombre=$('stageGroupNombre')?.value.trim();
  if(!empresaId||!nombre){alert('Ingresá la empresa y el nombre del grupo.');return;}
  const ids=[...document.querySelectorAll('.stageGroupScreen:checked:not(:disabled)')].map(x=>x.value);
  const btn=$('stageGroupSaveButton');
  if(btn){btn.disabled=true;btn.textContent='Guardando...';}
  const {error}=await sb.rpc('admin_guardar_grupo_con_pantallas',{
    p_grupo_id:id||null,p_empresa_id:empresaId,p_nombre:nombre,
    p_descripcion:$('stageGroupDescripcion')?.value.trim()||'',
    p_activo:$('stageGroupActivo')?.value==='true',p_pantallas:ids
  });
  if(error){
    if(btn){btn.disabled=false;btn.textContent='Guardar grupo';}
    alert('No se pudo guardar el grupo: '+error.message);return;
  }
  closeModal();
  await Promise.all([loadGrupos(),loadPantallas()]);
}
async function stageDeleteGroup(id){
  if(!canManageGroups())return;
  const {data:group,error}=await sb.from('grupos').select('id,nombre').eq('id',id).single();
  if(error||!group){alert(error?.message||'Grupo no encontrado');return;}
  if(group.nombre==='GENERAL'){alert('El grupo base GENERAL está protegido y no puede eliminarse.');return;}
  const [clients,campaigns,users,screens]=await Promise.all([
    sb.from('clientes').select('id',{count:'exact',head:true}).eq('grupo_id',id),
    sb.from('campanias').select('id',{count:'exact',head:true}).eq('grupo_id',id),
    sb.from('usuarios_grupos').select('grupo_id',{count:'exact',head:true}).eq('grupo_id',id),
    sb.from('grupos_pantallas').select('pantalla_id',{count:'exact',head:true}).eq('grupo_id',id)
  ]);
  if((clients.count||0)+(campaigns.count||0)+(users.count||0)>0){
    alert('No se puede eliminar "'+group.nombre+'".\n\n'
      +(clients.count||0)+' clientes, '+(campaigns.count||0)+' campañas y '+(users.count||0)+' usuarios asociados.\n'
      +'Reasignalos primero. Las pantallas no se borrarán.');return;
  }
  if(!confirm('¿Eliminar definitivamente el grupo "'+group.nombre+'"?\n\n'
    +'Se quitarán '+(screens.count||0)+' vínculo(s) de pantallas, pero las pantallas seguirán existiendo.\n'
    +'Esta operación modifica datos reales de Supabase.'))return;
  const {data,error:deleteError}=await sb.rpc('admin_eliminar_grupo_seguro',{p_grupo_id:id});
  if(deleteError){alert('No se pudo eliminar: '+deleteError.message);return;}
  await Promise.all([loadGrupos(),loadPantallas()]);
  alert('Grupo eliminado. No se borró ninguna pantalla; vínculos retirados: '+(data?.pantallas_desvinculadas||0));
}
window.stageOpenGroup=stageOpenGroup;
window.stageGroupCompanyChange=stageGroupCompanyChange;
window.stageSaveGroup=stageSaveGroup;
window.stageDeleteGroup=stageDeleteGroup;
})();