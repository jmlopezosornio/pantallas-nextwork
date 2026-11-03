// NextWork: administración de empresas para la COPIA DE PRUEBA.
// Los botones, la sección y los permisos se definen nativamente en pruebas-sistema/app-base.html.
// Este módulo solo aporta los controladores; no inyecta navegación ni usa temporizadores.
(function(){
'use strict';
const BUCKET='company-branding';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const slugify=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
let companies=[],selectedFile=null;
async function stageLoadCompanies(){
  if(!isSuperAdmin()) return;
  $('companiesGrid').innerHTML='<div class="empty">Cargando empresas...</div>';
  const {data,error}=await sb.from('empresas').select('id,slug,nombre_fantasia,razon_social,logo_url,color_primario,color_secundario,activo,creado_en,actualizado_en').order('creado_en',{ascending:true});
  if(error){$('companiesGrid').innerHTML=`<div class="empty">Error: ${esc(error.message)}</div>`;return;}
  companies=data||[]; stageRenderCompanies();
}
function stageRenderCompanies(){
  $('companyCount').textContent=`${companies.length} empresa${companies.length===1?'':'s'}`;
  if(!companies.length){$('companiesGrid').innerHTML='<div class="empty">Todavía no hay empresas creadas.</div>';return;}
  $('companiesGrid').innerHTML=companies.map(c=>{
    const n=c.nombre_fantasia||'Empresa', c1=c.color_primario||'#0b2b59', c2=c.color_secundario||'#1769d2';
    return `<article class="card"><div class="card-top" style="--c1:${esc(c1)};--c2:${esc(c2)}"></div><div class="card-body"><div class="logo-box">${c.logo_url?`<img src="${esc(c.logo_url)}" alt="Logo ${esc(n)}">`:`<div class="logo-placeholder">${esc(n.slice(0,2).toUpperCase())}</div>`}</div><div class="name">${esc(n)}</div><div class="legal">${esc(c.razon_social||'Sin razón social')}<br><span>${esc(c.slug||'')}</span></div><div class="meta"><div class="dots"><span class="dot" style="background:${esc(c1)}"></span><span class="dot" style="background:${esc(c2)}"></span></div><span class="state ${c.activo?'on':'off'}">${c.activo?'ACTIVA':'INACTIVA'}</span></div><div class="actions"><button class="btn btn-soft" onclick="stageOpenCompany('${c.id}')">Editar</button><button class="btn btn-soft" onclick="openEmpresaPantallas('${c.id}')">Grupos y pantallas</button><button class="btn ${c.activo?'btn-danger':'btn-primary'}" onclick="stageToggleCompany('${c.id}',${c.activo?'false':'true'})">${c.activo?'Desactivar':'Activar'}</button></div></div></article>`;
  }).join('');
}
function stageCloseCompanyModal(){$('modalRoot').innerHTML='';selectedFile=null;}
function stageOpenCompany(id=null){
  if(!isSuperAdmin()) return;
  selectedFile=null;
  const c=id?companies.find(x=>x.id===id):null;
  const c1=c?.color_primario||'#0b2b59', c2=c?.color_secundario||'#1769d2';
  $('modalRoot').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this) stageCloseCompanyModal()"><div class="modal stage-company-modal"><h3>${c?'Editar empresa':'Nueva empresa'}</h3><div class="form-grid"><div class="field"><label>Nombre comercial</label><input id="fNombre" value="${esc(c?.nombre_fantasia||'')}"></div><div class="field"><label>Razón social</label><input id="fRazon" value="${esc(c?.razon_social||'')}"></div><div class="field full"><label>Identificador interno (slug)</label><input id="fSlug" value="${esc(c?.slug||'')}"><div class="msg">Si lo dejás vacío se genera automáticamente.</div></div><div class="field"><label>Color principal</label><div class="color-row"><input id="pColor1" type="color" value="${esc(c1)}"><input id="fColor1" value="${esc(c1)}"></div></div><div class="field"><label>Color secundario</label><div class="color-row"><input id="pColor2" type="color" value="${esc(c2)}"><input id="fColor2" value="${esc(c2)}"></div></div><div class="field full"><label>Logo corporativo</label><input id="fLogo" type="file" accept="image/png,image/jpeg,image/webp"><div id="logoPreview" class="preview">${c?.logo_url?`<img src="${esc(c.logo_url)}" alt="Logo">`:'<span class="msg">Sin logo seleccionado</span>'}</div><div class="msg">PNG, JPG o WebP · máximo 2 MB.</div></div></div><div class="modal-actions"><button class="btn btn-soft" onclick="stageCloseCompanyModal()">Cancelar</button><button class="btn btn-primary" id="btnGuardar">${c?'Guardar cambios':'Crear empresa'}</button></div></div></div>`;
  const p1=$('pColor1'),f1=$('fColor1'),p2=$('pColor2'),f2=$('fColor2');
  p1.oninput=()=>f1.value=p1.value; f1.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(f1.value))p1.value=f1.value}; p2.oninput=()=>f2.value=p2.value; f2.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(f2.value))p2.value=f2.value};
  $('fLogo').onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)){alert('Formato de imagen no válido.');e.target.value='';return;}if(f.size>2*1024*1024){alert('El archivo supera 2 MB.');e.target.value='';return;}selectedFile=f;const url=URL.createObjectURL(f);$('logoPreview').innerHTML=`<img src="${url}" alt="Vista previa">`;};
  $('btnGuardar').onclick=()=>stageSaveCompany(c?.id||null,c?.logo_url||null);
}
async function stageUploadLogo(companyId,file){
  const ext=(file.name.split('.').pop()||'png').toLowerCase();
  const path=`${companyId}/logo-${Date.now()}.${ext}`;
  const {error}=await sb.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
  if(error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
async function stageSaveCompany(id,currentLogo){
  if(!isSuperAdmin()) return;
  const btn=$('btnGuardar'); btn.disabled=true; btn.textContent='Guardando...';
  let datosGuardados=false;
  try{
    const nombre=$('fNombre').value.trim(), razon=$('fRazon').value.trim();
    const slug=$('fSlug').value.trim()||slugify(nombre), color1=$('fColor1').value.trim(), color2=$('fColor2').value.trim();
    if(!nombre||!razon) throw new Error('Completá nombre comercial y razón social.');
    if(!slug) throw new Error('No se pudo generar el identificador interno.');
    if(!/^#[0-9a-f]{6}$/i.test(color1)||!/^#[0-9a-f]{6}$/i.test(color2)) throw new Error('Los colores deben tener formato #RRGGBB.');
    if(!id && companies.some(c=>c.slug===slug)) throw new Error('Esta empresa ya existe. Cerrá la ventana y pulsá Editar en su tarjeta.');
    const payload={slug,nombre:nombre,nombre_fantasia:nombre,razon_social:razon,color_primario:color1,color_secundario:color2,actualizado_en:new Date().toISOString()};
    let companyId=id;
    if(id){
      const {error}=await sb.from('empresas').update(payload).eq('id',id); if(error) throw error;
    }else{
      payload.activo=true;
      const {data,error}=await sb.from('empresas').insert(payload).select('id').single(); if(error) throw error; companyId=data.id;
    }
    datosGuardados=true;
    if(selectedFile){
      const logoUrl=await stageUploadLogo(companyId,selectedFile);
      const {error}=await sb.from('empresas').update({logo_url:logoUrl,actualizado_en:new Date().toISOString()}).eq('id',companyId); if(error) throw error;
    }
    stageCloseCompanyModal(); await stageLoadCompanies(); alert(id?'Empresa actualizada correctamente.':'Empresa creada correctamente.');
  }catch(err){
    console.error(err);
    if(datosGuardados){
      stageCloseCompanyModal();
      await stageLoadCompanies();
      alert('Los datos de la empresa quedaron guardados, pero falló la carga del logo. Editá la empresa para volver a subirlo.\n'+(err.message||err));
      return;
    }
    alert('No se pudo guardar la empresa:\n'+(err.message||err));
    btn.disabled=false;
    btn.textContent=id?'Guardar cambios':'Crear empresa';
  }
}
async function stageToggleCompany(id,activo){
  if(!isSuperAdmin()) return;
  const c=companies.find(x=>x.id===id);if(!c)return;
  if(!confirm(`¿Querés ${activo?'activar':'desactivar'} ${c.nombre_fantasia||'esta empresa'}?`))return;
  const {error}=await sb.from('empresas').update({activo,actualizado_en:new Date().toISOString()}).eq('id',id);
  if(error){alert('No se pudo cambiar el estado:\n'+error.message);return;}await stageLoadCompanies();
}

window.stageLoadCompanies=stageLoadCompanies;
window.stageOpenCompany=stageOpenCompany;
window.stageCloseCompanyModal=stageCloseCompanyModal;
window.stageToggleCompany=stageToggleCompany;
})();