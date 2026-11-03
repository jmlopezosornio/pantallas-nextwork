// Gestión global de empresas exclusiva para superadmin - NextWork
(function(){
  'use strict';

  const PAGE_ID='page-empresas';
  const NAV_ID='nav-empresas';
  const BUCKET='company-branding';
  let companies=[];
  let selectedFile=null;

  const esc=v=>String(v??'').replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
  const superAdmin=()=>{ try{return typeof isSuperAdmin==='function' && isSuperAdmin();}catch{return false;} };
  const slugify=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);

  const icon=`<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M4 21V8l5-3 5 3v13"/><path d="M14 11l3-2 3 2v10"/><path d="M7 11h2"/><path d="M7 15h2"/><path d="M16 14h2"/><path d="M16 17h2"/></svg>`;

  function injectStyles(){
    if(document.getElementById('nextwork-superadmin-companies-css')) return;
    const s=document.createElement('style');
    s.id='nextwork-superadmin-companies-css';
    s.textContent=`
      #${PAGE_ID}{max-width:1240px;margin:0 auto}.companies-head{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:18px}.companies-head h2{margin:0;font-size:25px}.companies-head p{margin:5px 0 0;color:#64748b;font-size:13px}.companies-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.company-card{background:#fff;border:1px solid #e7ecf5;border-radius:20px;box-shadow:var(--shadow);overflow:hidden}.company-card-top{height:8px;background:linear-gradient(90deg,var(--c1,#0b2b59),var(--c2,#1769d2))}.company-card-body{padding:18px}.company-logo-box{height:92px;border:1px solid #e6ebf3;border-radius:14px;background:#f8fafc;display:grid;place-items:center;margin-bottom:14px;overflow:hidden}.company-logo-box img{max-width:82%;max-height:72px;object-fit:contain}.company-logo-placeholder{font-weight:900;color:#94a3b8;font-size:20px}.company-name{font-size:19px;font-weight:900;color:#15213b;margin-bottom:4px}.company-legal{font-size:12px;color:#64748b;min-height:34px}.company-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid #edf1f6}.company-colors{display:flex;gap:6px}.company-color-dot{width:24px;height:24px;border-radius:8px;border:1px solid rgba(15,23,42,.12)}.company-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.company-actions .btn{padding:8px 11px;font-size:12px}.company-status{font-size:11px;font-weight:900;padding:6px 9px;border-radius:999px}.company-status.active{background:#dcfce7;color:#166534}.company-status.inactive{background:#fee2e2;color:#991b1b}.company-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.company-form-grid .full{grid-column:1/-1}.company-logo-preview{height:120px;border:1px dashed #cbd5e1;border-radius:14px;background:#f8fafc;display:grid;place-items:center;overflow:hidden;margin-top:8px}.company-logo-preview img{max-width:85%;max-height:92px;object-fit:contain}.company-color-input{display:grid;grid-template-columns:52px 1fr;gap:8px;align-items:center}.company-color-input input[type=color]{height:44px;padding:4px;border-radius:10px}@media(max-width:1050px){.companies-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.companies-grid{grid-template-columns:1fr}.company-form-grid{grid-template-columns:1fr}.company-form-grid .full{grid-column:auto}}
    `;
    document.head.appendChild(s);
  }

  function ensureUi(){
    if(!superAdmin()) return false;
    injectStyles();

    let btn=document.getElementById(NAV_ID);
    if(!btn){
      const anchor=document.querySelector('.nav-btn[data-page="usuarios"]');
      if(!anchor) return false;
      btn=document.createElement('button');
      btn.className='nav-btn';
      btn.id=NAV_ID;
      btn.dataset.page='empresas';
      btn.innerHTML=`<span class="nav-icon">${icon}</span><span class="nav-label">Empresas</span>`;
      anchor.insertAdjacentElement('afterend',btn);
    }
    btn.classList.remove('hidden');
    btn.style.display='flex';

    if(!document.getElementById(PAGE_ID)){
      const content=document.querySelector('.content');
      if(!content) return false;
      const section=document.createElement('section');
      section.id=PAGE_ID;
      section.className='page hidden';
      section.innerHTML=`<div class="companies-head"><div><h2>Empresas</h2><p>Alta y administración de empresas del sistema. Vista exclusiva para superadmin.</p></div><button class="btn btn-primary" id="btnNuevaEmpresa">+ Nueva empresa</button></div><div id="companiesGrid" class="companies-grid"></div>`;
      content.appendChild(section);
      document.getElementById('btnNuevaEmpresa').onclick=()=>openCompanyModal();
    }

    if(btn.dataset.bound!=='1'){
      btn.dataset.bound='1';
      btn.addEventListener('click',async()=>{
        if(!superAdmin()) return;
        document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
        document.getElementById(PAGE_ID)?.classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const title=document.querySelector('.topbar-title');
        const sub=document.querySelector('.topbar-sub');
        if(title) title.textContent='Empresas';
        if(sub) sub.textContent='Administración global de empresas';
        await loadCompanies();
      });
    }
    return true;
  }

  async function loadCompanies(){
    if(!superAdmin()) return;
    const grid=document.getElementById('companiesGrid');
    if(!grid) return;
    grid.innerHTML='<div class="empty">Cargando empresas...</div>';
    const {data,error}=await sb.from('empresas').select('id,slug,nombre,nombre_fantasia,razon_social,logo_url,color_primario,color_secundario,activo,creado_en').order('creado_en',{ascending:true});
    if(error){grid.innerHTML=`<div class="empty">No se pudieron cargar las empresas: ${esc(error.message)}</div>`;return;}
    companies=data||[];
    renderCompanies();
  }

  function renderCompanies(){
    const grid=document.getElementById('companiesGrid');
    if(!grid) return;
    if(!companies.length){grid.innerHTML='<div class="empty">Todavía no hay empresas creadas.</div>';return;}
    grid.innerHTML=companies.map(c=>`<article class="company-card"><div class="company-card-top" style="--c1:${esc(c.color_primario||'#0b2b59')};--c2:${esc(c.color_secundario||'#1769d2')}"></div><div class="company-card-body"><div class="company-logo-box">${c.logo_url?`<img src="${esc(c.logo_url)}" alt="Logo">`:`<div class="company-logo-placeholder">${esc((c.nombre_fantasia||c.nombre||'E').slice(0,2).toUpperCase())}</div>`}</div><div class="company-name">${esc(c.nombre_fantasia||c.nombre||'Empresa')}</div><div class="company-legal">${esc(c.razon_social||'Sin razón social')}<br><span class="small">${esc(c.slug||'')}</span></div><div class="company-meta"><div class="company-colors"><span class="company-color-dot" style="background:${esc(c.color_primario||'#0b2b59')}"></span><span class="company-color-dot" style="background:${esc(c.color_secundario||'#1769d2')}"></span></div><span class="company-status ${c.activo?'active':'inactive'}">${c.activo?'ACTIVA':'INACTIVA'}</span></div><div class="company-actions"><button class="btn btn-ghost" onclick="window.openSuperadminCompany('${c.id}')">Editar</button><button class="btn ${c.activo?'btn-ghost':'btn-primary'}" onclick="window.toggleSuperadminCompany('${c.id}',${c.activo?'false':'true'})">${c.activo?'Desactivar':'Activar'}</button></div></div></article>`).join('');
  }

  function openCompanyModal(id=null){
    if(!superAdmin()) return;
    selectedFile=null;
    const c=id?companies.find(x=>x.id===id):null;
    const primary=c?.color_primario||'#0b2b59', secondary=c?.color_secundario||'#1769d2';
    $('modalRoot').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this) closeModal()"><div class="modal" style="max-width:760px"><h3>${c?'Editar empresa':'Nueva empresa'}</h3><div class="company-form-grid"><div class="field"><label>Nombre comercial</label><input id="saEmpresaNombreFantasia" value="${esc(c?.nombre_fantasia||c?.nombre||'')}"></div><div class="field"><label>Razón social</label><input id="saEmpresaRazonSocial" value="${esc(c?.razon_social||'')}"></div><div class="field full"><label>Slug interno</label><input id="saEmpresaSlug" value="${esc(c?.slug||'')}"></div><div class="field"><label>Color principal</label><div class="company-color-input"><input id="saEmpresaColor1Picker" type="color" value="${esc(primary)}"><input id="saEmpresaColor1" value="${esc(primary)}"></div></div><div class="field"><label>Color secundario</label><div class="company-color-input"><input id="saEmpresaColor2Picker" type="color" value="${esc(secondary)}"><input id="saEmpresaColor2" value="${esc(secondary)}"></div></div><div class="field full"><label>Logo corporativo</label><input id="saEmpresaLogo" type="file" accept="image/png,image/jpeg,image/webp"><div class="company-logo-preview" id="saEmpresaLogoPreview">${c?.logo_url?`<img src="${esc(c.logo_url)}">`:'<span class="small">Sin logo seleccionado</span>'}</div></div></div><div class="actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="saEmpresaGuardar">${c?'Guardar cambios':'Crear empresa'}</button></div></div></div>`;
    const c1p=$('saEmpresaColor1Picker'),c1=$('saEmpresaColor1'),c2p=$('saEmpresaColor2Picker'),c2=$('saEmpresaColor2');
    c1p.oninput=()=>c1.value=c1p.value;c1.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(c1.value))c1p.value=c1.value};c2p.oninput=()=>c2.value=c2p.value;c2.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(c2.value))c2p.value=c2.value};
    $('saEmpresaLogo').onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)){alert('Formato de logo no válido.');return;}if(f.size>2*1024*1024){alert('El logo supera 2 MB.');return;}selectedFile=f;$('saEmpresaLogoPreview').innerHTML=`<img src="${URL.createObjectURL(f)}">`;};
    $('saEmpresaGuardar').onclick=()=>saveCompany(c?.id||null,c?.logo_url||null);
  }

  async function saveCompany(id,currentLogo){
    if(!superAdmin()) return;
    const nombreFantasia=$('saEmpresaNombreFantasia').value.trim(), razonSocial=$('saEmpresaRazonSocial').value.trim();
    let slug=$('saEmpresaSlug').value.trim()||slugify(nombreFantasia);
    const color1=$('saEmpresaColor1').value.trim(), color2=$('saEmpresaColor2').value.trim();
    if(!nombreFantasia||!razonSocial){alert('Completá nombre comercial y razón social.');return;}
    if(!/^#[0-9a-f]{6}$/i.test(color1)||!/^#[0-9a-f]{6}$/i.test(color2)){alert('Los colores no son válidos.');return;}
    try{
      let companyId=id;
      const payload={slug,nombre:nombreFantasia,nombre_fantasia:nombreFantasia,razon_social:razonSocial,color_primario:color1,color_secundario:color2,activo:true,actualizado_en:new Date().toISOString()};
      if(companyId){const {error}=await sb.from('empresas').update(payload).eq('id',companyId);if(error)throw error;}else{const {data,error}=await sb.from('empresas').insert(payload).select('id').single();if(error)throw error;companyId=data.id;}
      if(selectedFile){const ext=(selectedFile.name.split('.').pop()||'png').toLowerCase();const path=`${companyId}/logo-${Date.now()}.${ext}`;const {error:upErr}=await sb.storage.from(BUCKET).upload(path,selectedFile,{contentType:selectedFile.type});if(upErr)throw upErr;const url=sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;const {error:logoErr}=await sb.from('empresas').update({logo_url:url,actualizado_en:new Date().toISOString()}).eq('id',companyId);if(logoErr)throw logoErr;}
      closeModal();await loadCompanies();alert(id?'Empresa actualizada correctamente.':'Empresa creada correctamente.');
    }catch(err){console.error(err);alert('No se pudo guardar la empresa:\n'+(err?.message||err));}
  }

  async function toggleCompany(id,activo){
    if(!superAdmin()) return;
    const c=companies.find(x=>x.id===id);if(!c)return;
    if(!confirm(`¿Querés ${activo?'activar':'desactivar'} la empresa ${c.nombre_fantasia||c.nombre}?`))return;
    const {error}=await sb.from('empresas').update({activo,actualizado_en:new Date().toISOString()}).eq('id',id);if(error){alert(error.message);return;}await loadCompanies();
  }

  window.openSuperadminCompany=openCompanyModal;
  window.toggleSuperadminCompany=toggleCompany;
  window.loadSuperadminCompanies=loadCompanies;

  // Importante: este módulo puede cargarse antes del login. No abandona la detección
  // hasta que currentProfile ya esté listo y sea superadmin.
  const watcher=setInterval(()=>{
    if(superAdmin()){
      ensureUi();
      const btn=document.getElementById(NAV_ID);
      if(btn){btn.classList.remove('hidden');btn.style.display='flex';}
    }
  },400);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{if(superAdmin())ensureUi();}); else if(superAdmin()) ensureUi();
})();