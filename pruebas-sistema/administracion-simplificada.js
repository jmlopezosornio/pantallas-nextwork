// NextWork · Fase 1: modelo administrativo simplificado.
// SOLO /pruebas-sistema/. Consulta y simulación. Cero escrituras en Supabase.
// Se mantiene intacto el reproductor operativo de Recursos Hídricos.
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let snapshot=null, loading=false,companyChoice='all',userChoice='',proposed=new Set(),dirty=false;
  const makeMap=(rows,key='id')=>new Map((rows||[]).map(x=>[x[key],x]));

  function registeredScreensForUser(user, data){
    const screens=(data.screens||[]).filter(p=>user.es_superadmin || p.empresa_id===user.empresa_id);
    if(user.es_superadmin)return new Set((data.screens||[]).map(p=>p.id));
    if(user.rol==='administrador')return new Set(screens.map(p=>p.id));
    const groupById=makeMap(data.groups);
    const screenById=makeMap(data.screens);
    const gpByGroup=new Map();
    for(const gp of data.groupScreens){
      if(!gpByGroup.has(gp.grupo_id))gpByGroup.set(gp.grupo_id,[]);
      gpByGroup.get(gp.grupo_id).push(gp.pantalla_id);
    }
    const direct=new Set(data.userScreens.filter(r=>r.usuario_id===user.id).map(r=>r.pantalla_id));
    const output=new Set();
    for(const member of data.userGroups.filter(x=>x.usuario_id===user.id)){
      const group=groupById.get(member.grupo_id);
      if(!group?.activo||group.empresa_id!==user.empresa_id)continue;
      for(const screenId of gpByGroup.get(group.id)||[]){
        const screen=screenById.get(screenId);
        if(!screen||screen.empresa_id!==user.empresa_id)continue;
        if(member.acceso_todas_pantallas===true || direct.has(screenId)) output.add(screenId);
      }
    }
    return output;
  }

  function isProtectedScreen(screen){
    return /recursos\s*h[ií]dricos/i.test(screen.nombre||'');
  }
  function isInternalTest(screen){
    return /^(?:ñireco|prueba pc)$/i.test(screen.nombre||'');
  }
  function caution(screen){
    if(isProtectedScreen(screen))return '<span class="simple-tag simple-alert">En funcionamiento · NO TOCAR</span>';
    if(isInternalTest(screen))return '<span class="simple-tag">Prueba interna</span>';
    if(/arcuva/i.test(screen.nombre||''))return '<span class="simple-tag simple-alert">Pendiente de asignación a Arcuva</span>';
    return '';
  }

  function drawCompanySelect(){
    const box=$('simpleCompanyFilter');if(!box||!snapshot)return;
    const prev=companyChoice;
    box.innerHTML='<option value="all">Todas las empresas</option>'
      +snapshot.companies.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre_fantasia)+'</option>').join('');
    if(prev==='all'||snapshot.companies.some(c=>c.id===prev))box.value=prev;
    else{box.value='all';companyChoice='all';}
  }

  function draw(){
    const root=$('simpleModelContent');
    if(!root||!snapshot)return;
    const data=snapshot,companiesById=makeMap(data.companies);
    const filteredScreens=data.screens.filter(p=>companyChoice==='all'||p.empresa_id===companyChoice);
    const filteredUsers=data.users.filter(u=>companyChoice==='all'||u.empresa_id===companyChoice);
    const chosenCompany=companiesById.get(companyChoice);
    const cards=data.companies.filter(c=>companyChoice==='all'||c.id===companyChoice).map(company=>{
      const count=data.screens.filter(p=>p.empresa_id===company.id).length;
      const users=data.users.filter(u=>u.empresa_id===company.id).length;
      return '<div class="simple-company-card"><div class="simple-company-name">'+esc(company.nombre_fantasia)+'</div>'
        +'<div class="simple-company-facts">'+count+' pantalla(s) · '+users+' usuario(s)</div>'
        +(company.slug==='nextwork'?'<div class="simple-company-facts">Empresa operadora y ámbito actual de las pruebas</div>':'')
        +'</div>';
    }).join('');

    const screenRows=filteredScreens.map(p=>{
      const owner=companiesById.get(p.empresa_id)?.nombre_fantasia||'Sin empresa';
      return '<tr><td><strong>'+esc(p.nombre)+'</strong><div class="simple-cell-note">'+esc(p.ubicacion||'')+'</div></td>'
        +'<td>'+esc(owner)+'</td><td>'+caution(p)+'</td></tr>';
    }).join('');
    const userRows=filteredUsers.map(u=>{
      const company=companiesById.get(u.empresa_id)?.nombre_fantasia||'Sin empresa';
      const effective=registeredScreensForUser(u,data);
      return '<tr><td><strong>'+esc(u.nombre||u.email)+'</strong><div class="simple-cell-note">'+esc(u.email)+'</div></td>'
        +'<td>'+esc(company)+'</td><td>'+esc(u.es_superadmin?'Superadmin':u.rol)+'</td>'
        +'<td>'+((u.es_superadmin)?'Acceso global':effective.size+' pantalla(s)')+'</td>'
        +'<td><button type="button" class="btn btn-outline btn-sm" onclick="stageSimpleSelectUser(\''+esc(u.id)+'\')">Ver accesos</button></td></tr>';
    }).join('');

    root.innerHTML='<div class="simple-section"><div class="simple-section-top"><h3>1 · Empresas</h3><span class="simple-tag">Empresa → Pantallas → Usuarios</span></div>'
      +'<div class="simple-company-grid">'+cards+'</div></div>'
      +'<div class="simple-section"><h3>2 · Pantallas registradas</h3>'
      +'<p class="simple-cell-note">La empresa propietaria se lee directamente de Supabase. No se deduce del nombre de los grupos.</p>'
      +'<div class="simple-table-scroll"><table><thead><tr><th>Pantalla</th><th>Empresa actual</th><th>Protección</th></tr></thead><tbody>'
      +(screenRows||'<tr><td colspan="3">Esta empresa todavía no tiene pantallas propias.</td></tr>')
      +'</tbody></table></div></div>'
      +'<div class="simple-section"><h3>3 · Usuarios y acceso directo a pantallas</h3>'
      +'<p class="simple-cell-note">La simulación toma como base los accesos efectivos actuales. Ninguna selección se guarda ni cambia los permisos reales.</p>'
      +'<div class="simple-table-scroll"><table><thead><tr><th>Usuario</th><th>Empresa</th><th>Rol</th><th>Acceso actual</th><th></th></tr></thead><tbody>'
      +(userRows||'<tr><td colspan="5">No hay usuarios de esta empresa.</td></tr>')
      +'</tbody></table></div><div id="simpleAccessPlanner"></div></div>'
      +'<div class="simple-legacy-note">**Compatibilidad actual:** el reproductor Hídricos, sus campañas y los permisos antiguos siguen utilizando los datos vigentes. Esta página solo permite validar el diseño nuevo; aún no reemplaza la autorización por grupos.</div>';
    // Conservar la selección si la empresa sigue siendo visible.
    const allowedUsers=new Set(filteredUsers.map(u=>u.id));
    if(!allowedUsers.has(userChoice))userChoice='';
    drawPlanner();
  }

  function drawPlanner(){
    const host=$('simpleAccessPlanner');
    if(!host||!snapshot)return;
    if(!userChoice){host.innerHTML='<div class="simple-planner-placeholder">Elegí <strong>Ver accesos</strong> en un usuario para simular qué pantallas podrá administrar con el nuevo modelo.</div>';return;}
    const data=snapshot,user=data.users.find(u=>u.id===userChoice);
    if(!user){userChoice='';drawPlanner();return;}
    const owner=data.companies.find(c=>c.id===user.empresa_id);
    const real=registeredScreensForUser(user,data);
    const screens=data.screens.filter(p=>user.es_superadmin||p.empresa_id===user.empresa_id);
    const html=screens.map(p=>{
      const checked=user.es_superadmin||proposed.has(p.id);
      return '<label class="simple-screen-item"><input type="checkbox" class="simple-screen-check" value="'+esc(p.id)+'" '
        +(checked?'checked ':'')+(user.es_superadmin?'disabled ':'')+'onchange="stageSimpleToggleScreen(\''+esc(p.id)+'\',this.checked)">'
        +'<span><strong>'+esc(p.nombre)+'</strong><span class="simple-cell-note">'+esc(p.ubicacion||'')+'</span>'+caution(p)+'</span></label>';
    }).join('');
    host.innerHTML='<div class="simple-planner"><div class="simple-section-top"><h4>Probar accesos · '+esc(user.nombre||user.email)+'</h4>'
      +'<span class="simple-tag">'+esc(owner?.nombre_fantasia||'Sin empresa')+'</span></div>'
      +(user.es_superadmin
        ?'<p>La cuenta superadmin tiene acceso automático a todas las pantallas del sistema. No necesita permisos individuales.</p>'
        :'<p>Elegí las pantallas que este usuario debería ver. Solo se muestran las que pertenecen a su empresa.</p>')
      +'<div class="simple-screen-grid">'+(html||'<div class="simple-warning">Esta empresa todavía no tiene pantallas propias. No se pueden asignar pantallas de NextWork por su nombre o por compartir un grupo.</div>')+'</div>'
      +'<div class="simple-planner-result"><div><strong>Acceso actual:</strong> '+real.size+' pantalla(s)</div>'
      +'<div><strong>Propuesta:</strong> '+(user.es_superadmin?data.screens.length:proposed.size)+' pantalla(s)</div></div>'
      +'<div class="simple-warning">SIMULACIÓN · No se modifican los permisos reales. La nueva asignación directa se activará después de adaptar y probar las políticas de acceso.</div>'
      +(user.es_superadmin?'':'<button type="button" class="btn btn-outline btn-sm" onclick="stageSimpleResetUser()">Restablecer selección actual</button>')
      +'</div>';
  }

  function selectUser(id){
    if(!snapshot)return;
    const selected=snapshot.users.find(u=>u.id===id);
    if(!selected)return;
    userChoice=id;
    proposed=registeredScreensForUser(selected,snapshot);
    dirty=false;
    drawPlanner();
    $('simpleAccessPlanner')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function toggleScreen(id,checked){
    if(!snapshot||!userChoice)return;
    const user=snapshot.users.find(u=>u.id===userChoice);
    if(!user||user.es_superadmin)return;
    const screen=snapshot.screens.find(p=>p.id===id);
    if(!screen||screen.empresa_id!==user.empresa_id)return;
    if(checked)proposed.add(id);else proposed.delete(id);
    dirty=true;
    drawPlanner();
  }
  function resetUser(){
    const user=snapshot?.users.find(u=>u.id===userChoice);
    if(!user)return;
    proposed=registeredScreensForUser(user,snapshot);
    dirty=false;drawPlanner();
  }
  function changeCompany(value){
    companyChoice=value;userChoice='';proposed=new Set();dirty=false;draw();
  }
  async function load(){
    if(!isSuperAdmin())return;
    const host=$('simpleModelContent');if(!host||loading)return;
    loading=true;host.innerHTML='<div class="simple-planner-placeholder">Consultando empresas, pantallas y usuarios…</div>';
    try{
      const results=await Promise.all([
        sb.from('empresas').select('id,slug,nombre_fantasia,activo').order('nombre_fantasia'),
        sb.from('pantallas').select('id,nombre,ubicacion,empresa_id,activo').order('nombre'),
        sb.from('usuarios').select('id,nombre,email,empresa_id,rol,es_superadmin,activo').order('nombre'),
        sb.from('grupos').select('id,nombre,activo,empresa_id'),
        sb.from('grupos_pantallas').select('grupo_id,pantalla_id'),
        sb.from('usuarios_grupos').select('usuario_id,grupo_id,acceso_todas_pantallas'),
        sb.from('usuarios_pantallas').select('usuario_id,pantalla_id')
      ]);
      const failure=results.find(x=>x.error)?.error;
      if(failure)throw failure;
      const [companies,screens,users,groups,groupScreens,userGroups,userScreens]=results.map(r=>r.data||[]);
      snapshot={companies,screens,users,groups,groupScreens,userGroups,userScreens};
      userChoice='';proposed=new Set();dirty=false;
      drawCompanySelect();
      draw();
    }catch(err){
      host.innerHTML='<div class="simple-warning">No se pudieron leer los datos: '+esc(err.message||String(err))+'</div>';
      console.error('Administración simplificada (pruebas):',err);
    }finally{loading=false;}
  }
  window.stageSimpleLoad=load;
  window.stageSimpleFilterCompany=changeCompany;
  window.stageSimpleSelectUser=selectUser;
  window.stageSimpleToggleScreen=toggleScreen;
  window.stageSimpleResetUser=resetUser;
})();