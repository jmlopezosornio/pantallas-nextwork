// Módulo nativo de consulta de usuarios de NextWork para Superadmin.
// Lecturas sujetas a RLS. La creación de cuentas y asignaciones exige API
// administrativa autenticada: no exponer claves privilegiadas en el navegador.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase;if(!base)return;
const db=base.db,esc=base.escapeHtml,$=id=>document.getElementById(id);
let serial=0;
async function load(){
 const box=$('superUsersTable'),msg=$('superUsersInfo');
 if(!box||!msg)return;
 const user=base.getProfile();
 if(!user||user.es_superadmin!==true){
   box.innerHTML='<div class="empty">Solo Superadmin puede consultar los usuarios.</div>';
   msg.textContent='Acceso restringido';return;
 }
 const generation=++serial;
 msg.textContent='Consultando usuarios y asignaciones…';
 const [users,companies,groups,assignments]=await Promise.all([
   db.from('usuarios').select('id,nombre,email,rol,activo,empresa_id,es_superadmin').order('nombre'),
   db.from('empresas').select('id,nombre_fantasia'),
   db.from('grupos').select('id,nombre,empresa_id'),
   db.from('usuarios_grupos').select('usuario_id,grupo_id,rol_grupo,acceso_todas_pantallas')
 ]);
 if(generation!==serial||!base.getProfile()?.es_superadmin)return;
 const err=users.error||companies.error||groups.error||assignments.error;
 if(err){
   msg.textContent='No se pudo consultar la información. Revisá los permisos RLS.';
   box.innerHTML='<div class="empty">'+esc(err.message||'Error de lectura')+'</div>';return;
 }
 const companiesById=new Map((companies.data||[]).map(x=>[x.id,x.nombre_fantasia]));
 const groupsById=new Map((groups.data||[]).map(x=>[x.id,x]));
 const data=users.data||[];
 msg.textContent=data.length+' usuarios registrados · Consulta global Superadmin';
 box.innerHTML='<table><thead><tr><th>Nombre</th><th>Correo electrónico</th><th>Empresa</th><th>Rol</th><th>Grupos / Pantallas</th><th>Estado</th></tr></thead><tbody>'+
   data.map(u=>{
     const links=(assignments.data||[]).filter(a=>a.usuario_id===u.id)
       .filter(a=>groupsById.get(a.grupo_id)?.empresa_id===u.empresa_id)
       .map(a=>{const group=groupsById.get(a.grupo_id);return esc(group.nombre)+' · '+esc(a.rol_grupo)+(a.acceso_todas_pantallas?' · todas las pantallas':' · acceso limitado');});
     return '<tr><td><strong>'+esc(u.nombre||'—')+'</strong></td><td>'+esc(u.email||'—')+'</td><td>'+esc(companiesById.get(u.empresa_id)||'—')+'</td><td>'+esc(u.es_superadmin?'Superadmin':u.rol||'—')+'</td><td>'+ (links.join('<div class="tiny"></div>')||'Sin grupo asignado') +'</td><td>'+esc(u.activo?'Activo':'Inactivo')+'</td></tr>';
   }).join('')+'</tbody></table>';
}
$('refreshSuperUsers')?.addEventListener('click',load);
window.addEventListener('arcuva-page-usuarios',load);
window.ArcuvaSuperUsersLoad=load;
})();