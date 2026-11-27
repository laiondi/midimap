import '../profile-media.js?v=2.6.0';
import {categories,towns} from './labels.mjs?v=2.6.0';
import {types,escapeHtml as html,contacts,validConfig,messageOf,swipeDirection,RequestGuard} from './core.mjs?v=2.6.0';

const $=id=>document.getElementById(id),guard=new RequestGuard();
const state={session:null,context:null,ready:false,busy:false,view:'discover',rows:[],connections:[],feedLoading:false,connectionsLoading:false,filters:{categoria:'',localidad:'',tipo:''},email:'',reported:null};
const photoUrls=new Map(),mediaUrls=new Map();let client=null,drag=null;
const label=(list,key)=>list[key]||key||'';
const online=()=>navigator.onLine!==false;
function message(text='',error=true){$('message').textContent=text;$('message').hidden=!text;$('message').classList.toggle('error',error);$('message').setAttribute('role',error?'alert':'status');}
function empty(title,text,actions=''){return `<div class="empty"><h2>${html(title)}</h2><p class="muted">${html(text)}</p>${actions}</div>`;}
function profile(p,{swipe=false,withContacts=false,own=false}={}){
  const initials=p.nombre?.trim().split(/\s+/).slice(0,2).map(s=>s[0]).join('')||'MiDi';
  return `<article class="profile-card${swipe?' swipe':''}"${swipe?' id="swipe-card"':''}><div class="photo" data-photo="${html(p.foto_ruta||'')}"><span class="initials" aria-hidden="true">${html(initials)}</span></div><div class="profile-copy"><span class="type">${html(types[p.tipo_perfil]||'Perfil creativo')}</span><h2>${html(p.nombre)}</h2><p class="location">${html(label(categories,p.categoria))} · ${html(label(towns,p.localidad))}</p><p class="services">${html(p.servicios)}</p><p class="description">${html(p.descripcion)}</p>${withContacts||own?`<div class="profile-media" data-profile-media="${html(p.id)}" aria-live="polite"></div>`:""}${withContacts?`<div class="contact-links">${contacts(p).map(([text,url])=>`<a class="button secondary" href="${html(url)}"${url.startsWith('https:')?' target="_blank" rel="noopener noreferrer"':''}>${html(text)}</a>`).join('')}</div>`:''}${!own&&!swipe?`<button class="button text" type="button" data-report="${html(p.id)}">Reportar o bloquear</button>`:''}</div></article>`;
}
function setButtons(){for(const b of document.querySelectorAll('#workspace button,#login button,#gate button,#report-dialog button')){if(b.matches('.logout,.close,[data-close]'))continue;b.disabled=state.busy||!online();}for(const b of document.querySelectorAll('#tabs button'))b.disabled=state.busy;}
function paint(){
  $('loading').hidden=state.ready;
  const configured=!!client;
  $('setup').hidden=!state.ready||configured;
  $('login').hidden=!state.ready||!configured||!!state.session;
  $('gate').hidden=!state.ready||!state.session||!!state.context?.ficha;
  const usable=state.ready&&!!state.context?.ficha;
  $('workspace').hidden=!usable;$('tabs').hidden=!usable;
  $('offline').hidden=online();
  if(!usable){$('cards').replaceChildren();$('connections').replaceChildren();$('my-profile').replaceChildren();$('session-email').textContent='';for(const id of ['report-dialog','match-dialog'])if($(id).open)$(id).close();setButtons();return;}
  if(!state.context.matching_activo||!online()){$('cards').replaceChildren();$('connections').replaceChildren();}
  for(const v of ['discover','connections','profile'])$(v+'-view').hidden=state.view!==v;
  for(const b of document.querySelectorAll('[data-view]')){if(b.dataset.view===state.view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
  $('view-title').textContent={discover:'Descubrí tu red.',connections:'Conexiones',profile:'Mi perfil'}[state.view];
  $('view-eyebrow').textContent={discover:'Tu comunidad creativa',connections:'Interés mutuo',profile:'Tu ficha del mapa'}[state.view];
  $('participation').hidden=!!state.context.matching_activo;$('discovery').hidden=!state.context.matching_activo;
  $('filter-count').textContent=Object.values(state.filters).filter(Boolean).length?`(${Object.values(state.filters).filter(Boolean).length})`:'';
  if(state.view==='discover'&&state.context.matching_activo){
    if(!online())$('cards').innerHTML=empty('Volvemos cuando haya conexión.','Necesitás internet para explorar y guardar tus decisiones.');
    else if(state.feedLoading)$('cards').innerHTML='<div class="empty"><div class="loader"></div><p>Cargando perfiles…</p></div>';
    else if(state.rows[0])$('cards').innerHTML=profile(state.rows[0],{swipe:true})+`<div class="swipe-actions"><button class="button secondary" id="pass" type="button">Pasar</button><button class="button primary" id="interest" type="button">Me interesa</button></div><p class="hint">Deslizá a la izquierda para pasar o a la derecha para conectar.</p><button class="button text report-button" type="button" data-report="${html(state.rows[0].id)}">Reportar o bloquear este perfil</button>`;
    else $('cards').innerHTML=empty('Estás al día.','No hay otros perfiles activos para estos filtros. Cada persona tiene que activar su participación en Conecta.','<button class="button primary" data-action="reload" type="button">Actualizar perfiles</button><button class="button secondary" data-action="reset" type="button">Volver a ver perfiles que pasé</button>');
  }
  if(state.view==='connections'){
    if(!state.context.matching_activo)$('connections').innerHTML=empty('Tu participación está pausada.','Podés volver a activarla desde Mi perfil.');
    else if(!online())$('connections').innerHTML=empty('Necesitás conexión.','Volvé a conectarte para consultar tus conexiones.');
    else if(state.connectionsLoading)$('connections').innerHTML='<div class="empty"><div class="loader"></div><p>Cargando conexiones…</p></div>';
    else $('connections').innerHTML=state.connections.length?state.connections.map(c=>profile(c.ficha,{withContacts:true})).join(''):empty('La próxima conexión está por llegar.','Marcá los perfiles que te interesan. Cuando el interés sea mutuo, van a aparecer acá.','<button class="button primary" type="button" data-view="discover">Descubrir perfiles</button>');
  }
  if(state.view==='profile'){$('my-profile').innerHTML=profile(state.context.ficha,{own:true});$('toggle-participation').textContent=state.context.matching_activo?'Pausar participación':'Activar participación';$('session-email').textContent=state.session.user.email||'';}
  setButtons();void paintPhotos();void paintMedia();
}
async function rpc(name,args){if(!client)throw Error('Conecta no está disponible en este momento.');if(!online())throw Error('Necesitás conexión para completar esta acción.');const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;}
async function paintPhotos(){
  const valid=guard.next('photos');
  const targets=[...document.querySelectorAll('[data-photo]')].filter(el=>el.dataset.photo);
  const paths=[...new Set(targets.map(el=>el.dataset.photo))];
  const missing=paths.filter(p=>!photoUrls.has(p));
  if(missing.length&&online()){try{const r=await client.storage.from('fotos-fichas').createSignedUrls(missing,1200);if(!valid())return;for(const row of r.data||[])if(row.signedUrl)photoUrls.set(row.path,row.signedUrl);}catch{/* La ficha sigue siendo legible si la foto no carga. */}}
  if(!valid())return;
  for(const el of targets){if(!el.isConnected||el.querySelector('img'))continue;const url=photoUrls.get(el.dataset.photo);if(!url)continue;const img=document.createElement('img');img.src=url;img.alt='';img.loading='lazy';img.decoding='async';img.draggable=false;img.addEventListener('error',()=>img.remove(),{once:true});el.append(img);}
}
async function paintMedia(){
  const valid=guard.next('media');
  const rows=[state.context?.ficha,...state.connections.map(c=>c.ficha)].filter(Boolean);
  const targets=[...document.querySelectorAll('[data-profile-media]')];
  await Promise.all(targets.map(async el=>{
    const p=rows.find(p=>p.id===el.dataset.profileMedia);if(!p)return;
    const paths=Array.isArray(p.galeria_rutas)?p.galeria_rutas.slice(0,4):[];
    const cv=p.tipo_perfil==='profesional'?p.cv_ruta:'';
    if(!paths.length&&!cv)return;
    const key=JSON.stringify([p.id,paths,cv]);
    try{
      let cached=mediaUrls.get(key);
      if(!cached||Date.now()-cached.at>15*60*1000){
        if(!online())return;
        const [pictures,pdf]=await Promise.all([
          paths.length?client.storage.from('fotos-fichas').createSignedUrls(paths,1200):{data:[]},
          cv?client.storage.from('cv-fichas').createSignedUrl(cv,1200,{download:'curriculum.pdf'}):{data:null},
        ]);
        if(!valid())return;
        if(pictures.error||pdf.error)throw Error('Archivos no disponibles');
        const byPath=new Map((pictures.data||[]).map(r=>[r.path,r.signedUrl]));
        cached={at:Date.now(),gallery:paths.map(p=>byPath.get(p)).filter(Boolean),cv:pdf.data?.signedUrl||''};
        mediaUrls.set(key,cached);
      }
      if(!valid()||!el.isConnected)return;
      el.innerHTML=MidiProfileMedia.galleryMarkup(cached.gallery,p.nombre)+MidiProfileMedia.cvMarkup(cached.cv,p.tipo_perfil==='profesional');
    }catch{if(valid()&&el.isConnected)el.textContent='No pudimos cargar los archivos. Volvé a abrir esta sección para reintentar.';}
  }));
}
function adoptSession(session){
  const changed=(state.session?.user.id||null)!==(session?.user.id||null);guard.setUser(session?.user.id||null);state.session=session;
  if(changed){if(session)state.ready=false;state.context=null;state.rows=[];state.connections=[];state.busy=false;state.view='discover';state.reported=null;$('session-email').textContent='';$('code-destination').textContent='';$('match-description').textContent='';$('report-name').textContent='';$('reason').value='';$('code').value='';photoUrls.clear();mediaUrls.clear();state.filters={categoria:'',localidad:'',tipo:''};$('filters').reset();for(const id of ['report-dialog','match-dialog'])if($(id).open)$(id).close();}
  if(!session){state.ready=true;state.context=null;state.rows=[];state.connections=[];}
  paint();
}
async function refresh(){
  if(!client||!online()||drag)return;
  let valid=guard.next('context');
  try{
    const r=await client.auth.getSession();if(!valid())return;if(r.error)throw r.error;
    adoptSession(r.data.session);valid=guard.next('context');
    const context=state.session?await rpc('contexto_comunidad'):null;if(!valid())return;
    state.context=context;state.ready=true;
    if(!context?.ficha||!context.matching_activo){state.rows=[];state.connections=[];}
    paint();if(context?.ficha&&context.matching_activo)await loadView();
  }catch(e){if(valid()){state.ready=true;state.context=null;state.rows=[];state.connections=[];paint();message(messageOf(e));}}
}
async function loadFeed(){
  const valid=guard.next('feed');state.rows=[];state.feedLoading=true;paint();
  try{const rows=await rpc('feed_matching',{p_categoria:state.filters.categoria||null,p_localidad:state.filters.localidad||null,p_tipo:state.filters.tipo||null});if(valid())state.rows=rows||[];}
  catch(e){if(valid())message(messageOf(e));}
  finally{if(valid()){state.feedLoading=false;paint();}}
}
async function loadConnections(){
  const valid=guard.next('connections');state.connections=[];state.connectionsLoading=true;paint();
  try{const rows=await rpc('mis_matches');if(valid())state.connections=rows||[];}
  catch(e){if(valid())message(messageOf(e));}
  finally{if(valid()){state.connectionsLoading=false;paint();}}
}
async function loadView(){if(!state.context?.matching_activo||!online())return;if(state.view==='discover')await loadFeed();else if(state.view==='connections')await loadConnections();}
function go(view){if(!['discover','connections','profile'].includes(view)||state.busy)return;state.view=view;message();paint();$('content').focus();void loadView();}
async function run(action,{report=false}={}){
  if(state.busy)return;const valid=guard.next('action');state.busy=true;message();if(report)$('report-error').hidden=true;setButtons();
  try{await action(valid);}catch(e){if(valid()){const text=messageOf(e);if(report){$('report-error').textContent=text;$('report-error').hidden=false;}else message(text);}}
  finally{if(valid()){state.busy=false;paint();}}
}
async function swipe(interested){
  const p=state.rows[0];if(!p||!state.context?.matching_activo)return;
  await run(async valid=>{const result=await rpc('deslizar_ficha',{p_destino:p.id,p_interes:interested});if(!valid())return;state.rows=state.rows.filter(r=>r.id!==p.id);if(result?.match){$('match-description').textContent=`${p.nombre} también quiere conectar con vos. Ya pueden ponerse en contacto.`;$('match-dialog').showModal();}});
}
function openReport(id){if(state.busy)return;const p=state.rows.find(p=>p.id===id)||state.connections.find(c=>c.ficha.id===id)?.ficha;if(!p)return;state.reported=p;$('report-name').textContent=p.nombre;$('report-form').reset();$('report-error').hidden=true;$('report-dialog').showModal();}
async function report(blockOnly){const p=state.reported;if(!p)return;if(blockOnly&&!confirm(`¿Bloquear a ${p.nombre}? Dejará de aparecer en tus búsquedas y conexiones.`))return;await run(async valid=>{if(!blockOnly)await rpc('reportar_ficha',{p_destino:p.id,p_motivo:$('reason').value.trim()});if(!valid())return;await rpc('bloquear_ficha',{p_destino:p.id});if(!valid())return;state.rows=state.rows.filter(r=>r.id!==p.id);state.connections=state.connections.filter(r=>r.ficha.id!==p.id);$('report-dialog').close();state.reported=null;message(blockOnly?'Perfil bloqueado.':'Reporte enviado a MiDi. El perfil también quedó bloqueado para vos.',false);},{report:true});}
async function toggleParticipation(){const next=!state.context?.matching_activo;if(!next&&!confirm('¿Pausar tu participación en Conecta? Tu ficha seguirá publicada en el mapa.'))return;await run(async valid=>{const c=await rpc('configurar_matching',{p_activa:next});if(!valid())return;guard.next('feed');guard.next('connections');state.context=c;state.rows=[];state.connections=[];paint();if(next)await loadView();});}
function resetDrag(){if(!drag)return;const el=drag.element;el.classList.remove('is-moving');el.style.transform='';drag=null;}
document.addEventListener('pointerdown',event=>{const element=event.target.closest('#swipe-card');if(!element||drag||event.isPrimary===false||state.busy||event.button!==0||event.target.closest('a,button,select,input,textarea'))return;drag={element,id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,dy:0,locked:false};});
document.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;drag.dx=event.clientX-drag.x;drag.dy=event.clientY-drag.y;if(!drag.locked&&Math.abs(drag.dx)>14&&Math.abs(drag.dx)>Math.abs(drag.dy)*1.3){drag.locked=true;drag.element.setPointerCapture(event.pointerId);drag.element.classList.add('is-moving');}if(drag.locked)drag.element.style.transform=`translateX(${drag.dx}px) rotate(${Math.max(-10,Math.min(10,drag.dx*.025))}deg)`;});
document.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;const d=drag,choice=d.locked?swipeDirection(d.dx,d.dy,d.element.clientWidth):0;resetDrag();if(choice)void swipe(choice>0);});
document.addEventListener('pointercancel',resetDrag);
document.addEventListener('click',event=>{const close=event.target.closest('[data-close]');if(close){$(close.dataset.close).close();return;}const b=event.target.closest('button');if(!b)return;if(b.dataset.view)go(b.dataset.view);if(b.dataset.report)openReport(b.dataset.report);if(b.id==='interest')void swipe(true);if(b.id==='pass')void swipe(false);if(b.dataset.action==='reload')void refresh();if(b.dataset.action==='reset')void run(async valid=>{await rpc('reiniciar_descartados');if(valid())await loadFeed();});});
$('email-form').addEventListener('submit',event=>{event.preventDefault();state.email=$('email').value.trim();void run(async valid=>{const r=await client.auth.signInWithOtp({email:state.email,options:{shouldCreateUser:false}});if(r.error)throw r.error;if(!valid())return;$('email-form').hidden=true;$('code-form').hidden=false;$('code-destination').textContent=`Enviamos un código a ${state.email}. Revisá también el correo no deseado.`;$('code').focus();});});
$('code-form').addEventListener('submit',event=>{event.preventDefault();void run(async valid=>{const r=await client.auth.verifyOtp({email:state.email,token:$('code').value.trim(),type:'email'});if(r.error)throw r.error;if(!valid())return;$('code').value='';await refresh();});});
$('change-email').addEventListener('click',()=>{$('code-form').hidden=true;$('email-form').hidden=false;$('code').value='';message();$('email').focus();});
for(const b of document.querySelectorAll('.logout'))b.addEventListener('click',()=>{void(async()=>{guard.invalidate();state.rows=[];state.connections=[];state.context=null;photoUrls.clear();mediaUrls.clear();paint();try{const r=await client.auth.signOut({scope:'local'});if(r.error)throw r.error;adoptSession(null);$('code-form').hidden=true;$('email-form').hidden=false;$('email').value='';$('code').value='';message();}catch(e){message(messageOf(e));await refresh();}})();});
$('filters').addEventListener('submit',event=>{event.preventDefault();state.filters={categoria:$('filter-category').value,localidad:$('filter-town').value,tipo:$('filter-type').value};$('filters').querySelector('details').open=false;message();void loadFeed();});
$('clear-filters').addEventListener('click',()=>{$('filters').reset();state.filters={categoria:'',localidad:'',tipo:''};void loadFeed();});
for(const id of ['activate','toggle-participation'])$(id).addEventListener('click',()=>{void toggleParticipation();});
for(const id of ['refresh','gate-refresh'])$(id).addEventListener('click',()=>{message();void refresh();});
$('report-form').addEventListener('submit',event=>{event.preventDefault();void report(false);});$('block-only').addEventListener('click',()=>{void report(true);});
$('show-connections').addEventListener('click',()=>{$('match-dialog').close();go('connections');});
for(const [id,values]of[['filter-category',categories],['filter-town',towns]])for(const [value,text]of Object.entries(values)){const option=document.createElement('option');option.value=value;option.textContent=text;$(id).append(option);}
window.addEventListener('offline',()=>{guard.invalidate();state.busy=false;state.rows=[];state.connections=[];state.feedLoading=false;state.connectionsLoading=false;resetDrag();paint();});
window.addEventListener('online',()=>{if(!client){location.reload();return;}message();void refresh();});
window.addEventListener('focus',()=>{if(!state.busy&&online())void refresh();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state.busy&&online())void refresh();});
setInterval(()=>{if(!document.hidden&&!state.busy&&online()&&state.session)void refresh();},60000);
setInterval(()=>{photoUrls.clear();mediaUrls.clear();if(!document.hidden&&online()&&state.session)void paintPhotos();},900000);
function init(){
  const config=typeof midiConfig==='undefined'?null:midiConfig;
  if(!validConfig(config)||!globalThis.supabase?.createClient){state.ready=true;paint();return;}
  client=globalThis.supabase.createClient(config.supabaseUrl.trim(),config.supabasePublishableKey.trim(),{auth:{storageKey:'midi.auth.v2',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  client.auth.onAuthStateChange((_event,session)=>{adoptSession(session);setTimeout(()=>{void refresh();},0);});
  if(online())void refresh();else{state.ready=true;paint();}
}
if(document.readyState==='complete')init();else document.addEventListener('DOMContentLoaded',init,{once:true});
