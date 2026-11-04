// Fase 1: formularios de prueba, SIN escrituras a Supabase.
// Esta página comparte la base de producción: no activamos altas reales hasta completar migración.
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function context(){
    if(typeof isSuperAdmin!=='function'||!isSuperAdmin())return null;
    return typeof stageSimpleGetSnapshot==='function'?stageSimpleGetSnapshot():null;
  }
  function availableCompanies(data){
    return (data?.companies||[]).filter(c=>c.activo!==false);
  }
  function companyOptions(data){
    const selected=typeof stageSimpleGetCurrentCompany==='function'?stageSimpleGetCurrentCompany():'all';
    return availableCompanies(data).map(c=>'<option value="'+esc(c.id)+'" '+(c.id===selected?'selected':'')+'>'+esc(c.nombre_fantasia)+'</option>').join('');
  }
  function safeModal(title,body){
    $('modalRoot').innerHTML='<div class="modal-backdrop"><div class="modal" style="max-width:760px;max-height:90vh;overflow-y:auto">'
      +'<h3>'+esc(title)+'</h3><div class="content-box" style="background:#fff9eb;border:1px solid #f0dab1;color:#81500d;margin-bottom:16px">'
      +'<strong>SIMULACIÓN · No crea ni modifica registros reales</strong></div>'
      +body+'<div class="actions"><button class="btn btn-ghost" onclick="closeModal()">Cerrar</button>'
      +'<button class="btn btn-primary" onclick="stageSimpleShowFormPreview()">Previsualizar</button></div>'
      +'<div id="simpleFormPreview" aria-live="polite" style="margin-top:14px"></div>'
      +'</div></div>';
  }
  let activeForm='';
  function mockScreen(){
    const data=context();if(!data)return;
    activeForm='screen';
    safeModal('Nueva pantalla · Modelo simplificado',
      '<div class="form-grid">'
      +'<div class="field full"><label>Empresa responsable</label><select id="demoScreenCompany">'+companyOptions(data)+'</select></div>'
      +'<div class="field full"><label>Nombre de pantalla</label><input id="demoScreenName" placeholder="Ej. SMA 02"></div>'
      +'<div class="field full"><label>Ubicación</label><input id="demoScreenLocation" placeholder="Ej. San Martín de los Andes"></div>'
      +'<div class="field"><label>Ancho (px)</label><input id="demoScreenWidth" type="number" min="1" placeholder="240"></div>'
      +'<div class="field"><label>Alto (px)</label><input id="demoScreenHeight" type="number" min="1" placeholder="280"></div>'
      +'</div>'
      +'<p class="small" style="margin:10px 0">El diseño nuevo no pedirá grupos. En la futura implementación, la pantalla quedará asociada directamente a su empresa.</p>');
  }
  function mockUser(){
    const data=context();if(!data)return;
    activeForm='user';
    safeModal('Nuevo usuario · Modelo simplificado',
      '<div class="form-grid">'
      +'<div class="field"><label>Nombre</label><input id="demoUserName" placeholder="Nombre y apellido"></div>'
      +'<div class="field"><label>Correo electrónico</label><input id="demoUserEmail" type="email" placeholder="usuario@empresa.com.ar"></div>'
      +'<div class="field"><label>Empresa</label><select id="demoUserCompany" onchange="stageSimpleMockUserCompanyChanged()">'+companyOptions(data)+'</select></div>'
      +'<div class="field"><label>Rol</label><select id="demoUserRole"><option value="administrativo">Administrativo</option><option value="operador">Operador</option><option value="administrador">Administrador de empresa</option></select></div>'
      +'<div class="field full"><label>Pantallas a las que tendrá acceso</label><div id="demoUserScreens"></div></div>'
      +'</div><p class="small" style="margin:10px 0">No hay grupos en este formulario. Solo aparecen pantallas cuyo propietario real sea la empresa elegida.</p>');
    mockUserCompanyChanged();
  }
  function mockUserCompanyChanged(){
    const data=context(),container=$('demoUserScreens');if(!data||!container)return;
    const companyId=$('demoUserCompany')?.value;
    const screens=data.screens.filter(p=>p.empresa_id===companyId);
    container.innerHTML=screens.length
      ?'<label style="display:flex;gap:9px;margin-bottom:10px"><input type="checkbox" id="demoUserAll" onchange="stageSimpleMockSelectAll(this.checked)" style="width:auto"><b>Todas las pantallas</b></label>'
        +screens.map(p=>'<label style="display:flex;align-items:center;gap:10px;margin:8px 0"><input class="demoUserScreen" type="checkbox" value="'+esc(p.id)+'" style="width:auto"><span>'+esc(p.nombre)+'</span></label>').join('')
      :'<div class="simple-warning">La empresa no tiene pantallas propias. No se pueden seleccionar pantallas de otras empresas aunque compartan nombres o grupos.</div>';
  }
  function mockSelectAll(v){
    document.querySelectorAll('.demoUserScreen').forEach(x=>x.checked=v);
  }
  function preview(){
    const data=context(),out=$('simpleFormPreview');if(!out||!data)return;
    if(activeForm==='screen'){
      const name=$('demoScreenName')?.value.trim()||'Sin nombre',
        location=$('demoScreenLocation')?.value.trim()||'Sin ubicación',
        company=data.companies.find(c=>c.id===$('demoScreenCompany')?.value),
        width=$('demoScreenWidth')?.value||'—',height=$('demoScreenHeight')?.value||'—';
      out.innerHTML='<div class="content-box"><strong>Vista previa de pantalla</strong><p>'
        +esc(name)+' · '+esc(location)+'</p><p><strong>Empresa:</strong> '+esc(company?.nombre_fantasia||'No asignada')+'</p>'
        +'<p><strong>Resolución:</strong> '+esc(width)+' × '+esc(height)+'</p>'
        +'<p class="small">No se guardó ninguna pantalla ni se vinculó ningún reproductor.</p></div>';
    }else if(activeForm==='user'){
      const company=data.companies.find(c=>c.id===$('demoUserCompany')?.value);
      const ids=new Set([...document.querySelectorAll('.demoUserScreen:checked')].map(x=>x.value));
      const screens=data.screens.filter(x=>ids.has(x.id));
      out.innerHTML='<div class="content-box"><strong>Vista previa de usuario</strong><p>'+esc($('demoUserName')?.value.trim()||'Sin nombre')
        +' · '+esc($('demoUserEmail')?.value.trim()||'Sin correo')+'</p><p><strong>Empresa:</strong> '+esc(company?.nombre_fantasia||'No asignada')
        +' · <strong>Rol:</strong> '+esc($('demoUserRole')?.value||'—')+'</p><p><strong>Pantallas seleccionadas:</strong> '
        +esc(screens.map(p=>p.nombre).join(', ')||'Ninguna')+'</p>'
        +'<p class="small">No se creó usuario ni se modificaron permisos reales.</p></div>';
    }
  }
  window.stageSimpleMockScreen=mockScreen;
  window.stageSimpleMockUser=mockUser;
  window.stageSimpleMockUserCompanyChanged=mockUserCompanyChanged;
  window.stageSimpleMockSelectAll=mockSelectAll;
  window.stageSimpleShowFormPreview=preview;
})();