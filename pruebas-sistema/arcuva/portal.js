(()=>{
  'use strict';
  const COMPANY_ID='b59ddc55-40f0-48d0-842a-2bee9ea26a41';
  const LOGO='https://qkstdmskuiclbcrncfun.supabase.co/storage/v1/object/public/company-branding/b59ddc55-40f0-48d0-842a-2bee9ea26a41/logo-1793724059638.jpg';
  const db=supabase.createClient('https://qkstdmskuiclbcrncfun.supabase.co','sb_publishable_8aaldEBEij2Gqz1tdwet8g_nENYtVym',{
    auth:{storageKey:'nextwork-pruebas-portal-arcuva-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
  });
  const $=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const empty=message=>'<div class="empty">'+escapeHtml(message)+'</div>';
  const dates=value=>{if(!value)return '—';const x=String(value).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(x)?x.slice(8)+'/'+x.slice(5,7)+'/'+x.slice(0,4):escapeHtml(x);};
  let profile=null,epoch=0,model={screens:[],campaigns:[],clients:[]};
  let taurusSyncBusy=false,lastTaurusSyncAt=0;
  function applyBrand(logo){$('loginLogo').src=logo;$('sidebarLogo').src=logo;}
  applyBrand(LOGO);
  function error(message){$('loginError').textContent=message;$('loginError').classList.remove('hidden');}
  function showLogin(){profile=null;if(window.ArcuvaAdminReset)window.ArcuvaAdminReset();$('loginView').classList.remove('hidden');$('appView').classList.add('hidden');$('loginBtn').disabled=false;$('loginBtn').textContent='Ingresar';}
  function showApp(){
    $('loginError').classList.add('hidden');$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');
    $('userName').textContent=profile.nombre||profile.email||'Usuario';
    const superadmin=profile.es_superadmin===true;
    $('superadminUsersNav')?.classList.toggle('hidden',!superadmin);
    $('superadminScreenTools')?.classList.toggle('hidden',!superadmin);
    showPage('resumen');
  }
  function showPage(page){
    const titles={resumen:'Dashboard',pantallas:'Pantallas',campanias:'Campañas',clientes:'Clientes',reportes:'Reportes',usuarios:'Usuarios'};
    if(!profile||!titles[page]||(page==='usuarios'&&profile.es_superadmin!==true))return;
    Object.keys(titles).forEach(key=>$('page-'+key).classList.toggle('hidden',key!==page));
    document.querySelectorAll('.nav[data-page]').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
    $('pageTitle').textContent=titles[page];
    if(page==='resumen')window.dispatchEvent(new Event('arcuva-page-resumen'));
    if(page==='campanias')window.dispatchEvent(new Event('arcuva-page-campanias'));
    if(page==='reportes')window.dispatchEvent(new Event('arcuva-page-reportes'));
    if(page==='usuarios')window.dispatchEvent(new Event('arcuva-page-usuarios'));
  }
  async function verifyUser(authUser){
    const {data,error:err}=await db.from('usuarios').select('id,nombre,email,rol,activo,empresa_id,es_superadmin').eq('id',authUser.id).single();
    if(err||!data||!data.activo)throw Error('Usuario sin perfil activo.');
    if(data.empresa_id!==COMPANY_ID&&data.es_superadmin!==true)throw Error('Este usuario pertenece a otra empresa. Ingresá desde el portal correspondiente.');
    return data;
  }
  async function enter(authUser){
    const user=await verifyUser(authUser);
    const {data:company,error:err}=await db.from('empresas').select('id,slug,nombre_fantasia,logo_url,color_primario,color_secundario,activo').eq('id',COMPANY_ID).single();
    if(err||!company||company.slug!=='arcuva'||company.activo!==true)throw Error('El portal de Arcuva no está disponible.');
    if(company.logo_url&&/^https:\/\//i.test(company.logo_url))applyBrand(company.logo_url);
    for(const [field,cssName] of [['color_primario','--navy'],['color_secundario','--lime']]){
      if(/^#[0-9a-f]{6}$/i.test(company[field]||''))document.documentElement.style.setProperty(cssName,company[field]);
    }
    profile=user;showApp();await loadData();
  }
  async function logout(){++epoch;await db.auth.signOut();showLogin();}
  function renderTable(columns,rows){
    return '<div class="scroll"><table><thead><tr>'+columns.map(c=>'<th>'+escapeHtml(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
  }
  async function loadData(){
    if(!profile)return;
    const current=++epoch;
    const {data:screens,error:err}=await db.from('pantallas')
      .select('id,nombre,ubicacion,ancho,alto,empresa_id,activo')
      .eq('empresa_id',COMPANY_ID).eq('activo',true).order('nombre');
    if(current!==epoch||!profile)return;
    if(err){for(const id of ['dashScreenList','screenTable','campaignTable','clientTable','reportTable']) { const el=$(id); if(el) el.innerHTML=empty('No se pudieron leer las pantallas: '+err.message); } return;}
    const allowedScreens=(screens||[]).filter(p=>p.empresa_id===COMPANY_ID&&p.activo===true);
    let campaigns=[];
    if(allowedScreens.length){
      const ids=allowedScreens.map(p=>p.id);
      const {data:links,error:linkErr}=await db.from('campanias_pantallas').select('campania_id,pantalla_id').in('pantalla_id',ids);
      if(linkErr)console.warn('Vínculos de campañas:',linkErr.message);
      else{
        const scope=(links||[]).filter(l=>ids.includes(l.pantalla_id));
        const campaignIds=[...new Set(scope.map(l=>l.campania_id))];
        if(campaignIds.length){
          const {data:rows,error:campErr}=await db.from('vista_campanias')
            .select('id,campania,cliente,cliente_id,tipo_contenido,duracion_seg,archivo_url,fecha_desde,fecha_hasta,estado,porcentaje,pausada')
            .in('id',campaignIds).order('fecha_desde',{ascending:false});
          if(campErr)console.warn('Campañas:',campErr.message);
          else{
            // La vista_campanias no incluye eliminada. Recuperar este dato
            // desde campanias bajo RLS, sin cambiar la vista del sistema base.
            const {data:flags,error:flagsErr}=await db.from('campanias')
              .select('id,eliminada').in('id',campaignIds);
            if(flagsErr){
              console.error('No se pudo verificar el estado de eliminación de campañas:',flagsErr);
              // Evita divulgar campañas sin poder comprobar su estado.
              for(const id of ['campaignTable','rptBody']) { const el=$(id); if(el) el.textContent='No se pudo verificar el estado de las campañas. Volvé a intentar.'; }
              return;
            }
            if(current!==epoch||!profile)return;
            const deletedMap=new Map((flags||[]).map(x=>[x.id,x.eliminada===true]));
            const allowedIds=new Set(campaignIds);
            campaigns=(rows||[])
              .filter(c=>allowedIds.has(c.id)&&deletedMap.has(c.id))
              .map(c=>({...c,eliminada:deletedMap.get(c.id),pantallaIds:scope.filter(l=>l.campania_id===c.id).map(l=>l.pantalla_id).filter(id=>ids.includes(id)),pantallas:scope.filter(l=>l.campania_id===c.id).map(l=>allowedScreens.find(p=>p.id===l.pantalla_id)?.nombre).filter(Boolean)}));
          }
        }
      }
    }
    if(current!==epoch||!profile)return;
    const clients=[...new Set(campaigns.map(c=>c.cliente).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    // Estado de conexión: no confundir pantalla habilitada con reproductor conectado.
    // La columna es conservadora: sin reproductor vinculado = sin monitoreo.
    let playerRows=[],playerQueryFailed=false;
    if(allowedScreens.length){
      const {data:rows,error:playerError}=await db.from('players')
        .select('pantalla_id,tipo,estado,ultima_conexion,actualizado_en,vnnox_online_status,vnnox_player_id')
        .in('pantalla_id',allowedScreens.map(p=>p.id));
      if(current!==epoch||!profile)return;
      if(playerError){
        playerQueryFailed=true;
        console.warn('Estado de conexión de reproductores:',playerError.message);
      }else playerRows=rows||[];
    }
    model={screens:allowedScreens,campaigns,clients,playerRows,playerQueryFailed};
    render();window.dispatchEvent(new Event('arcuva-data-loaded'));

    if(window.ArcuvaAdminRefresh)await window.ArcuvaAdminRefresh();
    // Se consulta el estado real en VNNOX sin alterar la publicación del Taurus.
    void refreshTaurusStatus();
  }
  async function refreshTaurusStatus(){
    if(!profile||taurusSyncBusy||Date.now()-lastTaurusSyncAt<110000)return;
    const relevant=(model.playerRows||[]).some(x=>x.tipo==='novastar_taurus'&&x.vnnox_player_id);
    if(!relevant)return;
    taurusSyncBusy=true;
    lastTaurusSyncAt=Date.now();
    const sessionEpoch=epoch;
    try{
      const {data,error}=await db.functions.invoke('vnnox-connectivity',{body:{}});
      if(error||!data?.ok)throw Error(data?.error||error?.message||'Consulta VNNOX fallida.');
      if(!profile||sessionEpoch!==epoch)return;
      const updates=new Map((data.players||[]).filter(x=>x.verified).map(x=>[x.pantalla_id,x]));
      if(!updates.size)return;
      model.playerRows=(model.playerRows||[]).map(x=>{
        if(x.tipo!=='novastar_taurus')return x;
        const received=updates.get(x.pantalla_id);
        if(!received)return x;
        return {...x,estado:received.estado,vnnox_online_status:received.estado==='online'?1:0,
          ultima_conexion:received.estado==='online'?received.checkedAt:x.ultima_conexion,
          actualizado_en:received.checkedAt};
      });
      renderScreens();
      window.dispatchEvent(new Event('arcuva-data-loaded'));
    }catch(err){
      // Ante fallas de consulta no se inventa un estado offline.
      console.warn('No se pudo actualizar el estado de los Taurus con VNNOX:',err.message||err);
    }finally{
      taurusSyncBusy=false;
    }
  }
  function screenConnection(p){
    if(model.playerQueryFailed)return {label:'Sin información',cls:'nw-connection-unknown',detail:'No se pudo consultar el estado del reproductor.'};
    const linked=(model.playerRows||[]).filter(x=>x.pantalla_id===p.id);
    if(!linked.length)return {label:'Sin monitoreo',cls:'nw-connection-unknown',detail:'Esta pantalla todavía no tiene un reproductor vinculado.'};
    const now=Date.now();
    const taurus=linked.find(x=>x.tipo==='novastar_taurus');
    if(taurus){
      if(!taurus.vnnox_player_id)return {label:'Sin configurar',cls:'nw-connection-unknown',detail:'Falta vincular el identificador del Taurus en VNNOX.'};
      const checked=Date.parse(taurus.actualizado_en||'');
      const fresh=Number.isFinite(checked)&&checked<=now&&now-checked<=5*60*1000;
      if(!fresh)return {label:'Sin información',cls:'nw-connection-unknown',detail:'El estado de VNNOX no tiene una verificación reciente. Se intentará actualizar automáticamente.'};
      if(taurus.vnnox_online_status===1)return {label:'En línea',cls:'nw-connection-online',detail:'VNNOX confirmó el Taurus en línea. Verificado: '+new Date(checked).toLocaleString('es-AR')};
      if(taurus.vnnox_online_status===0)return {label:'Fuera de línea',cls:'nw-connection-offline',detail:'VNNOX confirmó el Taurus fuera de línea. Verificado: '+new Date(checked).toLocaleString('es-AR')};
      return {label:'Sin información',cls:'nw-connection-unknown',detail:'No se pudo interpretar la respuesta de VNNOX.'};
    }
    const fresh=linked.some(x=>{
      const last=Date.parse(x.ultima_conexion||'');
      return Number.isFinite(last)&&last<=now&&now-last<=10*60*1000&&String(x.estado||'').toLowerCase()==='online';
    });
    if(fresh)return {label:'En línea',cls:'nw-connection-online',detail:'Reproductor con comunicación registrada en los últimos 10 minutos.'};
    const last=linked.map(x=>Date.parse(x.ultima_conexion||'')).filter(Number.isFinite).sort((a,b)=>b-a)[0];
    return {label:'Fuera de línea',cls:'nw-connection-offline',detail:last?'Última comunicación registrada: '+new Date(last).toLocaleString('es-AR')+'.':'No hay comunicaciones registradas del reproductor.'};
  }
  function renderScreens(){
    $('screenTable').innerHTML=model.screens.length
      ?renderTable(['Pantalla','Ubicación','Resolución','Conexión'],model.screens.map(p=>{
        const c=screenConnection(p);
        return '<tr><td><strong>'+escapeHtml(p.nombre)+'</strong></td><td>'+escapeHtml(p.ubicacion||'—')+'</td><td>'+escapeHtml(p.ancho)+' × '+escapeHtml(p.alto)+'</td><td><span class="nw-connection-status '+c.cls+'" title="'+escapeHtml(c.detail)+'">'+escapeHtml(c.label)+'</span></td></tr>';
      }))
      :empty('Todavía no hay pantallas registradas a nombre de Arcuva.');
  }
  function render(){
    renderScreens();
    renderCampaigns();
    $('clientTable').innerHTML=model.clients.length
      ?renderTable(['Cliente','Campañas visibles'],model.clients.map(name=>'<tr><td>'+escapeHtml(name)+'</td><td>'+model.campaigns.filter(c=>c.cliente===name).length+'</td></tr>'))
      :empty('No hay clientes vinculados a campañas visibles de Arcuva.');
    $('reportTable').innerHTML=model.campaigns.length
      ?renderTable(['Cliente','Campaña','Vigencia','Pantallas','% Salidas'],model.campaigns.map(c=>'<tr><td>'+escapeHtml(c.cliente)+'</td><td>'+escapeHtml(c.campania)+'</td><td>'+dates(c.fecha_desde)+' – '+dates(c.fecha_hasta)+'</td><td>'+escapeHtml(c.pantallas.join(', '))+'</td><td>'+escapeHtml(c.porcentaje)+'%</td></tr>'))
      :empty('No hay campañas autorizadas para generar reportes.');
  }
  function renderCampaigns(){
    const search=($('campaignSearch').value||'').toLocaleLowerCase('es').trim();
    const campaigns=model.campaigns.filter(c=>(String(c.campania||'')+' '+String(c.cliente||'')).toLocaleLowerCase('es').includes(search));
    $('campaignTable').innerHTML=campaigns.length
      ?renderTable(['Campaña','Cliente','Vigencia','Pantallas','Participación'],campaigns.map(c=>'<tr><td><strong>'+escapeHtml(c.campania)+'</strong><span class="tiny">'+escapeHtml(c.estado||'')+'</span></td><td>'+escapeHtml(c.cliente)+'</td><td>'+dates(c.fecha_desde)+' – '+dates(c.fecha_hasta)+'</td><td>'+escapeHtml(c.pantallas.join(', '))+'</td><td>'+escapeHtml(c.porcentaje)+'%</td></tr>'))
      :empty(search?'No hay campañas que coincidan con la búsqueda.':'No hay campañas visibles de Arcuva.');
  }
  // Los datos de conexión caducan; refrescar sin volver a abrir la página.
  setInterval(()=>{
    if(profile && !$('page-pantallas')?.classList.contains('hidden'))loadData();
  },60_000);
  // API interna del portal de pruebas. Sin service-role y sin saltear políticas RLS.
  window.ArcuvaPortalBase=Object.freeze({db,getProfile:()=>profile,getModel:()=>model,reload:loadData,escapeHtml,empty,dates});
  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();$('loginError').classList.add('hidden');$('loginBtn').disabled=true;$('loginBtn').textContent='Verificando…';
    try{
      const {data,error:err}=await db.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
      if(err||!data?.user)throw Error(err?.message||'No se pudo iniciar sesión.');
      await enter(data.user);
    }catch(err){await logout();error(err.message||'No se pudo iniciar sesión.');}
    finally{$('loginBtn').disabled=false;$('loginBtn').textContent='Ingresar';}
  });
  $('logoutBtn').addEventListener('click',logout);
  $('refreshBtn').addEventListener('click',loadData);
  $('campaignSearch').addEventListener('input',renderCampaigns);
  $('printBtn').addEventListener('click',()=>{if(model.campaigns.length)window.print();else alert('No hay campañas visibles para imprimir.');});
  document.querySelectorAll('.nav[data-page]').forEach(n=>n.addEventListener('click',()=>showPage(n.dataset.page)));
  (async()=>{try{
    const {data:{user},error:err}=await db.auth.getUser();
    if(err||!user){showLogin();return;}
    await enter(user);
  }catch(err){await logout();error(err.message||'No se pudo recuperar la sesión.');}})();
})();