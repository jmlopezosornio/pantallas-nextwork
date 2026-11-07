// Alta de pantallas en empresa/grupo. Solo en el sistema de pruebas.
(function(){
 const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let grupos=[];
 async function open(){
  if(!isAdmin())return;
  const [er,gr]=await Promise.all([
    isSuperAdmin()?sb.from('empresas').select('id,nombre_fantasia').eq('activo',true).order('nombre_fantasia'):sb.from('empresas').select('id,nombre_fantasia').eq('id',currentProfile.empresa_id),
    sb.from('grupos').select('id,nombre,empresa_id,activo').eq('activo',true)]);
  if(er.error||gr.error){alert((er.error||gr.error).message);return;}
  grupos=gr.data||[];
  const companies=(er.data||[]).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre_fantasia)+'</option>').join('');
  $('modalRoot').innerHTML='<div class="modal-backdrop"><div class="modal"><h3>Nueva pantalla</h3><div class="form-grid">'
  +'<div class="field full"><label>Empresa responsable</label><select id="multiPantEmpresa" onchange="stagePantCompanyChange()" '+(!isSuperAdmin()?'disabled':'')+'>'+companies+'</select></div>'
  +'<div class="field full"><label>Grupo de la empresa</label><select id="multiPantGrupo"></select><div id="multiPantHint" class="small"></div></div>'
  +'<div class="field"><label>Nombre</label><input id="multiPantNombre"></div><div class="field"><label>Ubicación</label><input id="multiPantLugar"></div>'
  +'<div class="field"><label>Ancho LED</label><input id="multiPantAncho" type="number" min="1"></div><div class="field"><label>Alto LED</label><input id="multiPantAlto" type="number" min="1"></div>'
  +'<div class="field"><label>Hora de inicio</label><input id="multiPantInicio" type="time" value="06:00"></div><div class="field"><label>Hora de fin</label><input id="multiPantFin" type="time" value="01:00"></div>'
  +'<div class="field"><label>Licencia inicial</label><select id="multiPantLicencia"><option value="prueba">Prueba</option><option value="activa">Activa</option><option value="suspendida">Suspendida</option></select></div>'
  +'<div class="field"><label>Válida hasta</label><input id="multiPantHasta" type="date"></div>'
  +'<div class="field full"><label>Tipo de reproductor</label><select id="multiPantPlayerTipo" onchange="stagePantPlayerChange()"><option value="">Sin vincular (configurar más tarde)</option><option value="novastar_taurus">NovaStar Taurus / VNNOX</option><option value="windows">PC Windows</option><option value="raspberry">Raspberry Pi</option></select></div>'
  +'<div id="multiPantTaurusFields" class="field full" style="display:none"><div class="form-grid"><div class="field"><label>ID del reproductor en VNNOX</label><input id="multiPantVnnoxId" placeholder="ID de VNNOX"></div><div class="field"><label>Número de serie Taurus (SN)</label><input id="multiPantVnnoxSn" placeholder="Opcional"></div></div><div class="small">El ID de VNNOX permite identificar el Taurus. No se publicarán campañas automáticamente al crear esta pantalla.</div></div>'
  +'</div><div class="actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button id="multiPantGuardar" class="btn btn-primary" onclick="stageSaveNewScreen()">Guardar pantalla</button></div></div></div>';
  const end=new Date();end.setDate(end.getDate()+30);$('multiPantHasta').value=end.toISOString().slice(0,10);
  stagePantCompanyChange();stagePantPlayerChange();
 }
 function companyChange(){
  const id=$('multiPantEmpresa')?.value;
  const opts=grupos.filter(g=>g.empresa_id===id);
  $('multiPantGrupo').innerHTML=opts.map(g=>'<option value="'+esc(g.id)+'">'+esc(g.nombre)+'</option>').join('');
  $('multiPantHint').textContent=opts.length?'La pantalla y el grupo pertenecerán a la misma empresa.':'Primero creá un grupo en esta empresa.';
  $('multiPantGuardar').disabled=!opts.length;
 }
 function playerChange(){
  const box=$('multiPantTaurusFields');
  if(box)box.style.display=$('multiPantPlayerTipo')?.value==='novastar_taurus'?'block':'none';
 }
 async function save(){
  if(!isAdmin())return;
  const empresa=$('multiPantEmpresa')?.value,grupo=$('multiPantGrupo')?.value,nombre=$('multiPantNombre')?.value.trim();
  const ancho=Number($('multiPantAncho')?.value),alto=Number($('multiPantAlto')?.value);
  if(!empresa||!grupo||!nombre||!Number.isInteger(ancho)||!Number.isInteger(alto)||ancho<1||alto<1){alert('Completá empresa, grupo, nombre y resolución.');return;}
  if(!isSuperAdmin()&&empresa!==currentProfile.empresa_id){alert('Empresa no permitida');return;}
  const tipo=$('multiPantPlayerTipo')?.value||'';
  const vnnoxId=$('multiPantVnnoxId')?.value.trim()||'';
  const vnnoxSn=$('multiPantVnnoxSn')?.value.trim()||'';
  if(tipo==='novastar_taurus'&&(!vnnoxId||vnnoxId.length>128)){
    alert('Para vincular un Taurus, ingresá su ID de reproductor en VNNOX (máximo 128 caracteres).');return;
  }
  const btn=$('multiPantGuardar');btn.disabled=true;
  const {data:screenId,error}=await sb.rpc('admin_crear_pantalla_con_empresa',{
   p_empresa_id:empresa,p_grupo_id:grupo,p_nombre:nombre,p_ubicacion:$('multiPantLugar').value.trim(),
   p_ancho:ancho,p_alto:alto,p_hora_inicio:$('multiPantInicio').value,p_hora_fin:$('multiPantFin').value,
   p_licencia_estado:$('multiPantLicencia').value,p_licencia_hasta:$('multiPantHasta').value||null});
  if(error){btn.disabled=false;alert(error.message);return;}
  if(tipo){
    const payload={pantalla_id:screenId,tipo,estado:'offline'};
    if(tipo==='novastar_taurus'){
      Object.assign(payload,{proveedor:'vnnox',vnnox_player_id:vnnoxId,vnnox_sn:vnnoxSn||null});
    }
    const {error:playerError}=await sb.from('players').insert(payload);
    if(playerError){
      closeModal();await Promise.all([loadPantallas(),loadGrupos()]);await loadDashboard();
      alert('La pantalla se creó correctamente, pero NO se vinculó el reproductor: '+playerError.message+'\\nEntrá en Editar configuración para completar la vinculación.');
      return;
    }
  }
  closeModal();await Promise.all([loadPantallas(),loadGrupos()]);await loadDashboard();
  alert(tipo==='novastar_taurus'?'Pantalla y Taurus VNNOX vinculados. La publicación automática no se activó.':tipo?'Pantalla y reproductor vinculados correctamente.':'Pantalla creada. Podés vincular un reproductor desde Editar configuración.');
 }
 window.stageOpenNewScreen=open;window.stagePantCompanyChange=companyChange;window.stagePantPlayerChange=playerChange;window.stageSaveNewScreen=save;
})();