// Gestión de grupos y pantallas por empresa. SOLO versión de pruebas.
// No altera el menú principal ni trabaja con observadores o intervalos.
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const state={empresaId:null,usuarioId:null};

  async function openEmpresaPantallas(empresaId,usuarioId=''){
    if(!isSuperAdmin()) return;
    state.empresaId=empresaId;
    state.usuarioId=usuarioId;
    await renderEmpresaPantallas();
  }

  function status(message, error=false){
    const el=$('empresaPantallasStatus');
    if(el){el.textContent=message;el.style.color=error?'#b91c1c':'#166534';}
  }

  async function renderEmpresaPantallas(){
    if(!isSuperAdmin()||!state.empresaId) return;
    const [co,groupsResult,screensResult,linksResult,campaignsResult,playerResult]=await Promise.all([
      sb.from('empresas').select('id,nombre_fantasia,activo').order('nombre_fantasia'),
      sb.from('grupos').select('id,nombre,empresa_id,activo').order('nombre'),
      sb.from('pantallas').select('id,nombre,ubicacion,empresa_id').order('nombre'),
      sb.from('grupos_pantallas').select('grupo_id,pantalla_id'),
      sb.from('campanias_pantallas').select('campania_id,pantalla_id'),
      sb.from('players').select('id,pantalla_id')
    ]);
    const err=[co,groupsResult,screensResult,linksResult,campaignsResult,playerResult].find(x=>x.error)?.error;
    if(err){alert('No se pudo consultar las pantallas: '+err.message);return;}
    const empresas=co.data||[],grupos=groupsResult.data||[],pantallas=screensResult.data||[],links=linksResult.data||[];
    const empresa=empresas.find(x=>x.id===state.empresaId);
    if(!empresa){alert('La empresa seleccionada no existe.');return;}
    const propios=grupos.filter(g=>g.empresa_id===empresa.id&&g.activo);
    const pantallasPropias=pantallas.filter(p=>p.empresa_id===empresa.id);
    const ajenas=pantallas.filter(p=>p.empresa_id!==empresa.id);
    const groupOpts=propios.map(g=>'<option value="'+esc(g.id)+'">'+esc(g.nombre)+'</option>').join('');
    const groupLabels=id=>links.filter(l=>l.pantalla_id===id).map(l=>grupos.find(g=>g.id===l.grupo_id)?.nombre||'Grupo').join(', ');
    const counts=id=>({
      campaigns:(campaignsResult.data||[]).filter(c=>c.pantalla_id===id).length,
      players:(playerResult.data||[]).filter(p=>p.pantalla_id===id).length
    });
    const ownMarkup=pantallasPropias.map(p=>{
      const groups=groupLabels(p.id)||'Sin grupo';
      return '<div class="content-box" style="margin-bottom:8px"><div style="font-weight:800">'+esc(p.nombre)+'</div><div class="small">Grupo: '+esc(groups)+'</div>'
       + (propios.length?'<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><select id="linkGrupo-'+esc(p.id)+'">'+groupOpts+'</select><button type="button" class="btn btn-outline btn-sm" onclick="vincularPantallaEmpresa(\''+esc(p.id)+'\')">Vincular a grupo</button></div>':'')+'</div>';
    }).join('');
    const otherMarkup=ajenas.map(p=>{
      const source=empresas.find(e=>e.id===p.empresa_id)?.nombre_fantasia||'Otra empresa';
      const c=counts(p.id);
      return '<div class="content-box" style="margin-bottom:8px"><div style="font-weight:850">'+esc(p.nombre)+'</div>'
        +'<div class="small">Pertenece a '+esc(source)+' · '+c.campaigns+' campañas · '+c.players+' reproductor(es)</div>'
        +(propios.length?'<div style="display:flex;gap:8px;align-items:center;margin-top:10px"><select id="transferGrupo-'+esc(p.id)+'">'+groupOpts+'</select><button type="button" class="btn btn-outline btn-sm" onclick="transferirPantallaEmpresa(\''+esc(p.id)+'\')">Trasladar</button></div>':'<div class="small" style="margin-top:6px">Primero creá un grupo de destino.</div>')+'</div>';
    }).join('');
    const note='Al trasladar una pantalla con campañas, se trasladarán únicamente las campañas y clientes exclusivos de esa pantalla. Si hay campañas compartidas con otras pantallas, la operación se rechazará. Se conserva el reproductor y su identificador. Podría ser necesario revisar la publicación después.';
    $('modalRoot').innerHTML='<div class="modal-backdrop" onclick="if(event.target===this) closeModal()">'
      +'<div class="modal" style="width:min(980px,96vw);max-height:90vh;overflow-y:auto">'
      +'<h3>Grupos y pantallas · '+esc(empresa.nombre_fantasia)+'</h3>'
      +'<div class="small" style="margin:6px 0 16px;color:#a34b09;font-weight:750">PRUEBAS: los cambios se guardan en la base real de Supabase.</div>'
      +'<div class="field"><label>Crear grupo propio de '+esc(empresa.nombre_fantasia)+'</label>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="nuevoGrupoEmpresa" placeholder="Ej. GENERAL o Cartelería SMA" style="flex:1;min-width:230px"><button class="btn btn-primary" type="button" onclick="crearGrupoEmpresa()">+ Crear grupo</button></div>'
      +'<div class="small" style="margin-top:5px">Grupos existentes: '+(propios.map(g=>esc(g.nombre)).join(', ')||'ninguno')+'</div></div>'

      +'<h4 style="margin:20px 0 9px">Registrar pantalla nueva</h4>'
      +'<p class="small" style="margin:0 0 10px">Da de alta una pantalla nueva directamente en esta empresa. No modifica pantallas existentes.</p>'
      +'<div class="form-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px">'
      +'<div class="field"><label>Nombre</label><input id="registroPantallaNombre" placeholder="Ej. Pantalla SMA 02"></div>'
      +'<div class="field"><label>Ubicación</label><input id="registroPantallaUbicacion" placeholder="Ej. San Martín de los Andes"></div>'
      +'<div class="field"><label>Ancho (px)</label><input id="registroPantallaAncho" type="number" min="1" value="240"></div>'
      +'<div class="field"><label>Alto (px)</label><input id="registroPantallaAlto" type="number" min="1" value="280"></div>'
      +'<div class="field"><label>Hora de inicio</label><input id="registroPantallaInicio" type="time" value="06:00"></div>'
      +'<div class="field"><label>Hora de finalización</label><input id="registroPantallaFin" type="time" value="01:00"></div>'
      +'<div class="field"><label>Grupo de la pantalla</label><select id="registroPantallaGrupo">'+groupOpts+'</select></div>'
      +'<div style="display:flex;align-items:end"><button class="btn btn-primary" type="button" onclick="registrarPantallaEmpresa()" '+(!propios.length?'disabled':'')+'>+ Registrar pantalla</button></div></div>'
      +(!propios.length?'<div class="small" style="margin-top:6px">Antes de registrar una pantalla, creá un grupo propio de esta empresa.</div>':'')
      +'<h4 style="margin:20px 0 10px">Pantallas propias ('+pantallasPropias.length+')</h4>'
      +(ownMarkup||'<div class="empty">Esta empresa aún no tiene pantallas. Creá un grupo y seleccioná una pantalla para trasladar.</div>')
      +'<h4 style="margin:20px 0 10px">Pantallas registradas en otras empresas</h4>'
      +'<p class="small" style="margin:0 0 10px">'+esc(note)+'</p>'
      +(otherMarkup||'<div class="small">No hay otras pantallas.</div>')
      +'<p id="empresaPantallasStatus" class="small" aria-live="polite" style="margin-top:12px"></p>'
      +'<div class="actions" style="margin-top:16px"><button class="btn btn-ghost" type="button" onclick="closeModal()">Cerrar</button>'
      +(state.usuarioId?'<button class="btn btn-primary" type="button" onclick="volverPermisosEmpresa()">Volver a permisos</button>':'')
      +'</div></div></div>';
  }

  async function crearGrupoEmpresa(){
    if(!isSuperAdmin())return;
    const name=$('nuevoGrupoEmpresa')?.value.trim();
    if(!name){status('Ingresá un nombre para el grupo.',true);return;}
    const {error}=await sb.from('grupos').insert({nombre:name,descripcion:'Grupo de '+name,empresa_id:state.empresaId,activo:true});
    if(error){status(error.message,true);return;}
    await renderEmpresaPantallas();
    status('Grupo creado. Ya podés asociarle pantallas y luego asignarlo al usuario.');
  }

  async function registrarPantallaEmpresa(){
    if(!isSuperAdmin())return;
    const nombre=$('registroPantallaNombre')?.value.trim();
    const ubicacion=$('registroPantallaUbicacion')?.value.trim()||'';
    const ancho=Number($('registroPantallaAncho')?.value);
    const alto=Number($('registroPantallaAlto')?.value);
    const grupoId=$('registroPantallaGrupo')?.value;
    const inicio=$('registroPantallaInicio')?.value || '06:00';
    const fin=$('registroPantallaFin')?.value || '01:00';
    if(!nombre||!grupoId||!Number.isInteger(ancho)||!Number.isInteger(alto)||ancho<1||alto<1){
      status('Completá nombre, grupo y resolución válida.',true);return;
    }
    if(!confirm('¿Registrar la pantalla '+nombre+' en la empresa seleccionada? La pantalla será creada en Supabase, sin reproductor vinculado.'))return;
    const {error}=await sb.rpc('superadmin_crear_pantalla_empresa',{
      p_empresa_id:state.empresaId,p_grupo_id:grupoId,p_nombre:nombre,
      p_ubicacion:ubicacion,p_ancho:ancho,p_alto:alto,
      p_hora_inicio:inicio,p_hora_fin:fin
    });
    if(error){status('No se pudo registrar la pantalla: '+error.message,true);return;}
    await renderEmpresaPantallas();
    status('Pantalla creada con su grupo. Ahora podés vincularle un reproductor y asignar permisos al usuario.');
  }

  async function vincularPantallaEmpresa(screenId){
    if(!isSuperAdmin())return;
    const groupId=$('linkGrupo-'+screenId)?.value;
    if(!groupId){status('Creá o seleccioná un grupo.',true);return;}
    const [{data:screen},{data:group},{data:link}]=await Promise.all([
      sb.from('pantallas').select('empresa_id').eq('id',screenId).single(),
      sb.from('grupos').select('empresa_id').eq('id',groupId).single(),
      sb.from('grupos_pantallas').select('grupo_id').eq('grupo_id',groupId).eq('pantalla_id',screenId).maybeSingle()
    ]);
    if(!screen||!group||screen.empresa_id!==state.empresaId||group.empresa_id!==state.empresaId){
      status('Pantalla y grupo deben pertenecer a la misma empresa.',true);return;
    }
    if(link){status('Esta pantalla ya está vinculada a ese grupo.');return;}
    const {error}=await sb.from('grupos_pantallas').insert({grupo_id:groupId,pantalla_id:screenId});
    if(error){status(error.message,true);return;}
    await renderEmpresaPantallas();status('Pantalla vinculada. Volvé a Permisos para habilitar al usuario.');
  }

  async function transferirPantallaEmpresa(screenId){
    if(!isSuperAdmin())return;
    const groupId=$('transferGrupo-'+screenId)?.value;
    if(!groupId){status('Elegí un grupo de destino.',true);return;}
    const [screenResult,campaignsResult,playersResult,groupResult]=await Promise.all([
      sb.from('pantallas').select('nombre,empresa_id').eq('id',screenId).single(),
      sb.from('campanias_pantallas').select('campania_id').eq('pantalla_id',screenId),
      sb.from('players').select('id').eq('pantalla_id',screenId),
      sb.from('grupos').select('nombre,empresa_id').eq('id',groupId).single()
    ]);
    const screen=screenResult.data,group=groupResult.data;
    const err=screenResult.error||campaignsResult.error||playersResult.error||groupResult.error;
    if(err){status(err.message,true);return;}
    if(screen.empresa_id===state.empresaId || group.empresa_id!==state.empresaId){
      status('La pantalla y el grupo deben tener empresas de origen/destino válidas.',true);return;
    }
    const text='CONFIRMACIÓN DE TRASLADO REAL\n\nPantalla: '+screen.nombre+'\n'
      +'Campañas vinculadas: '+(campaignsResult.data||[]).length+'\n'
      +'Reproductores conservados: '+(playersResult.data||[]).length+'\n'
      +'Grupo de destino: '+group.nombre+'\n\n'
      +'Las campañas y clientes exclusivos también pasarán de empresa. '
      +'Se quitarán las asignaciones directas de usuarios de la empresa anterior. '
      +'El contenido del reproductor puede requerir revisión después.\n\n'
      +'¿Querés ejecutar el traslado?';
    if(!confirm(text))return;
    const {data,error}=await sb.rpc('superadmin_trasladar_pantalla',{
      p_pantalla_id:screenId,p_empresa_destino:state.empresaId,p_grupo_destino:groupId
    });
    if(error){status('Traslado rechazado: '+error.message,true);return;}
    await renderEmpresaPantallas();
    status('Pantalla trasladada: '+(data?.campanias||0)+' campañas y '+(data?.clientes||0)+' clientes; reproductor conservado. Revisá la publicación y asigná los permisos al usuario.');
  }

  async function volverPermisosEmpresa(){
    const usuarioId=state.usuarioId;
    closeModal();
    if(usuarioId && typeof window.openUsuarioAccesos==='function') await window.openUsuarioAccesos(usuarioId);
  }
  window.openEmpresaPantallas=openEmpresaPantallas;
  window.crearGrupoEmpresa=crearGrupoEmpresa;
  window.vincularPantallaEmpresa=vincularPantallaEmpresa;
  window.registrarPantallaEmpresa=registrarPantallaEmpresa;
  window.transferirPantallaEmpresa=transferirPantallaEmpresa;
  window.volverPermisosEmpresa=volverPermisosEmpresa;
})();