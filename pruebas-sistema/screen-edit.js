// Edición de configuración de pantallas - agregado por ChatGPT
(function(){
  const compactStyle = document.createElement('style');
  compactStyle.textContent = `
    .screen-detail-modal{width:min(1080px,calc(100vw - 36px)) !important;max-width:1080px !important;max-height:calc(100vh - 36px) !important;overflow:hidden !important;padding:22px 24px 18px !important}
    .screen-detail-head{align-items:center !important;padding-bottom:12px !important;margin-bottom:12px !important}
    .screen-detail-title .screen-list-icon{width:42px !important;height:42px !important}
    .screen-detail-title h3{font-size:24px !important;line-height:1.05 !important}
    .screen-detail-grid{grid-template-columns:repeat(4,minmax(0,1fr)) !important;gap:8px !important;margin-bottom:12px !important}
    .screen-detail-item{padding:10px 12px !important;min-height:72px;display:flex;flex-direction:column;justify-content:center}
    .screen-detail-label{margin-bottom:4px !important;font-size:9px !important}
    .screen-detail-value{font-size:12.5px !important;line-height:1.2 !important}
    .screen-detail-actions{padding-top:12px !important;gap:7px !important;flex-wrap:wrap !important;align-items:center !important}
    .screen-detail-actions-title{width:auto !important;margin:0 8px 0 0 !important;align-self:center}
    .screen-detail-actions .btn{padding:9px 12px !important;font-size:12px !important;border-radius:10px !important}
    .screen-detail-modal > .actions{margin-top:12px !important;padding-top:0 !important;justify-content:flex-end !important}
    .screen-detail-modal > .actions .btn{padding:9px 16px !important;font-size:12px !important}
    @media(max-width:900px){.screen-detail-modal{overflow:auto !important}.screen-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important}}
    @media(max-width:620px){.screen-detail-grid{grid-template-columns:1fr !important}}
  `;
  document.head.appendChild(compactStyle);

  const originalOpenScreenDetail = window.openScreenDetail;
  if(typeof originalOpenScreenDetail === 'function'){
    window.openScreenDetail = function(screenId){
      originalOpenScreenDetail(screenId);
      if(!(isAdmin() || isSuperAdmin())) return;
      const actions = document.querySelector('.screen-detail-actions');
      if(!actions || actions.querySelector('[data-screen-edit-btn]')) return;
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-sm';
      btn.setAttribute('data-screen-edit-btn','1');
      btn.textContent = 'Editar configuración';
      btn.onclick = () => window.openScreenEdit(screenId);
      const title = actions.querySelector('.screen-detail-actions-title');
      if(title && title.nextSibling) actions.insertBefore(btn,title.nextSibling); else actions.appendChild(btn);
    };
  }

  window.openScreenEdit = async function(screenId){
    if(!(isAdmin() || isSuperAdmin())) return;
    const p = cachePantallas.find(x => x.id === screenId);
    if(!p) return;
    const {data:linkedPlayer,error:readError}=await sb.from('players')
      .select('id,tipo,proveedor,vnnox_player_id,vnnox_sn')
      .eq('pantalla_id',screenId).maybeSingle();
    if(readError){alert('No se pudo consultar el reproductor: '+readError.message);return;}
    const tipo=linkedPlayer?.tipo||'';
    const playerOptions=[['','Sin vincular'],['novastar_taurus','NovaStar Taurus / VNNOX'],
      ['windows','PC Windows'],['raspberry','Raspberry Pi']]
      .map(([value,label])=>'<option value="'+value+'" '+(value===tipo?'selected':'')+'>'+label+'</option>').join('');
    $('modalRoot').innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
        <div class="modal" style="max-width:680px">
          <h3>Editar pantalla · ${escapeHtml(p.nombre)}</h3>
          <div class="form-grid">
            <div class="field full"><label>Nombre de la pantalla</label><input id="screenEditNombre" type="text" value="${escapeHtml(p.nombre || '')}"></div>
            <div class="field full"><label>Ubicación</label><input id="screenEditUbicacion" type="text" value="${escapeHtml(p.ubicacion || '')}"></div>
            <div class="field"><label>Ancho de pantalla (px)</label><input id="screenEditAncho" type="number" min="1" value="${Number(p.ancho || 0)}"></div>
            <div class="field"><label>Alto de pantalla (px)</label><input id="screenEditAlto" type="number" min="1" value="${Number(p.alto || 0)}"></div>
            <div class="field"><label>Hora de encendido</label><input id="screenEditHoraInicio" type="time" value="${p.hora_inicio?.slice(0,5) || '06:00'}"></div>
            <div class="field"><label>Hora de apagado</label><input id="screenEditHoraFin" type="time" value="${p.hora_fin?.slice(0,5) || '01:00'}"></div>
            <div class="field full"><label>Tipo de reproductor</label><select id="screenEditPlayerTipo" onchange="screenEditPlayerChange()">${playerOptions}</select></div>
            <div class="field full" id="screenEditTaurusFields" style="display:${tipo==='novastar_taurus'?'block':'none'}">
              <div class="form-grid">
                <div class="field"><label>ID de reproductor en VNNOX</label><input id="screenEditVnnoxId" value="${escapeHtml(linkedPlayer?.vnnox_player_id||'')}" placeholder="ID de VNNOX"></div>
                <div class="field"><label>Número de serie del Taurus (SN)</label><input id="screenEditVnnoxSn" value="${escapeHtml(linkedPlayer?.vnnox_sn||'')}" placeholder="Opcional"></div>
              </div>
              <div class="small">El vínculo no inicia automáticamente la publicación de campañas.</div>
            </div>
          </div>
          <div class="content-box" style="margin-top:8px"><strong>Importante</strong><div class="small" style="margin-top:6px">La resolución configurada en NextWork se usa para administrar y validar contenido. No modifica automáticamente el mapeo físico de la controladora LED.</div></div>
          <div class="actions"><button class="btn btn-ghost" onclick="openScreenDetail('${p.id}')">Cancelar</button><button class="btn btn-primary" onclick="saveScreenEdit('${p.id}')">Guardar cambios</button></div>
        </div>
      </div>`;
    window.__nextworkEditingPlayer={screenId,playerId:linkedPlayer?.id||null,originalTipo:tipo};
  };
  window.screenEditPlayerChange=function(){
    const box=$('screenEditTaurusFields');
    if(box)box.style.display=$('screenEditPlayerTipo')?.value==='novastar_taurus'?'block':'none';
  };

  window.saveScreenEdit = async function(screenId){
    if(!(isAdmin() || isSuperAdmin())) return;
    const nombre = $('screenEditNombre')?.value.trim();
    const ubicacion = $('screenEditUbicacion')?.value.trim();
    const ancho = Number($('screenEditAncho')?.value);
    const alto = Number($('screenEditAlto')?.value);
    const hora_inicio = $('screenEditHoraInicio')?.value || null;
    const hora_fin = $('screenEditHoraFin')?.value || null;
    if(!nombre){ alert('Debés ingresar un nombre para la pantalla.'); return; }
    if(!Number.isInteger(ancho) || ancho <= 0){ alert('El ancho de pantalla no es válido.'); return; }
    if(!Number.isInteger(alto) || alto <= 0){ alert('El alto de pantalla no es válido.'); return; }
    const tipo=$('screenEditPlayerTipo')?.value||'';
    const vnnoxId=$('screenEditVnnoxId')?.value.trim()||'';
    const vnnoxSn=$('screenEditVnnoxSn')?.value.trim()||'';
    const linked=window.__nextworkEditingPlayer;
    if(!linked||linked.screenId!==screenId){alert('Volvé a abrir el formulario de configuración.');return;}
    if(!tipo&&linked.playerId){alert('Esta pantalla ya tiene un reproductor. Para desvincularlo se necesita una operación separada.');return;}
    if(tipo==='novastar_taurus'&&(!vnnoxId||vnnoxId.length>128)){
      alert('Ingresá el ID de reproductor en VNNOX para vincular este Taurus.');return;
    }
    if(linked.playerId&&linked.originalTipo!==tipo&&
       !confirm('Vas a cambiar el tipo de un reproductor ya vinculado. Confirmá que no esté siendo utilizado para publicar campañas. ¿Continuar?'))return;
    const { error } = await sb.from('pantallas').update({ nombre, ubicacion, ancho, alto, hora_inicio, hora_fin }).eq('id', screenId);
    if(error){ console.error(error); alert('No se pudo actualizar la pantalla:\n' + error.message); return; }
    if(tipo){
      const payload={tipo,proveedor:tipo==='novastar_taurus'?'vnnox':null,
        vnnox_player_id:tipo==='novastar_taurus'?vnnoxId:null,
        vnnox_sn:tipo==='novastar_taurus'?(vnnoxSn||null):null};
      const result=linked.playerId
        ?await sb.from('players').update(payload).eq('id',linked.playerId).eq('pantalla_id',screenId)
        :await sb.from('players').insert({pantalla_id:screenId,estado:'offline',...payload});
      if(result.error){
        alert('La pantalla se actualizó, pero NO se pudo vincular el reproductor: '+result.error.message);
        await loadPantallas();return;
      }
    }
    await loadPantallas();
    await loadDashboard();
    window.openScreenDetail(screenId);
    alert('Configuración de pantalla actualizada correctamente.');
  };

  function loadScript(selector,src,datasetKey){
    if(document.querySelector(selector)) return;
    const s=document.createElement('script');
    s.src=src;
    if(datasetKey) s.dataset[datasetKey]='1';
    document.body.appendChild(s);
  }

  loadScript('script[data-nextwork-v30]','./system-enhancements-v30.js?v=2','nextworkV30');
  loadScript('script[data-nextwork-v31]','./dashboard-layout-v31.js?v=1','nextworkV31');
  loadScript('script[data-nextwork-clients-v31]','./clients-enhancements-v31.js?v=1','nextworkClientsV31');
  loadScript('script[data-nextwork-reports]','/pruebas-sistema/reports-admin.js?v=1','nextworkReports');
  loadScript('script[data-nextwork-company-settings]','/pruebas-sistema/company-settings.js?v=1','nextworkCompanySettings');
})();