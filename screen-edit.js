// Edición de configuración de pantallas - agregado por ChatGPT
(function(){
  const originalOpenScreenDetail = window.openScreenDetail;

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
    if(title && title.nextSibling){
      actions.insertBefore(btn, title.nextSibling);
    }else{
      actions.appendChild(btn);
    }
  };

  window.openScreenEdit = function(screenId){
    if(!(isAdmin() || isSuperAdmin())) return;

    const p = cachePantallas.find(x => x.id === screenId);
    if(!p) return;

    $('modalRoot').innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
        <div class="modal" style="max-width:680px">
          <h3>Editar pantalla · ${escapeHtml(p.nombre)}</h3>

          <div class="form-grid">
            <div class="field full">
              <label>Nombre de la pantalla</label>
              <input id="screenEditNombre" type="text" value="${escapeHtml(p.nombre || '')}">
            </div>

            <div class="field full">
              <label>Ubicación</label>
              <input id="screenEditUbicacion" type="text" value="${escapeHtml(p.ubicacion || '')}">
            </div>

            <div class="field">
              <label>Ancho de pantalla (px)</label>
              <input id="screenEditAncho" type="number" min="1" value="${Number(p.ancho || 0)}">
            </div>

            <div class="field">
              <label>Alto de pantalla (px)</label>
              <input id="screenEditAlto" type="number" min="1" value="${Number(p.alto || 0)}">
            </div>

            <div class="field">
              <label>Hora de encendido</label>
              <input id="screenEditHoraInicio" type="time" value="${p.hora_inicio?.slice(0,5) || '06:00'}">
            </div>

            <div class="field">
              <label>Hora de apagado</label>
              <input id="screenEditHoraFin" type="time" value="${p.hora_fin?.slice(0,5) || '01:00'}">
            </div>
          </div>

          <div class="content-box" style="margin-top:8px">
            <strong>Importante</strong>
            <div class="small" style="margin-top:6px">
              La resolución configurada en NextWork se usa para administrar y validar contenido. No modifica automáticamente el mapeo físico de la controladora LED.
            </div>
          </div>

          <div class="actions">
            <button class="btn btn-ghost" onclick="openScreenDetail('${p.id}')">Cancelar</button>
            <button class="btn btn-primary" onclick="saveScreenEdit('${p.id}')">Guardar cambios</button>
          </div>
        </div>
      </div>`;
  };

  window.saveScreenEdit = async function(screenId){
    if(!(isAdmin() || isSuperAdmin())) return;

    const nombre = $('screenEditNombre')?.value.trim();
    const ubicacion = $('screenEditUbicacion')?.value.trim();
    const ancho = Number($('screenEditAncho')?.value);
    const alto = Number($('screenEditAlto')?.value);
    const hora_inicio = $('screenEditHoraInicio')?.value || null;
    const hora_fin = $('screenEditHoraFin')?.value || null;

    if(!nombre){
      alert('Debés ingresar un nombre para la pantalla.');
      return;
    }
    if(!Number.isInteger(ancho) || ancho <= 0){
      alert('El ancho de pantalla no es válido.');
      return;
    }
    if(!Number.isInteger(alto) || alto <= 0){
      alert('El alto de pantalla no es válido.');
      return;
    }

    const { error } = await sb
      .from('pantallas')
      .update({ nombre, ubicacion, ancho, alto, hora_inicio, hora_fin })
      .eq('id', screenId);

    if(error){
      console.error(error);
      alert('No se pudo actualizar la pantalla:\n' + error.message);
      return;
    }

    await loadPantallas();
    await loadDashboard();
    window.openScreenDetail(screenId);
    alert('Configuración de pantalla actualizada correctamente.');
  };
})();