// NextWork V31 - Clientes: layout ancho + ficha comercial opcional + edición
(function(){
  const style = document.createElement('style');
  style.id = 'nextwork-clients-v31-ui';
  style.textContent = `
    #page-clientes{
      width:100% !important;
      max-width:none !important;
      padding:0 !important;
    }
    #page-clientes .section-title{
      margin:0 0 14px !important;
      padding:0 !important;
      align-items:center !important;
    }
    #page-clientes .table-wrap{
      width:100% !important;
      max-width:none !important;
      border-radius:16px !important;
      box-shadow:0 7px 20px rgba(15,23,42,.05) !important;
      overflow:auto !important;
    }
    #page-clientes table{
      width:100% !important;
      min-width:1000px !important;
      table-layout:auto !important;
    }
    #page-clientes th,
    #page-clientes td{
      padding:12px 14px !important;
      vertical-align:middle !important;
    }
    #page-clientes th{
      font-size:10.5px !important;
      letter-spacing:.05em !important;
    }
    #page-clientes td{
      font-size:12.5px !important;
    }
    .client-name-main{font-weight:900;color:#0f172a}
    .client-sub{font-size:10.5px;color:#94a3b8;margin-top:3px}
    .client-empty{color:#94a3b8}
    .client-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
    .client-edit-btn{
      border:1px solid #dbe3ee;
      background:#fff;
      color:#4338ca;
      border-radius:9px;
      padding:7px 10px;
      font-size:11px;
      font-weight:850;
      cursor:pointer;
    }
    .client-edit-btn:hover{background:#f5f3ff;border-color:#c4b5fd}
    .client-modal{width:min(760px,calc(100vw - 36px)) !important;max-width:760px !important}
    .client-commercial-note{
      margin:4px 0 14px;
      padding:10px 12px;
      border-radius:12px;
      background:#f8fafc;
      border:1px solid #e5eaf3;
      color:#64748b;
      font-size:11.5px;
    }
    @media(max-width:900px){
      #page-clientes table{min-width:820px !important}
    }
  `;
  document.head.appendChild(style);

  function normalizeClientTableHeader(){
    const table = document.querySelector('#page-clientes table');
    if(!table) return;
    const head = table.querySelector('thead tr');
    if(head){
      head.innerHTML = '<th>Cliente</th><th>CUIT</th><th>Teléfono</th><th>Correo</th><th>Creado</th><th>Acciones</th>';
    }
  }

  loadClientes = async function(){
    const { data, error } = await sb.from('clientes').select('*').order('nombre');
    if(error){
      console.error('Error cargando clientes:', error);
      const body = $('clientesBody');
      if(body) body.innerHTML = `<tr><td colspan="6" class="empty">No se pudieron cargar los clientes.</td></tr>`;
      return;
    }

    cacheClientes = data || [];
    normalizeClientTableHeader();

    const body = $('clientesBody');
    if(!body) return;

    body.innerHTML = cacheClientes.length ? cacheClientes.map(c => `
      <tr>
        <td>
          <div class="client-name-main">${escapeHtml(c.nombre || '')}</div>
          ${c.direccion ? `<div class="client-sub">${escapeHtml(c.direccion)}</div>` : ''}
        </td>
        <td>${c.cuit ? escapeHtml(c.cuit) : '<span class="client-empty">—</span>'}</td>
        <td>${c.telefono ? escapeHtml(c.telefono) : '<span class="client-empty">—</span>'}</td>
        <td>${c.email ? escapeHtml(c.email) : '<span class="client-empty">—</span>'}</td>
        <td>${fmtDateTime(c.creado_en)}</td>
        <td>
          <div class="client-actions">
            ${canWriteCampaign() ? `<button class="client-edit-btn" onclick="openClienteModal('${c.id}')">Editar</button>` : '<span class="small">—</span>'}
          </div>
        </td>
      </tr>
    `).join('') : `<tr><td colspan="6" class="empty">Sin clientes</td></tr>`;
  };

  openClienteModal = function(id=''){
    if(!canWriteCampaign()) return;

    const cliente = id ? (cacheClientes || []).find(c => String(c.id) === String(id)) : null;
    const activos = (cacheGrupos || []).filter(g => g.activo || g.id === cliente?.grupo_id);
    const tipo = cliente?.tipo_factura || '';

    $('modalRoot').innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
        <div class="modal client-modal">
          <h3>${cliente ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <div class="client-commercial-note">
            Solo <strong>Nombre</strong> y <strong>Grupo</strong> son necesarios para usar el cliente en campañas. Los datos comerciales son opcionales y se pueden completar más adelante.
          </div>

          <div class="form-grid">
            <div class="field">
              <label>Nombre *</label>
              <input id="clienteNombre" value="${escapeHtml(cliente?.nombre || '')}" placeholder="Ej. Sanchu Alvarez">
            </div>
            <div class="field">
              <label>Grupo *</label>
              <select id="clienteGrupo">
                ${activos.map(g => `<option value="${g.id}" ${g.id===cliente?.grupo_id?'selected':''}>${escapeHtml(g.nombre)}</option>`).join('')}
              </select>
            </div>

            <div class="field">
              <label>CUIT</label>
              <input id="clienteCuit" value="${escapeHtml(cliente?.cuit || '')}" placeholder="Ej. 30-12345678-9">
            </div>
            <div class="field">
              <label>Tipo de factura</label>
              <select id="clienteTipoFactura">
                <option value="" ${!tipo?'selected':''}>Sin especificar</option>
                <option value="Factura A" ${tipo==='Factura A'?'selected':''}>Factura A</option>
                <option value="Factura B" ${tipo==='Factura B'?'selected':''}>Factura B</option>
                <option value="Factura C" ${tipo==='Factura C'?'selected':''}>Factura C</option>
                <option value="Recibo" ${tipo==='Recibo'?'selected':''}>Recibo</option>
              </select>
            </div>

            <div class="field full">
              <label>Dirección</label>
              <input id="clienteDireccion" value="${escapeHtml(cliente?.direccion || '')}" placeholder="Dirección comercial o fiscal">
            </div>
            <div class="field">
              <label>Teléfono</label>
              <input id="clienteTelefono" value="${escapeHtml(cliente?.telefono || '')}" placeholder="Ej. +54 299 ...">
            </div>
            <div class="field">
              <label>Correo electrónico</label>
              <input id="clienteEmail" type="email" value="${escapeHtml(cliente?.email || '')}" placeholder="cliente@empresa.com">
            </div>
          </div>

          <div class="actions">
            <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="saveCliente('${id}')">${cliente ? 'Guardar cambios' : 'Guardar cliente'}</button>
          </div>
        </div>
      </div>`;
  };

  saveCliente = async function(id=''){
    if(!canWriteCampaign()) return;

    const nombre = $('clienteNombre')?.value.trim() || '';
    const grupo_id = $('clienteGrupo')?.value || '';
    if(!nombre){ alert('Ingresá el nombre del cliente.'); return; }
    if(!grupo_id){ alert('Seleccioná un grupo.'); return; }

    const email = $('clienteEmail')?.value.trim() || '';
    if(email && !/^\S+@\S+\.\S+$/.test(email)){
      alert('El correo electrónico no tiene un formato válido.');
      return;
    }

    const payload = {
      nombre,
      grupo_id,
      cuit: $('clienteCuit')?.value.trim() || null,
      tipo_factura: $('clienteTipoFactura')?.value || null,
      direccion: $('clienteDireccion')?.value.trim() || null,
      telefono: $('clienteTelefono')?.value.trim() || null,
      email: email || null
    };

    let error = null;
    if(id){
      ({ error } = await sb.from('clientes').update(payload).eq('id',id));
    }else{
      ({ error } = await sb.from('clientes').insert(payload));
    }

    if(error){
      console.error('Error guardando cliente:', error);
      alert(error.message || 'No se pudo guardar el cliente.');
      return;
    }

    closeModal();
    await loadClientes();
  };

  window.openClienteModal = openClienteModal;
  window.saveCliente = saveCliente;

  normalizeClientTableHeader();
  setTimeout(()=>loadClientes(),0);
})();
