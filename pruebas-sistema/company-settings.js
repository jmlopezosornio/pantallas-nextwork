// Administración de identidad corporativa por empresa - COPIA DE PRUEBAS. Solo admin de su empresa; superadmin gestiona todo desde Empresas.
(function(){
  'use strict';

  const PAGE_ID = 'page-empresa';
  const NAV_ID = 'nav-empresa';
  const BUCKET = 'company-branding';
  let company = null;
  let selectedLogoFile = null;

  const icon = `<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 10h2"/><path d="M13 10h2"/><path d="M9 14h2"/><path d="M13 14h2"/><path d="M10 21v-4h4v4"/></svg>`;

  function esc(v){
    return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function isManager(){
    try{
      return (typeof isAdmin === 'function' && isAdmin()) && !(typeof isSuperAdmin === 'function' && isSuperAdmin());
    }catch{return false;}
  }

  function companyId(){
    try{return currentProfile?.empresa_id || null;}catch{return null;}
  }

  function injectStyles(){
    if(document.getElementById('nextwork-company-settings-css')) return;
    const s=document.createElement('style');
    s.id='nextwork-company-settings-css';
    s.textContent=`
      #${PAGE_ID}{max-width:1180px;margin:0 auto}
      .company-settings-card{background:#fff;border:1px solid #e6ebf3;border-radius:22px;box-shadow:var(--shadow);overflow:hidden}
      .company-settings-head{padding:24px 26px;border-bottom:1px solid #e8edf5;display:flex;align-items:center;justify-content:space-between;gap:18px;background:linear-gradient(135deg,#fff,#f7faff)}
      .company-settings-head h2{margin:0;font-size:25px;color:#13213b;letter-spacing:-.02em}
      .company-settings-head p{margin:6px 0 0;color:#64748b;font-size:13px}
      .company-settings-body{padding:24px 26px;display:grid;grid-template-columns:320px 1fr;gap:26px}
      .company-logo-card{border:1px solid #e5eaf2;border-radius:18px;padding:20px;background:#fafcff;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
      .company-logo-preview{width:240px;height:140px;border:1px dashed #cbd5e1;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;padding:14px;overflow:hidden;margin-bottom:16px}
      .company-logo-preview img{max-width:100%;max-height:100%;object-fit:contain}
      .company-logo-empty{color:#94a3b8;font-size:13px;line-height:1.4}
      .company-logo-help{font-size:11px;color:#8492a6;margin-top:9px;line-height:1.4}
      .company-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .company-field.full{grid-column:1/-1}
      .company-field label{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#56667c}
      .company-color-row{display:grid;grid-template-columns:52px 1fr;gap:8px;align-items:center}
      .company-color-row input[type=color]{width:52px;height:44px;padding:3px;border-radius:10px;cursor:pointer}
      .company-preview-bar{grid-column:1/-1;border-radius:14px;padding:15px 16px;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:54px}
      .company-preview-bar small{font-size:10px;opacity:.82;text-transform:uppercase;letter-spacing:.1em}
      .company-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:10px;padding-top:6px}
      .company-status{font-size:12px;color:#64748b;margin-right:auto;align-self:center}
      @media(max-width:850px){.company-settings-body{grid-template-columns:1fr}.company-logo-card{min-height:auto}.company-fields{grid-template-columns:1fr}.company-field.full,.company-preview-bar,.company-actions{grid-column:auto}}
    `;
    document.head.appendChild(s);
  }

  function addNav(){
    if(!isManager() || document.getElementById(NAV_ID)) return;
    const buttons=[...document.querySelectorAll('.nav-btn')];
    const users=buttons.find(b=>b.dataset.page==='usuarios');
    const groups=buttons.find(b=>b.dataset.page==='grupos');
    const anchor=users || groups || buttons[buttons.length-1];
    if(!anchor) return;
    const btn=document.createElement('button');
    btn.id=NAV_ID;
    btn.className='nav-btn admin-only';
    btn.type='button';
    btn.innerHTML=`<span class="nav-icon">${icon}</span><span class="nav-label">Empresa</span>`;
    btn.addEventListener('click',openPage);
    anchor.insertAdjacentElement('afterend',btn);
  }

  function addPage(){
    if(!isManager() || document.getElementById(PAGE_ID)) return;
    const content=document.querySelector('.content');
    if(!content) return;
    const section=document.createElement('section');
    section.id=PAGE_ID;
    section.className='page hidden';
    section.innerHTML=`
      <div class="company-settings-card">
        <div class="company-settings-head">
          <div><h2>Identidad de la empresa</h2><p>Configurá la imagen corporativa que verán los usuarios y que se utilizará en los reportes.</p></div>
          <span class="page-badge">Multiempresa</span>
        </div>
        <div class="company-settings-body">
          <div class="company-logo-card">
            <div class="company-logo-preview" id="companyLogoPreview"><div class="company-logo-empty">Sin logo corporativo cargado</div></div>
            <input id="companyLogoInput" type="file" accept="image/png,image/jpeg,image/webp" hidden>
            <button class="btn btn-ghost" type="button" id="companyChooseLogo">Seleccionar logo</button>
            <div class="company-logo-help">PNG, JPG o WebP · máximo 2 MB.<br>Se recomienda fondo transparente y formato horizontal.</div>
          </div>
          <div class="company-fields">
            <div class="company-field full"><label for="companyNombre">Nombre comercial</label><input id="companyNombre" type="text" maxlength="120" placeholder="Ej. NextWork"></div>
            <div class="company-field full"><label for="companyRazon">Razón social</label><input id="companyRazon" type="text" maxlength="160" placeholder="Razón social de la empresa"></div>
            <div class="company-field"><label>Color principal</label><div class="company-color-row"><input id="companyPrimaryPicker" type="color" value="#0b2b59"><input id="companyPrimary" type="text" value="#0b2b59" maxlength="7"></div></div>
            <div class="company-field"><label>Color secundario</label><div class="company-color-row"><input id="companySecondaryPicker" type="color" value="#1769d2"><input id="companySecondary" type="text" value="#1769d2" maxlength="7"></div></div>
            <div class="company-preview-bar" id="companyColorPreview"><span id="companyPreviewName">Empresa</span><small>Vista previa</small></div>
            <div class="company-actions"><span class="company-status" id="companyStatus"></span><button class="btn btn-primary" type="button" id="companySaveBtn">Guardar cambios</button></div>
          </div>
        </div>
      </div>`;
    content.appendChild(section);

    document.getElementById('companyChooseLogo')?.addEventListener('click',()=>document.getElementById('companyLogoInput')?.click());
    document.getElementById('companyLogoInput')?.addEventListener('change',onLogoSelected);
    document.getElementById('companySaveBtn')?.addEventListener('click',saveCompany);
    ['companyNombre','companyPrimary','companySecondary'].forEach(id=>document.getElementById(id)?.addEventListener('input',refreshPreview));
    bindColorPair('companyPrimaryPicker','companyPrimary');
    bindColorPair('companySecondaryPicker','companySecondary');
  }

  function bindColorPair(pickerId,textId){
    const picker=document.getElementById(pickerId), text=document.getElementById(textId);
    picker?.addEventListener('input',()=>{text.value=picker.value;refreshPreview();});
    text?.addEventListener('change',()=>{if(/^#[0-9a-f]{6}$/i.test(text.value)){picker.value=text.value;refreshPreview();}});
  }

  function refreshPreview(){
    const primary=document.getElementById('companyPrimary')?.value || '#0b2b59';
    const secondary=document.getElementById('companySecondary')?.value || '#1769d2';
    const name=document.getElementById('companyNombre')?.value.trim() || 'Empresa';
    const bar=document.getElementById('companyColorPreview');
    if(bar) bar.style.background=`linear-gradient(135deg,${validColor(primary)},${validColor(secondary)})`;
    const nameEl=document.getElementById('companyPreviewName'); if(nameEl) nameEl.textContent=name;
  }

  function validColor(v){return /^#[0-9a-f]{6}$/i.test(v||'')?v:'#0b2b59';}

  async function loadCompany(){
    const id=companyId();
    if(!id || typeof sb==='undefined') return;
    const {data,error}=await sb.from('empresas').select('id,slug,razon_social,nombre_fantasia,logo_url,color_primario,color_secundario,activo').eq('id',id).single();
    if(error){setStatus('No se pudo cargar la empresa: '+error.message,true);return;}
    company=data;
    document.getElementById('companyNombre').value=data.nombre_fantasia || '';
    document.getElementById('companyRazon').value=data.razon_social || '';
    const p=validColor(data.color_primario), s=validColor(data.color_secundario);
    document.getElementById('companyPrimary').value=p; document.getElementById('companyPrimaryPicker').value=p;
    document.getElementById('companySecondary').value=s; document.getElementById('companySecondaryPicker').value=s;
    renderLogo(data.logo_url);
    selectedLogoFile=null;
    refreshPreview();
    setStatus('');
  }

  function renderLogo(url){
    const preview=document.getElementById('companyLogoPreview'); if(!preview) return;
    preview.innerHTML=url?`<img src="${esc(url)}" alt="Logo corporativo">`:`<div class="company-logo-empty">Sin logo corporativo cargado</div>`;
  }

  function onLogoSelected(e){
    const file=e.target.files?.[0]; if(!file) return;
    const allowed=['image/png','image/jpeg','image/webp'];
    if(!allowed.includes(file.type)){alert('El logo debe ser PNG, JPG o WebP.');e.target.value='';return;}
    if(file.size>2*1024*1024){alert('El logo no puede superar los 2 MB.');e.target.value='';return;}
    selectedLogoFile=file;
    const url=URL.createObjectURL(file);
    renderLogo(url);
  }

  async function uploadLogo(id,file){
    const ext=(file.name.split('.').pop()||'png').toLowerCase().replace(/[^a-z0-9]/g,'');
    const safeExt=['png','jpg','jpeg','webp'].includes(ext)?ext:'png';
    const path=`${id}/logo-${Date.now()}.${safeExt}`;
    const {error}=await sb.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',contentType:file.type,upsert:false});
    if(error) throw error;
    const {data}=sb.storage.from(BUCKET).getPublicUrl(path);
    if(!data?.publicUrl) throw new Error('No se pudo obtener la URL pública del logo.');
    return data.publicUrl;
  }

  async function saveCompany(){
    if(!isManager() || !company?.id) return;
    const nombre=document.getElementById('companyNombre')?.value.trim();
    const razon=document.getElementById('companyRazon')?.value.trim();
    const primary=document.getElementById('companyPrimary')?.value.trim();
    const secondary=document.getElementById('companySecondary')?.value.trim();
    if(!nombre){alert('Ingresá el nombre comercial de la empresa.');return;}
    if(!/^#[0-9a-f]{6}$/i.test(primary)||!/^#[0-9a-f]{6}$/i.test(secondary)){alert('Los colores deben tener formato hexadecimal, por ejemplo #0b2b59.');return;}

    const btn=document.getElementById('companySaveBtn'); if(btn){btn.disabled=true;btn.textContent='Guardando…';}
    setStatus('Guardando configuración…');
    try{
      let logoUrl=company.logo_url || null;
      if(selectedLogoFile) logoUrl=await uploadLogo(company.id,selectedLogoFile);
      const payload={nombre_fantasia:nombre,razon_social:razon||null,nombre:nombre,logo_url:logoUrl,color_primario:primary,color_secundario:secondary,actualizado_en:new Date().toISOString()};
      const {data,error}=await sb.from('empresas').update(payload).eq('id',company.id).select('id,slug,razon_social,nombre_fantasia,logo_url,color_primario,color_secundario,activo').single();
      if(error) throw error;
      company=data; selectedLogoFile=null;
      renderLogo(company.logo_url); refreshPreview();
      document.documentElement.style.setProperty('--company-primary',company.color_primario||primary);
      document.documentElement.style.setProperty('--company-secondary',company.color_secundario||secondary);
      window.dispatchEvent(new CustomEvent('nextwork-company-updated',{detail:company}));
      setStatus('Cambios guardados correctamente.');
    }catch(err){console.error(err);setStatus('No se pudieron guardar los cambios: '+(err?.message||err),true);}
    finally{if(btn){btn.disabled=false;btn.textContent='Guardar cambios';}}
  }

  function setStatus(text,error=false){
    const el=document.getElementById('companyStatus'); if(!el)return;
    el.textContent=text||''; el.style.color=error?'#b91c1c':'#64748b';
  }

  async function openPage(){
    if(!isManager()) return;
    document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
    document.getElementById(PAGE_ID)?.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(NAV_ID)?.classList.add('active');
    const title=document.querySelector('.topbar-title'), sub=document.querySelector('.topbar-sub');
    if(title) title.textContent='Empresa';
    if(sub) sub.textContent='Identidad corporativa y configuración visual';
    await loadCompany();
  }

  function init(){injectStyles();addNav();addPage();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(isManager()){addNav();addPage();}
    if((document.getElementById(NAV_ID)&&document.getElementById(PAGE_ID))||tries>80) clearInterval(timer);
  },400);
})();
