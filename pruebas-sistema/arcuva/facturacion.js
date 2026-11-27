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
let clients=[],campaigns=[],drafts=[],items=[],currentId=null,ready=false,busy=false;
function blankItem(){return {concepto:'Servicio de publicidad en pantalla LED',cantidad:1,precio:100000,iva:21};}
function optionList(){const id=$('factCliente')?.value||'';campaigns=(base.getModel()?.campaigns||[]).filter(c=>c.cliente_id===id&&c.eliminada!==true);const select=$('factCampania');if(!select)return;let previous=select.value;select.innerHTML='<option value="">Sin campaña vinculada</option>'+campaigns.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.campania)+'</option>').join('');if(campaigns.some(c=>c.id===previous))select.value=previous;}
function init(){
 root.innerHTML='<div class="fact-head"><div><span class="kicker">Administración comercial</span><h2>Facturación</h2><p>Borradores de facturación vinculados a clientes y campañas de Arcuva.</p></div><span class="fact-status">PRUEBAS · SIN ARCA</span></div>'+
 '<div class="fact-notice"><strong>Modo borrador.</strong> No genera una factura válida, número fiscal ni CAE. No envía nada a ARCA. Los importes son estimativos; el tratamiento tributario definitivo debe validarse antes de emitir.</div>'+
 '<div class="fact-card fact-arca-status"><div class="fact-arca-header"><div><h3>Conexión ARCA · Homologación</h3><p class="fact-arca-caption">Verifica la preparación del backend. No solicita CAE ni genera facturas.</p></div><div class="fact-arca-actions"><button type="button" class="secondary" id="factCheckARCA">Verificar configuración</button><button type="button" class="secondary" id="factTestWSAA">Probar autenticación WSAA</button><button type="button" class="secondary" id="factWSFEStatus">Estado WSFEv1</button><button type="button" class="secondary" id="factWSFETypes">Tipos de comprobante</button><button type="button" class="secondary" id="factWSFEPoints">Puntos de venta</button></div></div><div id="factARCAResult" role="status">Sin verificar. Las credenciales y el certificado deben configurarse exclusivamente en Supabase.</div></div>'+
 '<div class="fact-layout"><div class="fact-card"><div class="fact-topline"><h3 id="factTitle">Nuevo borrador</h3><span id="factMessage" role="status"></span></div><div class="fact-grid">'+
 '<label class="fact-field fact-full"><span>Cliente *</span><select id="factCliente"><option value="">Cargando clientes…</option></select></label>'+
 '<div class="fact-client-info fact-full" id="factClienteInfo">Seleccioná un cliente.</div>'+
 '<label class="fact-field fact-full"><span>Campaña asociada (opcional)</span><select id="factCampania"><option value="">Sin campaña vinculada</option></select></label>'+
 '<label class="fact-field"><span>Tipo orientativo</span><select id="factTipo"><option value="A">Factura A</option><option value="B">Factura B</option></select></label>'+
 '<label class="fact-field"><span>Fecha de borrador</span><input id="factFecha" type="date"></label>'+
 '</div><div class="fact-items-head"><h3>Conceptos</h3><button type="button" class="secondary" id="factAddItem">+ Agregar concepto</button></div>'+
 '<div id="factItems"></div><div class="fact-actions"><button class="primary" type="button" id="factSave">Guardar borrador</button><button class="secondary" type="button" id="factPrint">Imprimir simulación</button><button class="secondary" type="button" id="factNew">Nuevo</button></div></div>'+
 '<aside class="fact-card fact-preview"><div class="fact-preview-top"><span>VISTA PREVIA · SIN VALIDEZ FISCAL</span><strong id="factPreviewType">TIPO A</strong></div><h3>ARCUVA</h3><p>Responsable Inscripto · Sin autorización de ARCA</p><hr>'+
 '<div class="fact-preview-data"><span>Cliente</span><strong id="factPreviewClient">—</strong></div><div class="fact-preview-data"><span>Campaña</span><strong id="factPreviewCampaign">—</strong></div><div id="factPreviewRows"></div><hr>'+
 '<div class="fact-preview-data"><span>Importe neto</span><strong id="factNet">—</strong></div><div class="fact-preview-data"><span>IVA estimado</span><strong id="factTax">—</strong></div>'+
 '<div class="fact-total"><span>Total estimado</span><strong id="factTotal">—</strong></div><p class="fact-disclaimer">NO VÁLIDO COMO FACTURA. Sin CAE, numeración ni autorización de ARCA. No incluye percepciones, retenciones ni regímenes especiales.</p></aside></div>'+
 '<div class="fact-card fact-history"><div class="fact-items-head"><h3>Borradores guardados</h3><button class="secondary" type="button" id="factRefresh">Actualizar lista</button></div><div id="factHistory">Cargando…</div></div>';
 $('factCliente').addEventListener('change',()=>{optionList();preview();});
 $('factCampania').addEventListener('change',preview);
 $('factTipo').addEventListener('change',preview);
 $('factAddItem').addEventListener('click',()=>{if(items.length>=30)return message('Máximo 30 conceptos.',true);items.push(blankItem());renderItems();});
 $('factSave').addEventListener('click',save);
 $('factPrint').addEventListener('click',printDraft);
 $('factNew').addEventListener('click',()=>reset());
 $('factRefresh').addEventListener('click',loadDrafts);
 $('factCheckARCA').addEventListener('click',checkARCA);
 $('factTestWSAA').addEventListener('click',testWSAA);
 ['factWSFEStatus','factWSFETypes','factWSFEPoints'].forEach((id,i)=>$(id).addEventListener('click',()=>queryWSFE(['wsfe-dummy','wsfe-types','wsfe-points'][i],id)));
 reset();
 ready=true;
}
function reset(){
 currentId=null;items=[blankItem()];
 $('factTitle').textContent='Nuevo borrador';$('factCliente').value='';$('factTipo').value='A';$('factFecha').value=dateToday();optionList();renderItems();message('');
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
 let net=0,tax=0;
 for(const i of items){const sub=money(Number(i.cantidad)*Number(i.precio));net=money(net+sub);tax=money(tax+money(sub*Number(i.iva)/100));}
 return {net,tax,total:money(net+tax)};
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
 const client=clients.find(c=>c.id===$('factCliente').value),camp=campaigns.find(c=>c.id===$('factCampania').value);
 if(!$('factNet'))return;
 $('factPreviewType').textContent='TIPO '+$('factTipo').value;
 $('factPreviewClient').textContent=client?.nombre||'Sin seleccionar';
 $('factPreviewCampaign').textContent=camp?.campania||'Sin vincular';
 $('factClienteInfo').textContent=client?'CUIT: '+(client.cuit||'Pendiente')+' · Razón social: '+(client.razon_social||'Pendiente')+' · IVA: '+(client.condicion_iva||'Pendiente'):'Seleccioná un cliente.';
 $('factPreviewRows').innerHTML=items.map(it=>'<div class="fact-preview-data"><span>'+esc(it.concepto||'Sin descripción')+' ('+esc(it.cantidad)+' × '+esc(pesos(it.precio))+', IVA '+esc(it.iva)+'%)</span><strong>'+esc(pesos(money(it.cantidad*it.precio)))+'</strong></div>').join('');
 const t=totals();$('factNet').textContent=pesos(t.net);$('factTax').textContent=pesos(t.tax);$('factTotal').textContent=pesos(t.total);
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
 const {data,error}=await base.db.from('clientes').select('id,nombre,razon_social,cuit,condicion_iva,grupo_id').in('grupo_id',ids).order('nombre');
 if(error)throw error;clients=(data||[]).filter(c=>ids.includes(c.grupo_id));
 }
 const selected=$('factCliente').value;
 $('factCliente').innerHTML='<option value="">Seleccionar cliente…</option>'+clients.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre)+'</option>').join('');
 if(clients.some(c=>c.id===selected))$('factCliente').value=selected;optionList();preview();
}
async function loadDrafts(){
 try{
 const {data,error}=await base.db.from(TABLE).select('id,cliente_id,campania_id,tipo,fecha,items,creado_en,actualizado_en').eq('empresa_id',EMP).order('actualizado_en',{ascending:false}).limit(100);
 if(error)throw error;drafts=data||[];
 $('factHistory').innerHTML=drafts.length?'<div class="fact-history-list">'+drafts.map(d=>{const name=clients.find(c=>c.id===d.cliente_id)?.nombre||'Cliente no encontrado';return '<div class="fact-draft"><div><strong>'+esc(name)+'</strong><small>Tipo '+esc(d.tipo)+' · '+esc(d.fecha)+' · '+esc(d.items.length)+' concepto(s)</small></div><div class="fact-draft-actions"><button class="secondary" type="button" data-edit="'+esc(d.id)+'">Abrir</button><button class="secondary" type="button" data-delete="'+esc(d.id)+'">Descartar</button></div></div>';}).join('')+'</div>':'<div class="empty">Todavía no hay borradores guardados.</div>';
 $('factHistory').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openDraft(b.dataset.edit)));
 $('factHistory').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>discard(b.dataset.delete)));
 }catch(e){$('factHistory').textContent='No se pudieron consultar los borradores: '+(e.message||e);}
}
function openDraft(id){
 const d=drafts.find(x=>x.id===id);if(!d)return;
 currentId=d.id;$('factTitle').textContent='Editar borrador';
 $('factCliente').value=d.cliente_id;$('factTipo').value=d.tipo;$('factFecha').value=d.fecha;
 optionList();$('factCampania').value=campaigns.some(c=>c.id===d.campania_id)?d.campania_id:'';
 items=structuredClone(d.items);renderItems();message('Borrador recuperado.');root.scrollIntoView({behavior:'smooth',block:'start'});
}
async function save(){
 if(busy)return;const error=valid();if(error)return message(error,true);
 busy=true;$('factSave').disabled=true;message('Guardando…');
 try{
 const {data:{user},error:authError}=await base.db.auth.getUser();if(authError||!user)throw Error('La sesión no está activa.');
 const data={empresa_id:EMP,creado_por:user.id,cliente_id:$('factCliente').value,campania_id:$('factCampania').value||null,tipo:$('factTipo').value,fecha:$('factFecha').value,items:items.map(i=>({concepto:i.concepto.trim(),cantidad:Number(i.cantidad),precio:Number(i.precio),iva:Number(i.iva)})),actualizado_en:new Date().toISOString()};
 let result;
 if(currentId){result=await base.db.from(TABLE).update(data).eq('id',currentId).eq('empresa_id',EMP).select('id').single();}
 else result=await base.db.from(TABLE).insert(data).select('id').single();
 if(result.error)throw result.error;
 currentId=result.data?.id||currentId;$('factTitle').textContent='Editar borrador';message('Borrador guardado correctamente.');await loadDrafts();
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
 const msg=valid();if(msg)return message(msg,true);
 const client=clients.find(c=>c.id===$('factCliente').value),camp=campaigns.find(c=>c.id===$('factCampania').value),t=totals();
 const w=window.open('','_blank','width=750,height=830');if(!w)return message('Permití ventanas emergentes para imprimir.',true);
 const lines=items.map(i=>'<tr><td>'+esc(i.concepto)+'</td><td>'+esc(i.cantidad)+'</td><td>'+esc(pesos(i.precio))+'</td><td>'+esc(i.iva)+' %</td><td>'+esc(pesos(money(i.cantidad*i.precio)))+'</td></tr>').join('');
 w.document.open();w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Simulación ARCUVA</title><style>body{font:13px Arial;color:#17365e;margin:30px}.warn{border:2px solid #b33;color:#b22;padding:18px;text-align:center;font-size:20px;font-weight:bold;margin:25px 0}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #dde5ee;padding:10px}td:last-child{text-align:right}.total{font-size:20px;font-weight:bold;text-align:right;margin-top:22px}small{color:#637b95}@media print{button{display:none}}</style></head><body><h1>ARCUVA</h1><small>Simulación de comprobante tipo '+esc($('factTipo').value)+' · '+esc($('factFecha').value)+'</small><div class="warn">NO VÁLIDO COMO FACTURA<br><small>Sin CAE ni numeración fiscal · No autorizado por ARCA</small></div><p><b>Cliente:</b> '+esc(client.nombre)+' · <b>CUIT:</b> '+esc(client.cuit||'Pendiente')+'</p><p><b>Campaña:</b> '+esc(camp?.campania||'Sin vincular')+'</p><table><thead><tr><th>Concepto</th><th>Cant.</th><th>Precio neto</th><th>IVA</th><th>Subtotal</th></tr></thead><tbody>'+lines+'</tbody></table><p>Neto: '+esc(pesos(t.net))+'<br>IVA estimado: '+esc(pesos(t.tax))+'</p><div class="total">TOTAL ESTIMADO: '+esc(pesos(t.total))+'</div><p><small>Documento de prueba sin validez fiscal. No incluye retenciones, percepciones ni regímenes especiales.</small></p><button onclick="window.print()">Imprimir / Guardar PDF</button></body></html>');
 w.document.close();
}
window.addEventListener('arcuva-page-facturacion',async()=>{
 if(!base.getProfile())return;if(!ready)init();
 try{await loadClients();await loadDrafts();}catch(e){message('No se pudieron cargar los datos: '+(e.message||e),true);}
});
})();