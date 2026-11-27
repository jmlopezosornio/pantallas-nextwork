// ARCUVA / pruebas — borradores comerciales; no realiza solicitudes a ARCA.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase,root=document.getElementById('facturacionRoot');
if(!base||!root)return;
const EMP='b59ddc55-40f0-48d0-842a-2bee9ea26a41',TABLE='pruebas_arcuva_facturacion_borradores';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pesos=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n);
const money=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const dateToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
let clients=[],campaigns=[],drafts=[],items=[],currentId=null,ready=false,busy=false,baseline='',isDirty=false;
function formSnapshot(){return JSON.stringify({cliente:$('factCliente')?.value||'',campanias:selectedCampaignIds(),tipo:$('factTipo')?.value||'',fecha:$('factFecha')?.value||'',items});}
function rememberSaved(){baseline=formSnapshot();isDirty=false;updateDirty();}
function updateDirty(){if(!ready)return;isDirty=formSnapshot()!==baseline;const indicator=$('factDirty');if(indicator){indicator.textContent=isDirty?'Cambios sin guardar':currentId?'Borrador guardado':'Nuevo borrador';indicator.classList.toggle('pending',isDirty);} }
function allowReplace(){return !isDirty||confirm('Tenés cambios sin guardar. Si continuás se perderán. ¿Querés continuar?');}
function blankItem(){return {concepto:'Servicio de publicidad en pantalla LED',cantidad:1,precio:100000,iva:21};}
function selectedCampaignIds(){return [...document.querySelectorAll('#factCampanias input[data-campaign-id]:checked')].map(el=>el.dataset.campaignId);}
function optionList(ids=null){
 const clientId=$('factCliente')?.value||'';
 const preserve=new Set(Array.isArray(ids)?ids:selectedCampaignIds());
 campaigns=(base.getModel()?.campaigns||[]).filter(c=>c.cliente_id===clientId&&c.eliminada!==true);
 const el=$('factCampanias');if(!el)return;
 el.innerHTML=campaigns.length?campaigns.map(c=>'<label class="fact-campaign-option"><input type="checkbox" data-campaign-id="'+esc(c.id)+'" '+(preserve.has(c.id)?'checked':'')+'><span>'+esc(c.campania||'Campaña sin nombre')+'</span></label>').join(''):'<span class="fact-campaign-empty">Este cliente no tiene campañas disponibles para vincular.</span>';
 el.querySelectorAll('input[data-campaign-id]').forEach(input=>input.addEventListener('change',preview));
}
function selectedCampaigns(){const ids=new Set(selectedCampaignIds());return campaigns.filter(c=>ids.has(c.id));}

