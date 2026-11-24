"use strict";

let communityContext = null;
let communityEpoch = 0;
let opportunityView = "board";
let opportunityRows = [];
let communityApplications = [];
let opportunityDraft = null;
let opportunitySelected = null;
let opportunitySelectedAdmin = false;
let opportunityLoad = 0;
const opportunityEditor = byId("opportunity-editor");
const opportunityDetail = byId("opportunity-detail");
const opportunityForm = byId("opportunity-form");
const opportunityFields = ["titulo","descripcion","requisitos","modalidad","vinculo","localidad","remuneracion","fecha_cierre"];
const communityLabels = {profesional:"Profesional independiente",estudio:"Estudio",empresa:"Empresa",taller:"Taller",espacio:"Espacio u organización",presencial:"Presencial",remoto:"Remoto",hibrido:"Híbrido",empleo:"Empleo",proyecto:"Proyecto",practica:"Práctica",colaboracion:"Colaboración",enviada:"Enviada",retirada:"Retirada",seleccionada:"Seleccionada",descartada:"Descartada",cerrada:"Cerrada",eliminada:"Eliminada"};
const communityLabel = value => communityLabels[value] || statusNames[value] || value;
const todayForOpportunities = () => new Date().toLocaleDateString("en-CA");
function opportunityDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? new Date(value + "T12:00:00").toLocaleDateString("es-AR") : "Sin fecha";
}
function clearCommunity() {
  communityEpoch++; opportunityLoad++; communityContext=null; opportunityRows=[]; communityApplications=[];
  opportunitySelected=opportunityDraft=null;
  byId("opportunity-list").replaceChildren(); byId("admin-opportunity-list").replaceChildren(); byId("opportunity-detail-body").replaceChildren();
  byId("opportunities-nav").hidden=true;
  for(const dialog of [opportunityEditor,opportunityDetail]) if(dialog.open) dialog.close();
}
async function refreshCommunity() {
  const user=sessionUser?.id, epoch=++communityEpoch;
  if(!user || canManage) return;
  try {
    const value=await backend.community();
    if(epoch!==communityEpoch || user!==sessionUser?.id) return;
    communityContext=value;
    if(state.section==="opportunities") {
      byId("community-gate").hidden=Boolean(value.ficha);
      byId("opportunities-content").hidden=!value.ficha;
      if(!value.ficha) {
        opportunityRows=[];communityApplications=[];opportunityLoad++;
        byId("opportunity-list").replaceChildren();byId("opportunity-detail-body").replaceChildren();
        for(const d of [opportunityDetail,opportunityEditor])if(d.open)d.close();
      }
    }
    byId("opportunities-nav").hidden=!value.ficha;
    byId("new-opportunity").hidden=!value.puede_publicar;
    byId("my-opportunities-tab").hidden=!value.puede_publicar;
  } catch {
    if(epoch!==communityEpoch) return;
    communityContext=null; byId("opportunities-nav").hidden=true;
    if(state.section==="opportunities") feedback("opportunity-message","No se pudieron comprobar los permisos. Usá Actualizar para reintentar.",true);
  }
}
async function showOpportunities() {
  if(!sessionUser) return showAccess("opportunities");
  if(canManage) { adminView="oportunidades"; return showReview(); }
  activateSection("opportunities");
  await refreshCommunity();
  byId("community-gate").hidden=Boolean(communityContext?.ficha);
  byId("opportunities-content").hidden=!communityContext?.ficha;
  if(communityContext?.ficha) await loadOpportunities();
  byId("opportunities-panel").focus({preventScroll:true});
}
function opportunityCard(row,admin=false) {
  const org=catalog.find(p=>p.id===row.organizacion) || (communityContext?.ficha?.id===row.organizacion ? {name:communityContext.ficha.nombre}:null);
  const unread=adminNotifications.some(n=>n.tipo==="oportunidad" && n.ficha===row.id && !n.leida);
  const status=(row.estado==="publicada" && row.fecha_cierre<todayForOpportunities()) ? "Vencida" : communityLabel(row.estado);
  return `<article data-opportunity-card="${escapeHtml(row.id)}" class="opportunity-card ${unread?"is-unread":""}"><div class="opportunity-card-top"><span class="community-pill">${escapeHtml(communityLabel(row.vinculo))}</span><span class="field-help opportunity-state" data-base-status="${escapeHtml(status)}">${escapeHtml(status)}${unread?" · Sin leer":""}</span></div><h3>${escapeHtml(row.titulo)}</h3><p class="opportunity-org">${escapeHtml(org?.name || "Organización del mapa")}</p><p>${escapeHtml(row.descripcion.slice(0,180))}${row.descripcion.length>180?"…":""}</p><div class="opportunity-meta"><span>${escapeHtml(communityLabel(row.modalidad))}</span><span>${escapeHtml(towns[row.localidad]?.label || "Sin ubicación presencial")}</span><span>Cierra ${opportunityDate(row.fecha_cierre)}</span></div><button type="button" class="button ${admin?"secondary":"primary"}" data-opportunity-open="${escapeHtml(row.id)}" ${admin?'data-opportunity-admin="true"':""}>${admin?"Revisar oportunidad":"Ver oportunidad"}</button></article>`;
}
async function loadOpportunities() {
  const request=++opportunityLoad,user=sessionUser?.id;
  if(!communityContext?.ficha || !user) return;
  feedback("opportunity-message","Cargando oportunidades…");
  try {
    const [rows,applications]=await Promise.all([backend.opportunities(opportunityView==="board"?"board":"all"),backend.applications(),refreshDirectory()]);
    if(request!==opportunityLoad || user!==sessionUser?.id) return;
    opportunityRows=rows;communityApplications=applications;feedback("opportunity-message");paintOpportunities();
  } catch(e) { if(request===opportunityLoad) feedback("opportunity-message",readableError(e,"No se pudieron cargar las oportunidades. Usá Actualizar."),true); }
}
function paintOpportunities() {
  const list=byId("opportunity-list");
  byId("opportunity-filters").hidden=opportunityView!=="board";
  for(const button of selectAll("[data-opportunity-view]")) button.setAttribute("aria-pressed",button.dataset.opportunityView===opportunityView);
  if(opportunityView==="applications") {
    const own=communityApplications.filter(r=>r.titular===sessionUser?.id);
    list.innerHTML=own.length ? own.map(r=>applicationCard(r,false)).join("") : '<div class="community-empty"><h2>Todavía no te postulaste</h2><p>Explorá las oportunidades y enviá tu ficha a las que te interesen.</p></div>';
    return;
  }
  const query=normalize(byId("opportunity-search").value.trim()),mode=byId("opportunity-modality").value;
  const rows=opportunityRows.filter(r=>opportunityView==="mine" ? r.titular===sessionUser?.id : (!mode || mode===r.modalidad) && normalize(r.titulo+" "+r.descripcion+" "+(catalog.find(p=>p.id===r.organizacion)?.name || "")).includes(query));
  list.innerHTML=rows.length ? rows.map(r=>opportunityCard(r)).join("") : '<div class="community-empty"><h2>No hay oportunidades para mostrar</h2><p>Probá otros filtros o volvé más adelante.</p></div>';
}
function applicationCard(row,employer) {
  const profile=catalog.find(p=>p.id===row.ficha),o=opportunityRows.find(o=>o.id===row.oportunidad);
  const title=employer ? profile?.name || "Perfil que ya no está publicado" : o?.titulo || "Oportunidad no disponible";
  return `<article class="application-card"><h3>${escapeHtml(title)}</h3><p class="community-pill">${escapeHtml(communityLabel(row.estado))}</p><p class="community-long-text">${escapeHtml(row.mensaje || "Sin presentación adicional.")}</p><div class="dialog-actions">${employer && profile ? `<button class="button secondary" type="button" data-profile="${escapeHtml(profile.id)}">Ver ficha del postulante</button>`:""}${employer && row.estado!=="retirada" ? `<button class="button secondary" type="button" data-application-id="${escapeHtml(row.id)}" data-application-status="seleccionada">Seleccionar</button><button class="text-button" type="button" data-application-id="${escapeHtml(row.id)}" data-application-status="descartada">Descartar</button>` : !employer && row.estado!=="retirada" ? `<button class="text-button" type="button" data-application-id="${escapeHtml(row.id)}" data-application-status="retirada">Retirar postulación</button>`:""}</div></article>`;
}
async function showOpportunity(id,admin=false) {
  const row=opportunityRows.find(r=>r.id===id);if(!row) return;
  opportunitySelected=row;opportunitySelectedAdmin=admin;feedback("opportunity-detail-message");
  const org=catalog.find(p=>p.id===row.organizacion) || (communityContext?.ficha?.id===row.organizacion ? {name:communityContext.ficha.nombre}:null),owner=row.titular===sessionUser?.id;
  const application=communityApplications.find(r=>r.oportunidad===row.id && r.titular===sessionUser?.id && r.estado!=="retirada");
  const available=row.estado==="publicada" && row.fecha_cierre>=todayForOpportunities();
  const actions=admin ? `${row.estado==="en_revision"?'<label for="op-review-note">Indicación para la organización si pedís cambios</label><textarea id="op-review-note" maxlength="500" rows="3"></textarea><div class="dialog-actions"><button type="button" class="button primary" data-opportunity-action="aprobar">Aprobar y publicar</button><button type="button" class="button secondary" data-opportunity-action="correcciones">Pedir correcciones</button></div>':""}<div class="dialog-actions"><button type="button" class="button secondary" data-opportunity-action="cerrar">Cerrar oportunidad</button><button type="button" class="text-button danger-link" data-opportunity-action="eliminar">Eliminar oportunidad</button></div>` : owner ? `<div class="dialog-actions">${row.estado!=="en_revision"?'<button type="button" class="button primary" id="edit-opportunity">Editar oportunidad</button>':'<button type="button" class="button secondary" data-opportunity-action="retirar">Retirar para editar</button>'}${["borrador","correcciones","cerrada"].includes(row.estado)?'<button type="button" class="button secondary" data-opportunity-action="enviar">Enviar a revisión</button>':""}<button type="button" class="button secondary" data-opportunity-action="cerrar">Cerrar oportunidad</button><button type="button" class="text-button danger-link" data-opportunity-action="eliminar">Eliminar oportunidad</button></div>` : application ? `<p class="inline-feedback">Tu postulación: ${escapeHtml(communityLabel(application.estado))}.</p>` : available ? '<form id="opportunity-apply-form" class="account-form"><h3>Postulate con tu ficha del mapa</h3><label for="op-application-message">Presentación · opcional, hasta 1200 caracteres</label><textarea id="op-application-message" maxlength="1200" rows="4"></textarea><p class="field-help">La organización verá tu ficha pública y esta presentación.</p><button class="button primary" type="submit">Enviar postulación</button></form>' : '<p>Esta oportunidad ya no recibe postulaciones.</p>';
  byId("opportunity-detail-body").innerHTML=`<p class="manifesto-eyebrow">${escapeHtml(communityLabel(row.vinculo))}</p><h2 id="opportunity-detail-title">${escapeHtml(row.titulo)}</h2><p>${escapeHtml(org?.name || "Organización del mapa")}</p><p class="community-pill">${escapeHtml(communityLabel(row.estado))}</p><div class="opportunity-meta"><span>${escapeHtml(communityLabel(row.modalidad))}</span><span>${escapeHtml(towns[row.localidad]?.label || "Remoto")}</span><span>Cierra ${opportunityDate(row.fecha_cierre)}</span></div><h3 class="community-subheading">La oportunidad</h3><p class="community-long-text">${escapeHtml(row.descripcion)}</p>${row.requisitos?`<h3 class="community-subheading">Requisitos</h3><p class="community-long-text">${escapeHtml(row.requisitos)}</p>`:""}${row.remuneracion?`<p><strong>Remuneración / presupuesto:</strong> ${escapeHtml(row.remuneracion)}</p>`:""}${row.nota_revision && (owner || admin)?`<p class="inline-feedback is-error">${escapeHtml(row.nota_revision)}</p>`:""}${actions}${owner?'<h3 class="community-subheading">Postulaciones recibidas</h3><div id="opportunity-applicants"></div>':""}`;
  showPanel(opportunityDetail);
  byId("edit-opportunity")?.addEventListener("click",()=>editOpportunity(row));
  byId("opportunity-apply-form")?.addEventListener("submit",e=>{e.preventDefault();void runAction(opportunityDetail,"opportunity-detail-message",async()=>{await backend.applyOpportunity(row.id,byId("op-application-message").value.trim());await loadOpportunities();await showOpportunity(row.id,false);feedback("opportunity-detail-message","Postulación enviada.");},"No se pudo enviar la postulación.");});
  if(owner) {
    const user=sessionUser.id;
    try { const apps=await backend.applications();if(user!==sessionUser?.id || opportunitySelected?.id!==id)return;communityApplications=apps;const own=apps.filter(a=>a.oportunidad===id);byId("opportunity-applicants").innerHTML=own.length?own.map(a=>applicationCard(a,true)).join(""):"<p>Todavía no hay postulaciones.</p>"; }
    catch { feedback("opportunity-detail-message","No se pudieron cargar las postulaciones. Volvé a abrir la oportunidad.",true); }
  }
  if(admin && row.estado==="en_revision") {
    try {const marked=await backend.markOpportunityRead(row.id,row.version);notificationsEpoch++;notificationsRequest=null;if(marked){for(const n of adminNotifications)if(n.tipo==="oportunidad" && n.ficha===row.id && n.version===row.version)n.leida=true;paintRequestNotifications();}await refreshAdminNotifications(false);}catch{feedback("opportunity-detail-message","No se pudo guardar la lectura de la solicitud.",true);}
  }
}
function editOpportunity(row=null) {
  if(!communityContext?.puede_publicar) return;
  opportunityDraft=row;opportunityForm.reset();
  for(const f of opportunityFields) if(row) opportunityForm.elements.namedItem(f).value=row[f] || "";
  byId("opportunity-editor-title").textContent=row?"Editar oportunidad":"Nueva oportunidad";
  byId("op-deadline").min=todayForOpportunities();
  byId("op-town").required=byId("op-modality").value!=="remoto";
  feedback("opportunity-editor-message");showPanel(opportunityEditor);
}
opportunityForm.addEventListener("submit",e=>{
  e.preventDefault();const send=e.submitter?.value==="send";
  const model=Object.fromEntries(opportunityFields.map(f=>[f,opportunityForm.elements.namedItem(f).value.trim()]));
  void runAction(opportunityEditor,"opportunity-editor-message",async()=>{
    if(!communityContext?.puede_publicar) throw Error("Necesitás una ficha aprobada de organización.");
    opportunityDraft=await backend.saveOpportunity(opportunityDraft?.id || null,opportunityDraft?.version || 0,model);
    if(send) opportunityDraft=await backend.actOpportunity(opportunityDraft,"enviar");
    feedback("opportunity-editor-message",send?"Oportunidad enviada a revisión.":"Borrador guardado.");
    if(send) {opportunityEditor.close();opportunityView="mine";await loadOpportunities();showToast("Oportunidad enviada a revisión.");}
  },"No se pudo guardar la oportunidad.");
});
async function changeOpportunity(action) {
  const row=opportunitySelected;if(!row) return;
  if(action==="eliminar" && !confirm("¿Eliminar esta oportunidad de las listas? Se conservará su historial de postulaciones."))return;
  await runAction(opportunityDetail,"opportunity-detail-message",async()=>{
    await backend.actOpportunity(row,action,byId("op-review-note")?.value.trim() || null);
    notificationsEpoch++;notificationsRequest=null;
    opportunityDetail.close();
    if(opportunitySelectedAdmin) {await refreshAdminNotifications(false);await renderOpportunityAdmin();}
    else await loadOpportunities();
    showToast("Oportunidad actualizada.");
  },"No se pudo actualizar la oportunidad.");
}
async function renderOpportunityAdmin() {
  const user=sessionUser?.id;
  const rows=await backend.opportunities("all");if(user!==sessionUser?.id || !canManage)return;
  opportunityRows=rows;const filter=byId("admin-opportunity-status").value;
  const visible=rows.filter(r=>!filter || r.estado===filter);
  byId("admin-opportunity-list").innerHTML=visible.length?visible.map(r=>opportunityCard(r,true)).join(""):'<div class="community-empty"><h3>No hay oportunidades en este estado</h3></div>';
}
async function loadAppAdmin() {
  const user=sessionUser?.id,[downloads,reports]=await Promise.all([backend.appDownloads(),backend.appReports()]);
  if(user!==sessionUser?.id || !canManage)return;
  byId("download-android").value=downloads.android_url || "";byId("download-ios").value=downloads.ios_url || "";
  byId("app-reports").innerHTML=reports.length?reports.map(r=>`<article class="application-card"><h3>${escapeHtml(catalog.find(p=>p.id===r.ficha)?.name || "Ficha reportada")}</h3><p class="community-long-text">${escapeHtml(r.motivo)}</p><button class="button secondary" type="button" data-report-reviewed="${escapeHtml(r.id)}">Marcar revisado</button></article>`).join(""):"<p>No hay reportes pendientes.</p>";
}
async function refreshAppDownloads() {
  const status=byId("app-download-status"),links=byId("app-download-links");links.replaceChildren();status.textContent="Cargando enlaces de instalación…";
  try {
    const row=await backend.appDownloads();let count=0;
    for(const [field,label] of [["android_url","Descargar para Android"],["ios_url","Instalar en iPhone"]]) {
      const url=safeWebUrl(row[field]);if(!url)continue;
      const link=document.createElement("a");link.href=url;link.target="_blank";link.rel="noopener noreferrer";link.className="button primary";link.textContent=label;links.append(link);count++;
    }
    status.textContent=count?"La instalación se abre en el enlace de distribución de cada plataforma.":"La app todavía no tiene una descarga publicada. MiDi habilitará los enlaces cuando la versión instalable esté disponible.";
  } catch {status.textContent="No se pudieron cargar los enlaces de instalación. Cerrá esta ventana y volvé a intentar.";}
}
byId("app-downloads-form").addEventListener("submit",e=>{e.preventDefault();void runAction(managementPanel,"app-downloads-message",async()=>{
  const a=byId("download-android").value.trim(),i=byId("download-ios").value.trim();
  if((a && !isPublicLink(a)) || (i && !isPublicLink(i)))throw Error("Ingresá enlaces HTTPS válidos.");
  await backend.saveDownloads(a,i);feedback("app-downloads-message","Enlaces de descarga guardados.");
},"No se pudieron guardar los enlaces.");});
byId("download-app-button").addEventListener("click",()=>{showPanel(byId("app-download-dialog"));void refreshAppDownloads();});
byId("new-opportunity").addEventListener("click",()=>editOpportunity());
byId("op-modality").addEventListener("change",()=>{byId("op-town").required=byId("op-modality").value!=="remoto";});
byId("reload-opportunities").addEventListener("click",()=>{void showOpportunities();});
byId("opportunity-search").addEventListener("input",paintOpportunities);byId("opportunity-modality").addEventListener("change",paintOpportunities);
byId("admin-opportunity-status").addEventListener("change",()=>{void runAction(managementPanel,"review-message",renderOpportunityAdmin,"No se pudieron cargar las oportunidades.");});
for(const [id,town] of Object.entries(towns)) {const option=document.createElement("option");option.value=id;option.textContent=town.label;byId("op-town").append(option);}
document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.opportunityView) {opportunityView=b.dataset.opportunityView;void loadOpportunities();}
  if(b.dataset.opportunityOpen)void showOpportunity(b.dataset.opportunityOpen,b.dataset.opportunityAdmin==="true");
  if(b.dataset.opportunityAction)void changeOpportunity(b.dataset.opportunityAction);
  if(b.dataset.applicationId) {
    const row=communityApplications.find(r=>r.id===b.dataset.applicationId);if(!row)return;
    const container=opportunityDetail.open?opportunityDetail:byId("opportunities-panel"),message=opportunityDetail.open?"opportunity-detail-message":"opportunity-message";
    void runAction(container,message,async()=>{await backend.actApplication(row,b.dataset.applicationStatus);if(opportunityDetail.open)await showOpportunity(opportunitySelected.id,opportunitySelectedAdmin);else await loadOpportunities();},"No se pudo actualizar la postulación.");
  }
  if(b.dataset.reportReviewed)void runAction(managementPanel,"review-message",async()=>{await backend.reviewReport(b.dataset.reportReviewed);await loadAppAdmin();},"No se pudo revisar el reporte.");
});

window.addEventListener("focus",()=>{if(sessionUser && !canManage)void refreshCommunity();});
