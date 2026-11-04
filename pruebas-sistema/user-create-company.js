// Alta de usuarios multiempresa; solo en /pruebas-sistema/.
// La API valida en el servidor empresa/rol/grupos; no usa service_role en el navegador.
(function(){
 'use strict';
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let groups=[];
 async function open(){
  if(!canManageUsers())return;
  const [er,gr]=await Promise.all([
   isSuperAdmin()?sb.from('empresas').select('id,nombre_fantasia').eq('activo',true).order('nombre_fantasia')
     :sb.from('empresas').select('id,nombre_fantasia').eq('id',currentProfile.empresa_id),
   sb.from('grupos').select('id,nombre,empresa_id,activo').eq('activo',true).order('nombre')]);
  if(er.error||gr.error){alert('No se pudieron cargar las empresas y grupos: '+(er.error||gr.error).message);return;}
  const empresas=er.data||[];groups=gr.data||[];
  if(!empresas.length){alert('No hay empresas activas para este administrador.');return;}
  const co=empresas.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre_fantasia)+'</option>').join('');
  const gs=groups.map(g=>'<label data-user-empresa="'+esc(g.empresa_id)+'" style="display:block;margin:9px 0"><input type="checkbox" class="stageUserGroup" value="'+esc(g.id)+'" style="width:auto;margin-right:7px"><span>'+esc(g.nombre)+'</span></label>').join('');
  $('modalRoot').innerHTML='<div class="modal-backdrop"><div class="modal" style="max-width:760px"><h3>Nuevo usuario</h3>'
    +'<div class="form-grid"><div class="field"><label>Nombre</label><input id="multiUserNombre"></div>'
    +'<div class="field"><label>Correo electrónico</label><input id="multiUserEmail" type="email"></div>'
    +'<div class="field full"><label>Empresa a la que pertenece</label><select id="multiUserEmpresa" onchange="stageUserCompanyChange()" '+(!isSuperAdmin()?'disabled':'')+'>'+co+'</select></div>'
    +'<div class="field"><label>Rol</label><select id="multiUserRol"><option value="operador">Operador</option><option value="administrativo">Administrativo</option><option value="administrador">Administrador de empresa</option></select></div>'
    +'<div class="field full"><label>Grupos de esa empresa</label><div id="multiUserGroups">'+gs+'</div><div id="multiUserHelp" class="small"></div></div>'
    +'<div class="field"><label>Contraseña temporal</label><input id="multiUserPass" type="password" autocomplete="new-password"></div>'
    +'<div class="field"><label>Confirmar contraseña</label><input id="multiUserConfirm" type="password" autocomplete="new-password"></div>'
    +'</div><div class="small" style="margin-top:10px;color:#996019;font-weight:750">'
    +'PRUEBAS CON DATOS REALES: al guardar, el usuario se crea en Supabase. Deberá cambiar su contraseña temporal después de iniciar sesión.</div>'
    +'<div class="actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>'
    +'<button id="multiUserSave" class="btn btn-primary" onclick="stageSaveNewUser()">Crear usuario</button></div></div></div>';
  stageUserCompanyChange();
 }
 function companyChange(){
  const id=$('multiUserEmpresa')?.value;let count=0;
  document.querySelectorAll('[data-user-empresa]').forEach(label=>{
   const same=label.dataset.userEmpresa===id;
   label.style.display=same?'':'none';
   const cb=label.querySelector('input');if(cb){cb.disabled=!same;if(!same)cb.checked=false;}
   if(same)count++;
  });
  $('multiUserHelp').textContent=count?'Seleccioná uno o más grupos. Dentro de ellos el usuario tendrá acceso a las pantallas autorizadas.':'La empresa no tiene grupos. Primero creá un grupo en la pestaña Grupos.';
  $('multiUserSave').disabled=!count;
 }
 async function save(){
  if(!canManageUsers())return;
  const nombre=$('multiUserNombre')?.value.trim(),email=$('multiUserEmail')?.value.trim().toLowerCase();
  const empresaId=$('multiUserEmpresa')?.value,rol=$('multiUserRol')?.value;
  const pass=$('multiUserPass')?.value||'',confirmPass=$('multiUserConfirm')?.value||'';
  const groupIds=[...document.querySelectorAll('.stageUserGroup:checked:not(:disabled)')].map(x=>x.value);
  if(!nombre||!email||!empresaId||!groupIds.length){alert('Completá nombre, correo, empresa y al menos un grupo.');return;}
  if(!isSuperAdmin()&&empresaId!==currentProfile.empresa_id){alert('No podés crear usuarios de otra empresa');return;}
  if(pass.length<10){alert('La contraseña temporal debe tener al menos 10 caracteres.');return;}
  if(pass!==confirmPass){alert('Las contraseñas no coinciden.');return;}
  if(!confirm('¿Crear a '+nombre+' dentro de la empresa seleccionada?\n\nEsta cuenta y sus permisos quedarán guardados en la base real de Supabase.'))return;
  const {data:session}=await sb.auth.getSession();
  const token=session?.session?.access_token;
  if(!token){alert('Tu sesión expiró. Volvé a iniciar sesión.');return;}
  const btn=$('multiUserSave');btn.disabled=true;btn.textContent='Creando...';
  try{
   const resp=await fetch(SUPABASE_URL+'/functions/v1/multiempresa-users-api-v2',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body:JSON.stringify({action:'create-user',nombre,email,empresaId,rol,password:pass,groupIds})
   });
   const result=await resp.json().catch(()=>({}));
   if(!resp.ok||!result.ok)throw Error(result.error||'No se pudo crear el usuario.');
   closeModal();
   await loadUsuarios();
   alert('Usuario creado con éxito y asignado a su empresa y '+result.groups+' grupo(s).');
  }catch(err){alert('No se pudo crear el usuario: '+(err.message||err));btn.disabled=false;btn.textContent='Crear usuario';}
 }
 window.stageOpenNewUser=open;window.stageUserCompanyChange=companyChange;window.stageSaveNewUser=save;
})();