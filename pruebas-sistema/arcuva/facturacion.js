// Arcuva facturación - etapa 1: borradores NO fiscales, solo cálculos en memoria.
(()=>{
'use strict';
const base=window.ArcuvaPortalBase, root=document.getElementById('facturacionRoot');
if(!base||!root)return;
const COMPANY_ID='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pesos=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n);
let clients=[],loading=false,initialized=false;
function init(){
 root.innerHTML='<div class="fact-head"><div><span class="kicker">Administración comercial</span><h2>Facturación</h2><p>Preparación de facturas de servicios publicitarios.</p></div><span class="fact-status">SIMULACIÓN · SIN EMISIÓN</span></div>'+
 '<div class="fact-notice"><strong>Entorno de desarrollo:</strong> esta sección NO envía datos a ARCA, NO genera CAE, NO asigna numeración fiscal y NO guarda facturas.</div>'+
 '<div class="fact-layout"><div class="fact-card"><h3>Datos del borrador</h3><div class="fact-grid">'+
 '<label class="fact-field fact-full"><span>Cliente de Arcuva</span><select id="factCliente"><option value="">Cargando clientes…</option></select></label>'+
 '<div class="fact-client-info fact-full" id="factClienteInfo">Seleccioná un cliente.</div>'+
 '<label class="fact-field"><span>Comprobante orientativo</span><select id="factTipo"><option value="A">Factura A</option><option value="B">Factura B</option></select></label>'+
 '<label class="fact-field"><span>Fecha del borrador</span><input type="date" id="factFecha"></label>'+
 '<label class="fact-field fact-full"><span>Concepto de facturación</span><input id="factConcepto" maxlength="250" value="Servicio de publicidad en pantalla LED"></label>'+
 '<label class="fact-field"><span>Importe neto ($)</span><input type="number" id="factNeto" min="0.01" step="0.01" value="100000"></label>'+
 '<label class="fact-field"><span>IVA para simulación</span><select id="factIVA"><option value="21">21 %</option><option value="10.5">10,5 %</option><option value="27">27 %</option><option value="0">0 %</option></select></label>'+
 '</div><div class="fact-actions"><button type="button" id="factCalcular" class="primary">Actualizar cálculo</button><button type="button" id="factLimpiar" class="secondary">Limpiar</button></div></div>'+
 '<aside class="fact-card fact-preview"><div class="fact-preview-top"><span>VISTA PREVIA · SIN VALIDEZ FISCAL</span><strong id="factPreviewType">FACTURA A</strong></div><h3>ARCUVA</h3><p>Responsable Inscripto · Emisor pendiente de configuración</p><hr>'+
 '<div class="fact-preview-data"><span>Cliente</span><strong id="factPreviewClient">—</strong></div><div class="fact-preview-data"><span>Concepto</span><strong id="factPreviewConcept">—</strong></div>'+
 '<div class="fact-preview-data"><span>Fecha</span><strong id="factPreviewDate">—</strong></div><hr>'+
 '<div class="fact-preview-data"><span>Neto</span><strong id="factPreviewNeto">$ 0,00</strong></div>'+
 '<div class="fact-preview-data"><span id="factPreviewIVATitle">IVA (21 %)</span><strong id="factPreviewIVA">$ 0,00</strong></div>'+
 '<div class="fact-total"><span>Total estimado</span><strong id="factPreviewTotal">$ 0,00</strong></div>'+
 '<p class="fact-disclaimer">No es una factura electrónica. El tipo de comprobante y los importes definitivos requieren validación fiscal. No incluye percepciones ni regímenes especiales.</p></aside></div>';
 $('factFecha').value=new Date().toLocaleDateString('en-CA');
 ['factCliente','factTipo','factFecha','factConcepto','factNeto','factIVA'].forEach(id=>$(id).addEventListener('input',calculate));
 $('factCalcular').addEventListener('click',calculate);
 $('factLimpiar').addEventListener('click',()=>{$('factCliente').value='';$('factTipo').value='A';$('factConcepto').value='Servicio de publicidad en pantalla LED';$('factNeto').value='100000';$('factIVA').value='21';calculate();});
 initialized=true;calculate();
}
async function loadClients(){
 if(loading||!base.getProfile())return;
 loading=true;
 try{
 const {data:groups,error:ge}=await base.db.from('grupos').select('id').eq('empresa_id',COMPANY_ID).eq('activo',true);
 if(ge)throw ge;
 const ids=(groups||[]).map(g=>g.id);
 if(ids.length){
   const {data,error}=await base.db.from('clientes').select('id,nombre,cuit,direccion,email,grupo_id').in('grupo_id',ids).order('nombre');
   if(error)throw error;
   clients=(data||[]).filter(c=>ids.includes(c.grupo_id));
 }else clients=[];
 const selected=$('factCliente').value;
 $('factCliente').innerHTML='<option value="">Seleccionar cliente…</option>'+clients.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre)+'</option>').join('');
 if(clients.some(c=>c.id===selected))$('factCliente').value=selected;
 calculate();
 }catch(err){$('factCliente').innerHTML='<option value="">No se pudieron consultar los clientes</option>';$('factClienteInfo').textContent='Error al consultar clientes: '+(err.message||'Desconocido');}
 finally{loading=false;}
}
function calculate(){
 const client=clients.find(c=>c.id===$('factCliente').value);
 const number=Number($('factNeto').value);
 const valid=Number.isFinite(number)&&number>0&&number<1e13;
 const net=valid?Math.round(number*100)/100:0;
 const rate=Number($('factIVA').value);
 const tax=Math.round(net*rate)/100;
 $('factPreviewType').textContent='FACTURA '+$('factTipo').value;
 $('factPreviewClient').textContent=client?.nombre||'Sin seleccionar';
 $('factPreviewConcept').textContent=$('factConcepto').value.trim()||'—';
 $('factPreviewDate').textContent=$('factFecha').value||'—';
 $('factPreviewNeto').textContent=pesos(net);
 $('factPreviewIVATitle').textContent='IVA ('+String(rate).replace('.',',')+' %)';
 $('factPreviewIVA').textContent=pesos(tax);
 $('factPreviewTotal').textContent=pesos(Math.round((net+tax)*100)/100);
 $('factClienteInfo').innerHTML=client?'<strong>'+esc(client.nombre)+'</strong><span>CUIT: '+esc(client.cuit||'Pendiente')+' · Domicilio: '+esc(client.direccion||'Pendiente')+'</span><span>Correo: '+esc(client.email||'No registrado')+'</span>':'Seleccioná un cliente.';
 $('factNeto').setCustomValidity(valid?'':'Ingresá un importe mayor que cero.');
}
window.addEventListener('arcuva-page-facturacion',()=>{if(!base.getProfile())return;if(!initialized)init();void loadClients();});
})();