function init(){
 root.innerHTML='<div class="fact-head"><div><span class="kicker">Administración comercial</span><h2>Facturación</h2><p>Borradores de facturación vinculados a clientes y campañas de Arcuva.</p></div><span class="fact-status">PRUEBAS · SIN ARCA</span></div>'+
 '<div class="fact-notice"><strong>Modo borrador.</strong> No genera una factura válida, número fiscal ni CAE. No envía nada a ARCA. Los importes son estimativos; el tratamiento tributario definitivo debe validarse antes de emitir.</div>'+
 '<div class="fact-card fact-arca-status"><div class="fact-arca-header"><div><h3>Conexión ARCA · Homologación</h3><p class="fact-arca-caption">Verifica la preparación del backend. No solicita CAE ni genera facturas.</p></div><div class="fact-arca-actions"><button type="button" class="secondary" id="factCheckARCA">Verificar configuración</button><button type="button" class="secondary" id="factTestWSAA">Probar autenticación WSAA</button><button type="button" class="secondary" id="factWSFEStatus">Estado WSFEv1</button><button type="button" class="secondary" id="factWSFETypes">Tipos de comprobante</button><button type="button" class="secondary" id="factWSFEPoints">Puntos de venta</button></div></div><div id="factARCAResult" role="status">Sin verificar. Las credenciales y el certificado deben configurarse exclusivamente en Supabase.</div></div>'+
 '<div class="fact-layout"><div class="fact-card"><div class="fact-topline"><h3 id="factTitle">Nuevo borrador</h3><span id="factDirty" class="fact-dirty">Nuevo borrador</span><span id="factMessage" role="status"></span></div><div class="fact-grid">'+
 '<label class="fact-field fact-full"><span>Cliente *</span><select id="factCliente"><option value="">Cargando clientes…</option></select></label>'+
 '<div class="fact-client-info fact-full" id="factClienteInfo">Seleccioná un cliente.</div>'+
 '<div class="fact-field fact-full"><span>Campañas asociadas (opcional · podés elegir varias)</span><div id="factCampanias" class="fact-campaign-picker" role="group" aria-label="Campañas del cliente"></div></div>'+
 '<label class="fact-field"><span>Tipo orientativo</span><select id="factTipo"><option value="A">Factura A</option><option value="B">Factura B</option></select></label>'+
 '<label class="fact-field"><span>Fecha de borrador</span><input id="factFecha" type="date"></label>'+
 '</div><div class="fact-items-head"><h3>Conceptos</h3><button type="button" class="secondary" id="factAddItem">+ Agregar concepto</button></div>'+
 '<div id="factItems"></div><div class="fact-actions"><button class="primary" type="button" id="factSave">Guardar borrador</button><button class="secondary" type="button" id="factPrint">Imprimir / PDF</button><button class="secondary" type="button" id="factNew">Nuevo</button></div></div>'+
 '<aside class="fact-card fact-preview"><div class="fact-preview-top"><span>VISTA PREVIA · SIN VALIDEZ FISCAL</span><strong id="factPreviewType">TIPO A</strong></div><h3>ARCUVA</h3><p>Responsable Inscripto · Sin autorización de ARCA</p><hr>'+
 '<div class="fact-preview-data"><span>Cliente / Razón social</span><strong id="factPreviewClient">—</strong></div><div class="fact-preview-data"><span>CUIT</span><strong id="factPreviewCuit">—</strong></div><div class="fact-preview-data"><span>Condición IVA</span><strong id="factPreviewIVACond">—</strong></div><div class="fact-preview-data" id="factPreviewCampaignRow" hidden><span>Campañas</span><strong id="factPreviewCampaign">—</strong></div><div id="factPreviewRows"></div><hr>'+
 '<div class="fact-preview-data"><span>Subtotal</span><strong id="factSubtotal">—</strong></div><div class="fact-preview-data"><span>Subtotal Neto</span><strong id="factNet">—</strong></div><div id="factTaxLines"></div>'+
 '<div class="fact-total"><span>Importe Total</span><strong id="factTotal">—</strong></div><p class="fact-disclaimer">NO VÁLIDO COMO FACTURA. Sin CAE, numeración ni autorización de ARCA. No incluye percepciones, retenciones ni regímenes especiales.</p></aside></div>'+
 '<div class="fact-card fact-history"><div class="fact-items-head"><h3>Borradores guardados</h3><button class="secondary" type="button" id="factRefresh">Actualizar lista</button></div><div class="fact-history-tools"><label class="fact-field"><span>Buscar por cliente, CUIT o concepto</span><input type="search" id="factSearch" placeholder="Buscar borrador…"></label><label class="fact-field"><span>Orden</span><select id="factSort"><option value="recent">Más recientes</option><option value="old">Más antiguos</option><option value="client">Cliente A–Z</option></select></label><span id="factHistoryCount" class="fact-history-count"></span></div><div id="factHistory">Cargando…</div></div>';
 $('factCliente').addEventListener('change',()=>{optionList();preview();});
 $('factTipo').addEventListener('change',preview);
 $('factFecha').addEventListener('input',preview);
 $('factAddItem').addEventListener('click',()=>{if(items.length>=30)return message('Máximo 30 conceptos.',true);items.push(blankItem());renderItems();});
 $('factSave').addEventListener('click',save);
 $('factPrint').addEventListener('click',printDraft);
 $('factNew').addEventListener('click',()=>{if(allowReplace())reset();});
 $('factRefresh').addEventListener('click',loadDrafts);
 $('factSearch').addEventListener('input',renderHistory);
 $('factSort').addEventListener('change',renderHistory);
 $('factCheckARCA').addEventListener('click',checkARCA);
 $('factTestWSAA').addEventListener('click',testWSAA);
 ['factWSFEStatus','factWSFETypes','factWSFEPoints'].forEach((id,i)=>$(id).addEventListener('click',()=>queryWSFE(['wsfe-dummy','wsfe-types','wsfe-points'][i],id)));
 reset();
 ready=true;
 rememberSaved();
}
function reset(){
 currentId=null;items=[blankItem()];
 $('factTitle').textContent='Nuevo borrador';$('factCliente').value='';$('factTipo').value='A';$('factFecha').value=dateToday();optionList();renderItems();message('');rememberSaved();
}
function message(s,error=false){const e=$('factMessage');e.textContent=s;e.style.color=error?'#a1263e':'#236c4e';}
function renderItems(){
 const el=$('factItems');el.innerHTML=items.map((it,i)=>'<div class="fact-item" data-index="'+i+'"><label class="fact-field fact-full"><span>Descripción del concepto *</span><input data-field="concepto" maxlength="250" value="'+esc(it.concepto)+'"></label>'+
 '<label class="fact-field"><span>Cantidad</span><input data-field="cantidad" type="number" min="0.01" step="0.01" value="'+esc(it.cantidad)+'"></label>'+
 '<label class="fact-field"><span>Precio neto unitario ($)</span><input data-field="precio" type="number" min="0.01" step="0.01" value="'+esc(it.precio)+'"></label>'+
 '<label class="fact-field"><span>IVA estimado</span><select data-field="iva">'+[21,10.5,27,0].map(x=>'<option value="'+x+'"'+(Number(it.iva)===x?' selected':'')+'>'+String(x).replace('.',',')+' %</option>').join('')+'</select></label>'+
 '<button type="button" class="secondary fact-remove" data-remove="'+i+'"'+(items.length===1?' disabled':'')+'>Quitar</button></div>').join('');
 el.querySelectorAll('[data-field]').forEach(x=>x.addEventListener('input',()=>{const idx=Number(x.closest('[data-index]').dataset.index);items[idx][x.dataset.field]=x.dataset.field==='concepto'?x.value:Number(x.value);preview();}));
 el.querySelectorAll('[data-remove]').forEach(x=>x.addEventListener('click',()=>{items.splice(Number(x.dataset.remove),1);renderItems();}));
 preview();
}
function totals(){
 let net=0,tax=0;const taxes=new Map();
 for(const i of items){
   const sub=money(Number(i.cantidad)*Number(i.precio)),rate=Number(i.iva),vat=money(sub*rate/100);
   net=money(net+sub);tax=money(tax+vat);taxes.set(rate,money((taxes.get(rate)||0)+vat));
 }
 return {net,tax,total:money(net+tax),taxes};
}
function valid(){
 if(!clients.some(c=>c.id===$('factCliente').value))return 'Seleccioná un cliente válido de Arcuva.';
 if(!$('factFecha').value)return 'Seleccioná una fecha.';
 if(!items.length||items.length>30)return 'Ingresá entre 1 y 30 conceptos.';
 for(const it of items)if(!it.concepto.trim()||it.concepto.length>250||!Number.isFinite(Number(it.cantidad))||Number(it.cantidad)<=0||!Number.isFinite(Number(it.precio))||Number(it.precio)<=0||![0,10.5,21,27].includes(Number(it.iva)))return 'Revisá las descripciones, cantidades, precios e IVA de los conceptos.';
 if(totals().total>1e12)return 'El importe total supera el máximo permitido para un borrador.';
 return '';
}
function preview(){
 const client=clients.find(c=>c.id===$('factCliente').value),selected=selectedCampaigns();
 if(!$('factNet'))return;
 $('factPreviewType').textContent='TIPO '+$('factTipo').value;
 $('factPreviewClient').textContent=client?(client.razon_social||client.nombre):'Sin seleccionar';
 $('factPreviewCampaignRow').hidden=selected.length===0;
 $('factPreviewCampaign').textContent=selected.map(c=>c.campania).join(' · ');
 $('factPreviewCuit').textContent=client?.cuit||'Pendiente';
 $('factPreviewIVACond').textContent=client?.condicion_iva||'Sin registrar';
 $('factClienteInfo').textContent=client?'CUIT: '+(client.cuit||'Pendiente')+' · Razón social: '+(client.razon_social||'Pendiente')+' · IVA: '+(client.condicion_iva||'Pendiente'):'Seleccioná un cliente.';
 $('factPreviewRows').innerHTML=items.map(it=>'<div class="fact-preview-data"><span>'+esc(it.concepto||'Sin descripción')+' ('+esc(it.cantidad)+' × '+esc(pesos(it.precio))+', IVA '+esc(it.iva)+'%)</span><strong>'+esc(pesos(money(it.cantidad*it.precio)))+'</strong></div>').join('');
 const t=totals();$('factSubtotal').textContent=pesos(t.net);$('factNet').textContent=pesos(t.net);
 $('factTaxLines').innerHTML=[...t.taxes.entries()].sort((a,b)=>b[0]-a[0]).map(([rate,tax])=>'<div class="fact-preview-data"><span>Importe IVA ('+esc(String(rate).replace('.',','))+' %)</span><strong>'+esc(pesos(tax))+'</strong></div>').join('');
 $('factTotal').textContent=pesos(t.total);
 updateDirty();
}
async function queryWSFE(action,id){
 const btn=$(id),target=$('factARCAResult');
 btn.disabled=true;target.textContent='Consultando WSFEv1 de homologación…';
 try{
   const {data,error}=await base.db.functions.invoke('arca-homologacion-arcuva-test',{body:{action}});
   if(error){
     const context=error.context;
     let diagnostic='';
     if(context&&typeof context.json==='function'){try{const detail=await context.json();diagnostic=detail?.detalle||detail?.error||'';}catch{}}
     throw Error(diagnostic||error.message||'Error de conexión');
   }
   if(!data?.ok){target.textContent='No se pudo completar la consulta: '+(data?.error||data?.mensaje||'')+(data?.codigo?' ['+data.codigo+']':'')+(data?.detalle?' · '+data.detalle:'')+' '+(data?.errores||[]).map(e=>e.codigo+': '+e.mensaje).join('; ');return;}
   if(action==='wsfe-dummy'){
     target.innerHTML='<strong>Infraestructura WSFEv1 de homologación</strong>'+
      '<div class="fact-arca-grid"><span>Aplicación</span><strong>'+esc(data.servidor||'Sin dato')+'</strong>'+
      '<span>Base de datos</span><strong>'+esc(data.bd||'Sin dato')+'</strong>'+
      '<span>Autenticación</span><strong>'+esc(data.autenticacion||'Sin dato')+'</strong></div>';
   }else if(action==='wsfe-types'){
     const list=data.comprobantes||[];
     target.innerHTML='<strong>Tipos de comprobante ('+list.length+' resultados)</strong>'+
       '<div class="fact-arca-grid">'+list.map(x=>'<span>'+esc(x.id)+'</span><strong>'+esc(x.nombre)+'</strong>').join('')+'</div>';
   }else{
     const list=data.puntos||[];
     target.innerHTML='<strong>Puntos de venta de homologación ('+list.length+')</strong>'+
       '<div class="fact-arca-grid">'+list.map(x=>'<span>Punto '+esc(x.numero)+'</span><strong>'+esc(x.tipo)+'</strong>').join('')+'</div>'+
       (list.length?'':'<p><strong>Sin puntos de venta informados.</strong> '+esc(data.advertencia||'ARCA no devolvió registros de puntos de venta para este CUIT en homologación.')+'</p><p>La comunicación y la autenticación funcionan; esto no habilita un punto de venta ni permite emitir comprobantes. No se alteraron puntos de venta reales.</p>');
   }
 }catch(e){target.textContent='No se pudo consultar WSFEv1: '+(e.message||e);}
 finally{btn.disabled=false;}
}
async function testWSAA(){
 const target=$('factARCAResult'),btn=$('factTestWSAA');
 if(!confirm('Se realizará una autenticación real contra ARCA HOMOLOGACIÓN con tu certificado personal de pruebas. No se emitirán facturas. ¿Continuar?'))return;
 btn.disabled=true;target.textContent='Solicitando ticket de acceso de homologación WSAA…';
 try{
 const {data,error}=await base.db.functions.invoke('arca-homologacion-arcuva-test',{body:{action:'login-test'}});
 if(error)throw error;
 if(!data?.ok){target.textContent='No se pudo autenticar: '+(data?.codigo?data.codigo+' · ':'')+(data?.mensaje||'Respuesta no válida');return;}
 target.innerHTML='<strong>Autenticación WSAA correcta</strong><p>Ambiente: Homologación · Servicio: wsfe · CUIT: 20-29399906-7.</p>'+
 '<p>Ticket válido hasta: '+esc(data.expira||'No informado')+'</p><p>Token y Sign permanecen en el servidor. No se emitieron comprobantes.</p>';
 }catch(err){target.textContent='La prueba WSAA no se completó: '+(err.message||err);}
 finally{btn.disabled=false;}
}
async function checkARCA(){
 const el=$('factARCAResult'),btn=$('factCheckARCA');
 if(!base.getProfile())return;
 el.textContent='Consultando configuración de homologación…';btn.disabled=true;
 try{
   const {data,error}=await base.db.functions.invoke('arca-homologacion-arcuva-test',{body:{action:'status'}});
   if(error)throw error;
   if(!data?.ok)throw Error(data?.error||'No se pudo verificar la configuración.');
   const yes=x=>x?'Configurado':'Pendiente';
   el.innerHTML='<div class="fact-arca-grid"><span>Ambiente</span><strong>Homologación</strong>'+
      '<span>Certificado digital</span><strong>'+yes(data.certificadoConfigurado)+'</strong>'+
      '<span>Clave privada (servidor)</span><strong>'+yes(data.clavePrivadaConfigurada)+'</strong>'+
      '<span>CUIT emisor</span><strong>'+yes(data.cuitConfigurado)+'</strong>'+
      '<span>Autenticación WSAA</span><strong>Pendiente de implementar y probar</strong>'+
      '<span>Servicio WSFEv1</span><strong>Pendiente de implementar y probar</strong>'+
      '<span>Emisión fiscal</span><strong>Bloqueada</strong></div><p>'+esc(data.mensaje||'')+'</p>';
 }catch(e){el.textContent='No se pudo verificar el backend de pruebas: '+(e.message||String(e));}
 finally{btn.disabled=false;}
}
async function loadClients(){
 const {data:gs,error:ge}=await base.db.from('grupos').select('id').eq('empresa_id',EMP).eq('activo',true);
 if(ge)throw ge;
 const ids=(gs||[]).map(g=>g.id);
 if(!ids.length)clients=[];
 else{
 const {data,error}=await base.db.from('clientes').select('id,nombre,razon_social,cuit,condicion_iva,direccion,condiciones_venta,grupo_id').in('grupo_id',ids).order('nombre');
 if(error)throw error;clients=(data||[]).filter(c=>ids.includes(c.grupo_id));
 }
 const selected=$('factCliente').value;
 $('factCliente').innerHTML='<option value="">Seleccionar cliente…</option>'+clients.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre)+'</option>').join('');
 if(clients.some(c=>c.id===selected))$('factCliente').value=selected;optionList();preview();
}
async function loadDrafts(){
 try{
 const {data,error}=await base.db.from(TABLE).select('id,cliente_id,campania_id,campania_ids,tipo,fecha,items,creado_en,actualizado_en').eq('empresa_id',EMP).order('actualizado_en',{ascending:false}).limit(100);
 if(error)throw error;drafts=data||[];
 renderHistory();
 }catch(e){$('factHistory').textContent='No se pudieron consultar los borradores: '+(e.message||e);}
}
function draftTotal(d){
 return (Array.isArray(d.items)?d.items:[]).reduce((sum,it)=>money(sum+money(Number(it.cantidad||0)*Number(it.precio||0)*(1+Number(it.iva||0)/100))),0);
}
function renderHistory(){
 const box=$('factHistory');if(!box)return;
 const search=($('factSearch')?.value||'').trim().toLocaleLowerCase('es');
 const name=d=>clients.find(c=>c.id===d.cliente_id)?.nombre||'Cliente no encontrado';
 const filtered=drafts.filter(d=>{
   const client=clients.find(c=>c.id===d.cliente_id);
   return [name(d),client?.razon_social,client?.cuit,...(Array.isArray(d.items)?d.items.map(it=>it.concepto):[])].join(' ').toLocaleLowerCase('es').includes(search);
 });
 const sort=$('factSort')?.value||'recent';
 filtered.sort((a,b)=>sort==='client'?name(a).localeCompare(name(b),'es'):sort==='old'?String(a.actualizado_en).localeCompare(String(b.actualizado_en)):String(b.actualizado_en).localeCompare(String(a.actualizado_en)));
 $('factHistoryCount').textContent=filtered.length+' de '+drafts.length+' borradores';
 box.innerHTML=filtered.length?'<div class="fact-history-list">'+filtered.map(d=>'<div class="fact-draft"><div class="fact-draft-meta"><strong>'+esc(name(d))+'</strong><small>Tipo '+esc(d.tipo)+' · '+esc(d.fecha)+' · '+esc(Array.isArray(d.items)?d.items.length:0)+' concepto(s)</small><span class="fact-draft-total">'+esc(pesos(draftTotal(d)))+'</span></div><div class="fact-draft-actions"><button class="secondary" type="button" data-edit="'+esc(d.id)+'">Abrir</button><button class="secondary" type="button" data-copy="'+esc(d.id)+'">Duplicar</button><button class="secondary" type="button" data-delete="'+esc(d.id)+'">Descartar</button></div></div>').join('')+'</div>':'<div class="empty">'+(drafts.length?'No hay borradores que coincidan con la búsqueda.':'Todavía no hay borradores guardados.')+'</div>';
 box.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openDraft(b.dataset.edit)));
 box.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>duplicateDraft(b.dataset.copy)));
 box.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>discard(b.dataset.delete)));
}
function openDraft(id){
 const d=drafts.find(x=>x.id===id);if(!d||!allowReplace())return;
 currentId=d.id;$('factTitle').textContent='Editar borrador';
 $('factCliente').value=d.cliente_id;$('factTipo').value=d.tipo;$('factFecha').value=d.fecha;
 optionList(Array.isArray(d.campania_ids)&&d.campania_ids.length?d.campania_ids:(d.campania_id?[d.campania_id]:[]));
 items=structuredClone(d.items);renderItems();rememberSaved();message('Borrador recuperado.');root.scrollIntoView({behavior:'smooth',block:'start'});
}
function duplicateDraft(id){
 const d=drafts.find(x=>x.id===id);
 if(!d||!allowReplace())return;
 currentId=null;
 $('factTitle').textContent='Nuevo borrador (copia)';
 $('factCliente').value=d.cliente_id;
 $('factTipo').value=d.tipo;
 $('factFecha').value=dateToday();
 optionList(Array.isArray(d.campania_ids)&&d.campania_ids.length?d.campania_ids:(d.campania_id?[d.campania_id]:[]));
 items=structuredClone(d.items);
 renderItems();
 // La copia nunca reutiliza el ID original: el primer guardado genera una fila nueva.
 isDirty=true;
 baseline='';updateDirty();
 message('Copia preparada. Revisá los datos y presioná Guardar borrador para crear uno nuevo.');
 root.scrollIntoView({behavior:'smooth',block:'start'});
}
async function save(){
 if(busy)return;const error=valid();if(error)return message(error,true);
 busy=true;$('factSave').disabled=true;message('Guardando…');
 try{
 const {data:{user},error:authError}=await base.db.auth.getUser();if(authError||!user)throw Error('La sesión no está activa.');
 const selectedIds=selectedCampaignIds();
 const data={empresa_id:EMP,creado_por:user.id,cliente_id:$('factCliente').value,campania_id:selectedIds[0]||null,campania_ids:selectedIds,tipo:$('factTipo').value,fecha:$('factFecha').value,items:items.map(i=>({concepto:i.concepto.trim(),cantidad:Number(i.cantidad),precio:Number(i.precio),iva:Number(i.iva)})),actualizado_en:new Date().toISOString()};
 let result;
 if(currentId){result=await base.db.from(TABLE).update(data).eq('id',currentId).eq('empresa_id',EMP).select('id').single();}
 else result=await base.db.from(TABLE).insert(data).select('id').single();
 if(result.error)throw result.error;
 currentId=result.data?.id||currentId;$('factTitle').textContent='Editar borrador';rememberSaved();message('Borrador guardado correctamente.');await loadDrafts();
 }catch(e){message('No se pudo guardar: '+(e.message||e),true);}
 finally{busy=false;$('factSave').disabled=false;}
}
async function discard(id){
 if(!confirm('¿Descartar este borrador de prueba? Esta acción no se puede deshacer.'))return;
 const {error}=await base.db.from(TABLE).delete().eq('id',id).eq('empresa_id',EMP);
 if(error){message('No se pudo descartar: '+error.message,true);return;}
 if(currentId===id)reset();await loadDrafts();
}
function printDraft(){
 const warning=valid();if(warning){message(warning,true);return;}
 const client=clients.find(c=>c.id===$('factCliente').value);
 const selected=selectedCampaigns();
 const values=totals(),type=$('factTipo').value,date=$('factFecha').value;
 const logo=$('sidebarLogo')?.currentSrc||$('sidebarLogo')?.src||'';
 const logoSafe=/^https:\/\/qkstdmskuiclbcrncfun\.supabase\.co\/storage\/v1\/object\/public\/company-branding\//i.test(logo)?logo:'';
 // Datos fiscales no suministrados: nunca se inventan domicilio, CAE, número ni QR.
 const issuer={name:'ARCUVA',cuit:'30-71680941-9',iva:'Responsable Inscripto'};
 const show=v=>esc(String(v??'').trim()||'No informado');
 const showDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):show(v);
 const taxGroups=new Map();
 for(const item of items){
   const rate=Number(item.iva);
   const net=money(Number(item.cantidad)*Number(item.precio));
   taxGroups.set(rate,money((taxGroups.get(rate)||0)+money(net*rate/100)));
 }
 const taxRows=[...taxGroups.entries()].sort((a,b)=>b[0]-a[0]).map(([rate,tax])=>'<div class="total-row"><span>Importe IVA ('+esc(String(rate).replace('.',','))+' %)</span><strong>'+esc(pesos(tax))+'</strong></div>').join('');
 const rows=items.map(item=>{
   const subtotal=money(Number(item.cantidad)*Number(item.precio));
   return '<tr><td>'+show(item.concepto)+'</td><td class="num">'+show(item.cantidad)+'</td><td class="num">'+esc(pesos(item.precio))+'</td><td class="num">'+esc(String(item.iva).replace('.',','))+' %</td><td class="num">'+esc(pesos(subtotal))+'</td></tr>';
 }).join('');
 const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>Borrador Arcuva - '+esc(client.nombre)+'</title>'+
 '<style>'+
 '@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#eef1f4;font-family:Arial,Helvetica,sans-serif;color:#171717;font-size:11px;line-height:1.36}'+
 '.toolbar{max-width:210mm;margin:16px auto 10px;display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:12px}'+
 '.toolbar button{border:1px solid #1e3c5e;background:#1e3c5e;color:white;border-radius:5px;padding:10px 17px;cursor:pointer;font-weight:bold}'+
 '.sheet{width:210mm;min-height:297mm;margin:0 auto 24px;background:white;padding:12mm;display:flex;flex-direction:column;box-shadow:0 5px 24px #0002}'+
 '.header{display:grid;grid-template-columns:1fr 66px 1fr;gap:16px;min-height:111px;padding-bottom:13px;border-bottom:1px solid #292929;align-items:start}'+
 '.brand img{display:block;max-width:165px;max-height:75px;object-fit:contain;object-position:left center;margin:0 0 12px}.brand strong{font-size:14px}'+
 '.data-line{margin:4px 0;overflow-wrap:anywhere}.data-line b{display:inline-block;min-width:85px}'+
 '.type{text-align:center;border:1px solid #444;margin-top:2px;align-self:start}.type strong{display:block;font-size:36px;line-height:1.1;padding:6px 12px}.type small{display:block;border-top:1px solid #555;padding:4px 6px;white-space:nowrap}'+
 '.receipt{padding-left:6px}.receipt h1{font-size:22px;margin:0 0 2px;font-weight:700}.receipt h2{font-size:13px;margin:0 0 16px;font-weight:normal}.receipt .data-line b{min-width:103px}'+
 '.section{border:1px solid #555;margin-top:16px;padding:10px 12px;break-inside:avoid}.section-title{font-size:11px;font-weight:bold;text-transform:uppercase;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:6px}'+
 '.customer-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:16px}.customer-grid .data-line b{min-width:98px}'+
 '.details{margin-top:19px;border:1px solid #555;min-height:220px;display:flex;flex-direction:column}.details table{border-collapse:collapse;width:100%;table-layout:fixed}'+
 '.details th{background:#ededed;font-size:10px;text-align:left;font-weight:bold;padding:10px 7px;border-bottom:1px solid #666}.details td{padding:9px 7px;border-bottom:1px solid #d9d9d9;vertical-align:top;overflow-wrap:anywhere}'+
 '.details th+th,.details td+td{border-left:1px solid #ddd}.details th:first-child{width:43%}.details th:nth-child(2){width:10%}.details th:nth-child(3){width:20%}.details th:nth-child(4){width:10%}.details th:nth-child(5){width:17%}.num{text-align:right;white-space:nowrap}'+
 '.campaign-note{padding:10px 8px;margin-top:auto;border-top:1px solid #eee;color:#555;font-size:10px}'+
 '.totals{width:48%;margin:15px 0 16px auto;border:1px solid #666;break-inside:avoid}.total-row{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #ddd;padding:9px 11px}.total-row:last-child{border-bottom:0}.total-row strong{white-space:nowrap}.grand{background:#ededed;font-size:14px;font-weight:bold}'+
 '.spacer{flex:1;min-height:23px}.footer{border-top:1px solid #555;padding-top:12px;break-inside:avoid}.footer-grid{display:grid;grid-template-columns:98px 1fr;gap:16px;align-items:center;min-height:88px}.qr-placeholder{width:87px;height:87px;border:1px solid #aaa;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;color:#555;padding:7px}.footer p{margin:4px 0}.nonfiscal{border:1px solid #999;padding:8px;text-align:center;font-weight:bold;margin:12px 0 0;letter-spacing:.04em}'+
 '@media screen and (max-width:820px){.sheet{width:100%;min-height:0;padding:24px 15px}.header{grid-template-columns:1fr 60px 1fr;gap:9px}.receipt h1{font-size:17px}.customer-grid{grid-template-columns:1fr}.totals{width:100%}.details{overflow-x:auto}.details table{min-width:590px}.toolbar{padding:0 14px}}'+
 '.toolbar{flex-wrap:wrap}.toolbar [hidden]{display:none!important}.toolbar a{display:inline-block;border:1px solid #1e3c5e;border-radius:5px;padding:10px 12px;color:#1e3c5e;text-decoration:none;font-weight:bold}.toolbar button:disabled{opacity:.6}.toolbar #pdfStatus{flex-basis:100%;font-size:12px}.pdf-export .sheet{width:210mm!important;min-height:296mm!important;padding:12mm!important;box-shadow:none!important}.pdf-export .header{grid-template-columns:1fr 66px 1fr;gap:16px}.pdf-export .receipt h1{font-size:22px}.pdf-export .customer-grid{grid-template-columns:1fr 1fr}.pdf-export .totals{width:48%}.pdf-export .details{overflow:visible}.pdf-export .details table{min-width:0}'+
 '@media print{html,body{background:#fff}.toolbar{display:none}.sheet{margin:0;width:auto;min-height:273mm;padding:0;box-shadow:none}.header,.section,.totals,.footer{break-inside:avoid}.details tr{break-inside:avoid}.spacer{min-height:10px}}'+
 '</style></head><body><div class="toolbar"><strong>Vista previa de borrador · Arcuva</strong><button type="button" id="pdfGenerate">Generar PDF</button><button type="button" id="nativePrint">Imprimir</button><a id="pdfOpen" target="_blank" rel="noopener" hidden>Abrir PDF</a><a id="pdfDownload" hidden>Descargar PDF</a><button type="button" id="pdfShare" hidden>Compartir / Guardar PDF</button><span id="pdfStatus" role="status" aria-live="polite"></span></div>'+
 '<main class="sheet"><header class="header"><div class="brand">'+(logoSafe?'<img src="'+esc(logoSafe)+'" alt="Logo oficial de Arcuva">':'<strong>ARCUVA</strong>')+
 '<div class="data-line"><b>Emisor:</b> '+issuer.name+'</div><div class="data-line"><b>CUIT:</b> '+issuer.cuit+'</div><div class="data-line"><b>IVA:</b> '+issuer.iva+'</div>'+
 '<div class="data-line"><b>Domicilio fiscal:</b> Pendiente de configuración</div></div>'+
 '<div class="type"><strong>'+esc(type)+'</strong><small>Código '+(type==='A'?'01':'06')+'</small></div>'+
 '<div class="receipt"><h1>FACTURA</h1><h2>Modelo de borrador</h2>'+
 '<div class="data-line"><b>Punto de venta:</b> No asignado</div><div class="data-line"><b>Comprobante N.º:</b> No asignado</div>'+
 '<div class="data-line"><b>Fecha:</b> '+showDate(date)+'</div></div></header>'+
 '<section class="section"><div class="section-title">Datos del cliente</div><div class="customer-grid"><div>'+
 '<div class="data-line"><b>Cliente:</b> '+show(client.nombre)+'</div><div class="data-line"><b>Razón social:</b> '+show(client.razon_social)+'</div>'+
 '<div class="data-line"><b>CUIT:</b> '+show(client.cuit)+'</div></div><div>'+
 '<div class="data-line"><b>Condición IVA:</b> '+show(client.condicion_iva)+'</div>'+
 '<div class="data-line"><b>Domicilio:</b> '+show(client.direccion)+'</div>'+
 '<div class="data-line"><b>Condición de venta:</b> '+show(Array.isArray(client.condiciones_venta)?client.condiciones_venta.join(', '):'')+'</div></div></div></section>'+
 '<section class="details"><table><thead><tr><th>Descripción</th><th class="num">Cantidad</th><th class="num">Precio unit.</th><th class="num">IVA</th><th class="num">Importe</th></tr></thead>'+
 '<tbody>'+rows+'</tbody></table>'+(selected.length?'<div class="campaign-note">Campañas asociadas: '+selected.map(c=>show(c.campania)).join(' · ')+'</div>':'')+'</section>'+
 '<section class="totals"><div class="total-row"><span>Subtotal</span><strong>'+esc(pesos(values.net))+'</strong></div><div class="total-row"><span>Subtotal Neto</span><strong>'+esc(pesos(values.net))+'</strong></div>'+taxRows+
 '<div class="total-row grand"><span>Importe Total</span><strong>'+esc(pesos(values.total))+'</strong></div></section>'+
 '<div class="spacer"></div><footer class="footer"><div class="footer-grid"><div class="qr-placeholder">QR disponible solo con comprobante autorizado</div>'+
 '<div><p><b>CAE:</b> No emitido</p><p><b>Vencimiento CAE:</b> No corresponde</p>'+
 '<p>Estos datos se completarán únicamente después de recibir autorización de ARCA.</p></div></div>'+
 '<p class="nonfiscal">BORRADOR – SIN VALIDEZ FISCAL</p></footer></main></body></html>';
 const previewScript="(function(){\n const $=id=>document.getElementById(id);\n const status=$('pdfStatus'),generate=$('pdfGenerate'),open=$('pdfOpen'),share=$('pdfShare');\n let file=null,objectUrl=null,loading=null;\n function loadLibrary(){\n  if(typeof window.html2pdf==='function')return Promise.resolve();\n  if(!loading)loading=new Promise((resolve,reject)=>{\n   const s=document.createElement('script');\n   s.src='https://cdn.jsdelivr.net/npm/html2pdf.js@0.14.0/dist/html2pdf.bundle.min.js';\n   s.crossOrigin='anonymous';\n   s.onload=()=>typeof window.html2pdf==='function'?resolve():reject(Error('Biblioteca PDF no disponible.'));\n   s.onerror=()=>{s.remove();reject(Error('No se pudo cargar el generador PDF. Revisá la conexión.'));};\n   document.head.appendChild(s);\n  }).catch(e=>{loading=null;throw e;});\n  return loading;\n }\n $('nativePrint').addEventListener('click',()=>window.print());\n generate.addEventListener('click',async()=>{\n  generate.disabled=true;status.textContent='Generando PDF…';\n  const sheet=document.querySelector('.sheet');\n  try{\n   await loadLibrary();\n   await Promise.all([...sheet.querySelectorAll('img')].map(img=>img.decode?img.decode().catch(()=>{}):Promise.resolve()));\n   document.documentElement.classList.add('pdf-export');\n   const blob=await window.html2pdf().set({\n    margin:0,filename:'Borrador-Arcuva.pdf',image:{type:'jpeg',quality:0.97},\n    html2canvas:{scale:1.5,useCORS:true,backgroundColor:'#ffffff',windowWidth:1000,scrollX:0,scrollY:0},\n    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},\n    pagebreak:{mode:['css'],avoid:['.header','.section','.details tr','.totals','.footer']}\n   }).from(sheet).outputPdf('blob');\n   if(!blob||blob.size<100)throw Error('No se generó un archivo válido.');\n   const filename='Borrador-Arcuva-'+document.title.replace(/^Borrador Arcuva - /,'').replace(/[^\\p{L}\\p{N}_-]+/gu,'-').slice(0,80)+'.pdf';\n   if(objectUrl)URL.revokeObjectURL(objectUrl);\n   objectUrl=URL.createObjectURL(blob);\n   file=typeof File==='function'?new File([blob],filename,{type:'application/pdf'}):null;\n   open.href=objectUrl;open.hidden=false;\n   $('pdfDownload').href=objectUrl;$('pdfDownload').download=filename;$('pdfDownload').hidden=false;\n   share.hidden=!(file&&navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}));\n   status.textContent='PDF listo. Abrilo, descargalo o compartilo para guardar en Archivos.';\n  }catch(e){status.textContent='No se pudo generar el PDF: '+(e.message||e)+'. Podés intentar imprimir desde el navegador.';}\n  finally{document.documentElement.classList.remove('pdf-export');generate.disabled=false;}\n });\n share.addEventListener('click',async()=>{\n  if(!file)return;\n  try{await navigator.share({files:[file],title:'Borrador Arcuva'});}\n  catch(e){if(e.name!=='AbortError')status.textContent='No se pudo compartir. Usá Abrir PDF o Descargar PDF.';}\n });\n})();";
 const previewHtml=html.replace('</body>','<script>'+previewScript+'</'+'script></body>');
 const url=URL.createObjectURL(new Blob([previewHtml],{type:'text/html;charset=utf-8'}));
 const windowRef=window.open(url,'_blank');
 if(windowRef){try{windowRef.opener=null;}catch{}}
 else{
  message('El navegador bloqueó la vista previa. ',true);
  const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';link.textContent='Abrir comprobante';$('factMessage').appendChild(link);
 }
 // Mantener disponible la vista previa para el enlace manual y para recargarla.
 setTimeout(()=>URL.revokeObjectURL(url),30*60*1000);
}
window.addEventListener('arcuva-page-facturacion',async()=>{
 if(!base.getProfile())return;if(!ready)init();
 try{await loadClients();await loadDrafts();}catch(e){message('No se pudieron cargar los datos: '+(e.message||e),true);}
});
})();