// Contactos de usuarios de Arcuva: Administración gestiona WhatsApp;
// Superadmin conserva su vista global de consulta de cuentas y asignaciones.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;if(!base)return;
const db=base.db,esc=base.escapeHtml,$=id=>document.getElementById(id);
const COMPANY='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
let serial=0,users=[],busy=false;
const authorized=p=>p&&(p.es_superadmin===true||(p.empresa_id===COMPANY&&['administrador','administrativo'].includes(p.rol)));
const canModify=(user,profile)=>user&&(user.empresa_id===COMPANY||(user.es_superadmin===true&&profile.es_superadmin===true));
function phoneButton(user,profile){
 return canModify(user,profile)?'<button type="button" class="secondary small-btn" data-edit-contact="'+esc(user.id)+'">Editar</button>':'—';
}
function bindButtons(){
 $('superUsersTable')?.querySelectorAll('[data-edit-contact]').forEach(btn=>btn.addEventListener('click',()=>editContact(btn.dataset.editContact)));
}
function editContact(id){
 const profile=base.getProfile(),user=users.find(u=>u.id===id);
 if(!authorized(profile)||!canModify(user,profile))return;
 const modal=$('userWhatsappDialog');if(!modal)return;
 modal.hidden=false;
 modal.innerHTML='<div class="user-contact-backdrop"><div class="user-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="userContactTitle">'+
  '<h3 id="userContactTitle">Editar contacto de usuario</h3>'+
  '<p><strong>'+esc(user.nombre||user.email)+'</strong><span class="tiny"> · '+esc(user.email||'')+'</span></p>'+
  '<label for="userWhatsappInput">WhatsApp (con código de país)</label>'+
  '<input id="userWhatsappInput" type="tel" inputmode="tel" maxlength="25" placeholder="+54 9 299 ..." value="'+esc(user.telefono_whatsapp||'')+'">'+
  '<p class="tiny">Ejemplo: +54 9 299 1234567. Este número se utilizará automáticamente al elegir al usuario en Órdenes de trabajo.</p>'+
  '<div id="userWhatsappError" role="alert"></div>'+
  '<div class="user-contact-actions"><button type="button" class="secondary" id="cancelUserWhatsapp">Cancelar</button><button type="button" class="primary" id="saveUserWhatsapp">Guardar teléfono</button></div></div></div>';
 $('cancelUserWhatsapp').addEventListener('click',()=>{modal.hidden=true;modal.replaceChildren();});
 $('saveUserWhatsapp').addEventListener('click',()=>savePhone(user));
 $('userWhatsappInput').focus();
}
async function savePhone(user){
 if(busy)return;
 const phone=$('userWhatsappInput').value.trim(),digits=phone.replace(/\D/g,'');
 if(phone&&(digits.length<10||digits.length>15)){
  $('userWhatsappError').textContent='Ingresá un WhatsApp con código de país (10 a 15 dígitos).';return;
 }
 const button=$('saveUserWhatsapp');busy=true;button.disabled=true;button.textContent='Guardando…';
 try{
  const {data,error}=await db.rpc('arcuva_actualizar_whatsapp_usuario',{p_usuario_id:user.id,p_telefono:phone||null});
  if(error)throw error;
  user.telefono_whatsapp=data||'';
  $('userWhatsappDialog').hidden=true;
  $('userWhatsappDialog').replaceChildren();
  await load();
  $('superUsersInfo').textContent+=' · Teléfono actualizado correctamente';
  if(window.ArcuvaOrders?.load)void window.ArcuvaOrders.load();
 }catch(e){$('userWhatsappError').textContent='No se pudo guardar: '+(e.message||e);}
 finally{busy=false;if(button.isConnected){button.disabled=false;button.textContent='Guardar teléfono';}}
}
async function load(){
 const box=$('superUsersTable'),msg=$('superUsersInfo');if(!box||!msg)return;
 const profile=base.getProfile();
 if(!authorized(profile)){
  box.innerHTML='<div class="empty">Acceso restringido.</div>';
  msg.textContent='No tenés permiso para consultar esta sección.';return;
 }
 const generation=++serial;
 msg.textContent='Cargando usuarios y teléfonos de contacto…';
 const isSuper=profile.es_superadmin===true;
 if(!isSuper){
  const {data,error}=await db.rpc('arcuva_usuarios_contactos');
  if(generation!==serial)return;
  if(error){msg.textContent='No se pudieron consultar usuarios de Arcuva';box.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
  users=(data||[]).map(u=>({...u,empresa_id:COMPANY,es_superadmin:false}));
  msg.textContent=users.length+' usuarios y destinatarios visibles · Edición de contactos de Arcuva';
  box.innerHTML='<table><thead><tr><th>Nombre</th><th>Correo electrónico</th><th>WhatsApp</th><th>Acción</th></tr></thead><tbody>'+
   users.map(u=>'<tr><td><strong>'+esc(u.nombre||'—')+'</strong></td><td>'+esc(u.email||'—')+'</td><td>'+esc(u.telefono_whatsapp||'Sin registrar')+'</td><td>'+phoneButton(u,profile)+'</td></tr>').join('')+'</tbody></table>';
  bindButtons();return;
 }
 const [people,companies,groups,assignments]=await Promise.all([
  db.from('usuarios').select('id,nombre,email,rol,activo,empresa_id,es_superadmin,telefono_whatsapp').order('nombre'),
  db.from('empresas').select('id,nombre_fantasia'),
  db.from('grupos').select('id,nombre,empresa_id'),
  db.from('usuarios_grupos').select('usuario_id,grupo_id,rol_grupo,acceso_todas_pantallas')
 ]);
 if(generation!==serial||!base.getProfile()?.es_superadmin)return;
 const error=people.error||companies.error||groups.error||assignments.error;
 if(error){msg.textContent='No se pudieron cargar usuarios';box.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
 users=people.data||[];
 const comp=new Map((companies.data||[]).map(c=>[c.id,c.nombre_fantasia]));
 const grp=new Map((groups.data||[]).map(g=>[g.id,g]));
 msg.textContent=users.length+' usuarios registrados · Consulta global Superadmin';
 box.innerHTML='<table><thead><tr><th>Nombre</th><th>Correo electrónico</th><th>Empresa</th><th>Rol</th><th>Grupos / Pantallas</th><th>WhatsApp</th><th>Estado</th><th>Acción</th></tr></thead><tbody>'+
 users.map(u=>{
  const links=(assignments.data||[]).filter(a=>a.usuario_id===u.id&&grp.get(a.grupo_id)?.empresa_id===u.empresa_id)
   .map(a=>{const g=grp.get(a.grupo_id);return esc(g.nombre)+' · '+esc(a.rol_grupo)+(a.acceso_todas_pantallas?' · todas las pantallas':' · acceso limitado')});
  return '<tr><td><strong>'+esc(u.nombre||'—')+'</strong></td><td>'+esc(u.email||'—')+'</td>'+
  '<td>'+esc(comp.get(u.empresa_id)||'—')+'</td><td>'+esc(u.es_superadmin?'Superadmin':u.rol||'—')+'</td>'+
  '<td>'+esc(links.join(' | ')||'Sin grupo asignado')+'</td><td>'+esc(u.telefono_whatsapp||'Sin registrar')+'</td>'+
  '<td>'+esc(u.activo?'Activo':'Inactivo')+'</td><td>'+phoneButton(u,profile)+'</td></tr>';
 }).join('')+'</tbody></table>';
 bindButtons();
}
$('refreshSuperUsers')?.addEventListener('click',load);
window.addEventListener('arcuva-page-usuarios',load);
window.ArcuvaSuperUsersLoad=load;
})();