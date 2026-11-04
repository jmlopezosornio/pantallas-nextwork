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
  function applyBrand(logo){$('loginLogo').src=logo;$('sidebarLogo').src=logo;}
  applyBrand(LOGO);
  function error(message){$('loginError').textContent=message;$('loginError').classList.remove('hidden');}
  function showLogin(){profile=null;$('loginView').classList.remove('hidden');$('appView').classList.add('hidden');$('loginBtn').disabled=false;$('loginBtn').textContent='Ingresar';}
  function showApp(){
    $('loginError').classList.add('hidden');$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');
    $('userName').textContent=profile.nombre||profile.email||'Usuario';
    showPage('resumen');
  }
  function showPage(page){
    const titles={resumen:'Resumen',pantallas:'Pantallas',campanias:'Campañas',clientes:'Clientes',reportes:'Reportes'};
    if(!profile||!titles[page])return;
    Object.keys(titles).forEach(key=>$('page-'+key).classList.toggle('hidden',key!==page));
    document.querySelectorAll('.nav[data-page]').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
    $('pageTitle').textContent=titles[page];
  }
  async function verifyUser(authUser){
    const {data,error:err}=await db.from('usuarios').select('id,nombre,email,activo,empresa_id,es_superadmin').eq('id',authUser.id).single();
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
    if(err){for(const id of ['summary','screenTable','campaignTable','clientTable','reportTable']) $(id).innerHTML=empty('No se pudieron leer las pantallas: '+err.message);return;}
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
            .select('id,campania,cliente,fecha_desde,fecha_hasta,estado,porcentaje')
            .in('id',campaignIds).order('fecha_desde',{ascending:false});
          if(campErr)console.warn('Campañas:',campErr.message);
          else{
            const allowedIds=new Set(campaignIds);
            campaigns=(rows||[]).filter(c=>allowedIds.has(c.id)).map(c=>({...c,pantallas:scope.filter(l=>l.campania_id===c.id).map(l=>allowedScreens.find(p=>p.id===l.pantalla_id)?.nombre).filter(Boolean)}));
          }
        }
      }
    }
    if(current!==epoch||!profile)return;
    const clients=[...new Set(campaigns.map(c=>c.cliente).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    model={screens:allowedScreens,campaigns,clients};render();
  }
  function render(){
    $('numScreens').textContent=model.screens.length;
    $('numCampaigns').textContent=model.campaigns.length;
    $('numClients').textContent=model.clients.length;
    $('summary').innerHTML=model.screens.length
      ?'<p>Tenés <strong>'+model.screens.length+'</strong> pantalla(s) activa(s) asignada(s) a Arcuva.</p>'
      :'<div class="empty"><strong>El acceso a Arcuva está preparado.</strong><p>Por ahora no tiene pantallas propias en Supabase. SMA 01 sigue bajo NextWork hasta una migración controlada. Recursos Hídricos no fue modificado.</p></div>';
    $('screenTable').innerHTML=model.screens.length
      ?renderTable(['Pantalla','Ubicación','Resolución','Estado'],model.screens.map(p=>'<tr><td><strong>'+escapeHtml(p.nombre)+'</strong></td><td>'+escapeHtml(p.ubicacion||'—')+'</td><td>'+escapeHtml(p.ancho)+' × '+escapeHtml(p.alto)+'</td><td><span class="ok">Activa</span></td></tr>'))
      :empty('Todavía no hay pantallas registradas a nombre de Arcuva.');
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