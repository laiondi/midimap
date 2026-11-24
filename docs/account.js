"use strict";

const connectionMode = modoDelMapa();
const backend = connectionMode === "demo" ? backendDemo()
  : connectionMode === "conectado" && window.supabase ? backendSupabase() : null;

const accessDialog = byId("account-dialog");
const editorDialog = byId("editor-dialog");
const managementPanel = byId("management-panel");
const editorForm = byId("draft-form");
const ownerFields = [
  "tipo_perfil", "nombre", "categoria", "localidad", "servicios", "descripcion", "web", "correo_publico",
  "whatsapp", "telefono", "red_social", "procesos", "materiales", "escala_produccion",
  "direccion", "latitud", "longitud",
];
const statusNames = {
  borrador: "Borrador", en_revision: "En revisión", correcciones: "Con correcciones",
  publicada: "Publicada", pausada: "Pausada",
};

let sessionUser = null;
let canManage = false;
let accessIntent = "account";
let accessCodeEmail = "";
let ownerDraft = null;
let ownerPhoto = "";
let ownerPublic = false;
let reviewQueue = [];
let reviewSelection = null;
let adminView = "solicitudes";
let mfaFactors = null;
let mfaFactorId = null;
let sessionVersion = 0;
let lastSessionApplied = 0;
let catalogVersion = 0;
const busyPanels = new Set();

function feedback(id, message = "", error = false) {
  const element = byId(id);
  element.textContent = message;
  element.classList.toggle("is-error", error);
  element.hidden = !message;
}

function readableError(error, fallback) {
  const messages = {
    otp_expired: "El código venció o es incorrecto. Pedí uno nuevo.",
    over_email_send_rate_limit: "Esperá un momento antes de solicitar otro código.",
    validation_failed: "Revisá los datos ingresados.",
    "23514": "Revisá el formato y el largo de los datos.",
    "23503": "Seleccioná una localidad y un rubro de la lista.",
  };
  if (messages[error?.code]) return messages[error.code];
  if (["P0001", "42501"].includes(error?.code) && typeof error.message === "string"
    && error.message.length < 200 && !/permission denied/i.test(error.message)) return error.message;
  return error?.name === "Error" && error.message ? error.message : fallback;
}

function showPanel(dialog) {
  for (const opened of selectAll("dialog[open]")) {
    if (opened !== dialog) opened.close();
  }
  if (!dialog.open) {
    dialog.showModal();
    dialog.scrollTop = 0;
  }
}

async function runAction(dialog, messageId, task, fallback) {
  if (busyPanels.has(dialog)) return;
  busyPanels.add(dialog);
  dialog.setAttribute("aria-busy", "true");
  feedback(messageId);
  const submitButtons = selectAll('button[type="submit"]', dialog).filter((button) => button.form?.method !== "dialog");
  for (const button of submitButtons) button.disabled = true;
  if (dialog === editorDialog) byId("draft-fields").disabled = true;
  try {
    await task();
  } catch (error) {
    feedback(messageId, readableError(error, fallback), true);
  } finally {
    busyPanels.delete(dialog);
    dialog.removeAttribute("aria-busy");
    for (const button of submitButtons) button.disabled = false;
    if (dialog === editorDialog) editorStatus();
  }
}

async function refreshDirectory() {
  const request = ++catalogVersion;
  if (!backend) {
    setCatalog([], "Completá la conexión con Supabase en config.js.");
    return;
  }
  try {
    const results = await backend.publicList();
    if (request === catalogVersion) {
      setCatalog(results);
      openLinkedRating();
    }
  } catch {
    if (request === catalogVersion) setCatalog([], "Revisá la conexión y volvé a intentar.");
  }
}

function paintAccountNav() {
  const account = byId("account-button");
  const join = byId("join-button");
  const label = sessionUser ? "Cuenta" : "Ingresar";
  account.querySelector("span").textContent = label;
  account.setAttribute("aria-label", label);
  join.querySelector("span").textContent = sessionUser ? "Mi ficha" : "Sumá tu perfil";
  join.querySelector("use").setAttribute("href", sessionUser ? "#i-user" : "#i-plus");
  join.hidden = canManage;
  byId("account-profile-button").hidden = canManage;
  byId("notifications-button").hidden = !canManage;
  for (const button of selectAll('.header-nav [data-section]:not([data-section="management"])')) button.hidden = canManage;
  byId("management-nav").hidden = !canManage;
  byId("opportunities-nav").hidden = canManage || !communityContext?.ficha;
  byId("review-button").hidden = !canManage;
}

async function refreshSession() {
  const request = ++sessionVersion;
  if (!backend) return;
  const account = await backend.user();
  const context = account ? await backend.context().catch(() => null) : null;
  if (request < lastSessionApplied) return;
  lastSessionApplied = request;
  const previousUser = sessionUser?.id;
  const wasAdmin = canManage;
  if (sessionUser?.id && sessionUser.id !== account?.id) {
    ownerDraft = null;
    ownerPhoto = "";
    ownerPublic = false;
    reviewSelection = null;
    reviewQueue = [];
    fillOwnerForm();
    byId("owner-photo-slot").replaceChildren();
    byId("review-list").replaceChildren();
    byId("review-contents").replaceChildren();
    byId("sponsor-list").replaceChildren();
    clearSponsorEditor();
    clearManifestoEditor();
    clearCommunity();
    configureNotifications(false);
    adminView = "solicitudes";
    accessCodeEmail = "";
    if (editorDialog.open) editorDialog.close();
    if (state.section === "management") setSection("explore");
  }
  sessionUser = account;
  canManage = Boolean(account && context?.es_administrador);
  paintAccountNav();
  if (account && !canManage) void refreshCommunity();
  configureNotifications(Boolean(context?.puede_moderar));
  if (!sessionUser && state.section === "opportunities") setSection("explore");
  if (!canManage && state.section === "management") setSection("explore");
  if (canManage && (!wasAdmin || previousUser !== account?.id)) void showReview();
}

async function showAccess(intent = "account", clearCode = true) {
  accessIntent = intent;
  if (clearCode) {
    accessCodeEmail = "";
    byId("verify-code-form").reset();
  }
  feedback("account-message");
  showPanel(accessDialog);
  const demo = backend?.mode === "demo";
  byId("demo-access").hidden = !demo || Boolean(sessionUser);
  for (const button of selectAll("[data-demo-login]", accessDialog)) {
    button.hidden = intent === "rating" && button.dataset.demoLogin !== "cliente";
  }
  byId("signed-in-access").hidden = !sessionUser;
  byId("send-code-form").hidden = !backend || demo || Boolean(sessionUser) || Boolean(accessCodeEmail);
  byId("verify-code-form").hidden = !accessCodeEmail || Boolean(sessionUser) || demo;
  const titles = { opportunities: "Ingresá a Oportunidades", profile: "Sumá tu perfil", rating: "Ingresá para calificar", review: "Ingresá para gestionar", account: "Ingresá" };
  byId("account-title").textContent = sessionUser ? "Tu cuenta" : titles[intent];
  if (!backend) {
    byId("account-help").textContent = "La conexión con Supabase todavía requiere configuración.";
  } else if (sessionUser) {
    const userId = sessionUser.id;
    byId("account-help").textContent = sessionUser.email || "Sesión iniciada";
    try {
      const context = await backend.context();
      if (sessionUser?.id === userId) {
        canManage = Boolean(context.es_administrador);
        paintAccountNav();
      }
    } catch {
      feedback("account-message", "No se pudieron consultar los permisos de la cuenta.", true);
    }
  } else if (demo) {
    byId("account-help").textContent = intent === "rating" ? "Usá la cuenta de cliente de prueba."
      : "Probá el directorio con cuentas de ejemplo. Los cambios quedan en este navegador.";
  } else if (accessCodeEmail) {
    byId("account-help").textContent = "Te enviamos un código a " + accessCodeEmail + ".";
  } else {
    byId("account-help").textContent = "Ingresá con un código que enviamos a tu correo.";
  }
}

function isInputValid(model, sending) {
  for (const field of ownerFields) editorForm.elements.namedItem(field).removeAttribute("aria-invalid");
  const invalid = (field, message) => {
    const input = editorForm.elements.namedItem(field);
    input.setAttribute("aria-invalid", "true");
    input.focus();
    throw Error(message);
  };
  const limits = { nombre: 70, servicios: 160, descripcion: 1200, web: 300, red_social: 300,
    correo_publico: 160, procesos: 160, materiales: 160, escala_produccion: 90, direccion: 150 };
  for (const [field, limit] of Object.entries(limits)) {
    if (model[field].length > limit) invalid(field, "El campo supera el máximo de " + limit + " caracteres.");
  }
  if (model.categoria && !Object.hasOwn(categories, model.categoria)) invalid("categoria", "Elegí un rubro de la lista.");
  if (model.localidad && !Object.hasOwn(towns, model.localidad)) invalid("localidad", "Elegí una localidad de la lista.");
  for (const field of ["web", "red_social"]) {
    if (model[field] && !isPublicLink(model[field])) invalid(field, "Ingresá un enlace completo y válido que empiece con https://, sin credenciales ni espacios.");
  }
  if (model.correo_publico && !safeMailto(model.correo_publico)) invalid("correo_publico", "Ingresá un correo comercial válido, como contacto@ejemplo.com.");
  for (const field of ["telefono", "whatsapp"]) {
    if (model[field] && !publicPhone(model[field])) invalid(field, "Ingresá un número de 8 a 15 dígitos con código de país y de área, por ejemplo +54 9 376 4123456.");
  }
  if (model.latitud !== null || model.longitud !== null) {
    if (!Number.isFinite(model.latitud) || !Number.isFinite(model.longitud)
      || model.latitud < -28.4 || model.latitud > -25.3 || model.longitud < -56.3 || model.longitud > -53.3) {
      invalid("latitud", "Ingresá las dos coordenadas dentro de la zona de Misiones.");
    }
  }
  if (!sending) return;
  if (model.nombre.length < 2) invalid("nombre", "El nombre es obligatorio y debe tener al menos 2 caracteres.");
  if (!model.categoria) invalid("categoria", "Elegí la rama o rubro de tu ficha.");
  if (!model.localidad) invalid("localidad", "Elegí la localidad de tu ficha.");
  if (model.servicios.length < 5) invalid("servicios", "Describí tus servicios o qué fabricás con al menos 5 caracteres.");
  if (model.descripcion.length < 20) invalid("descripcion", "La descripción es obligatoria y debe tener al menos 20 caracteres.");
  if (![model.web, model.red_social, model.telefono, model.whatsapp, model.correo_publico].some(Boolean)) {
    invalid("correo_publico", "Agregá al menos un contacto: correo, teléfono, WhatsApp, sitio web o red social.");
  }
  if (!model.acepta_publicar) {
    byId("draft-consent").focus();
    throw Error("La autorización para publicar es obligatoria para enviar la ficha a revisión.");
  }
}

function ownerModel() {
  const model = {};
  for (const field of ownerFields) model[field] = editorForm.elements.namedItem(field).value.trim();
  for (const field of ["telefono", "whatsapp"]) model[field] = normalizePhone(model[field]);
  model.correo_publico = model.correo_publico.replace(/^mailto:/i, "");
  if (categories[model.categoria]?.group !== "produccion") {
    model.procesos = model.materiales = model.escala_produccion = "";
  }
  model.latitud = model.latitud ? Number(model.latitud) : null;
  model.longitud = model.longitud ? Number(model.longitud) : null;
  model.acepta_publicar = byId("draft-consent").checked;
  model.foto_ruta = ownerPhoto || null;
  return model;
}

function editorStatus() {
  const reviewing = ownerDraft?.estado === "en_revision";
  const busy = busyPanels.has(editorDialog);
  byId("draft-fields").disabled = reviewing || busy;
  byId("draft-save").hidden = reviewing;
  byId("draft-submit").hidden = reviewing;
  byId("draft-submit").disabled = busy;
  byId("draft-save").disabled = busy;
  byId("draft-photo").disabled = !ownerDraft?.id || reviewing || busy;
  byId("draft-withdraw").hidden = !reviewing;
  byId("draft-pause").hidden = !ownerPublic;
  byId("draft-delete").hidden = !ownerDraft?.id;
  byId("remove-photo").hidden = !ownerPhoto;
  const status = byId("editor-status");
  status.replaceChildren();
  const current = document.createElement("span");
  current.textContent = statusNames[ownerDraft?.estado] || "Borrador";
  status.append(current);
  if (ownerPublic && ownerDraft?.estado !== "publicada") {
    const published = document.createElement("span");
    published.className = "is-public";
    published.textContent = "Hay una versión visible en el mapa";
    status.append(published);
  }
  const note = byId("review-note");
  note.hidden = !ownerDraft?.nota_revision;
  note.textContent = ownerDraft?.nota_revision || "";
  byId("photo-help").textContent = ownerDraft?.id ? "Una imagen JPG, PNG o WebP."
    : "Guardá un borrador para habilitar la subida de fotos.";
}

function updateProductionFields() {
  const production = categories[byId("draft-category").value]?.group === "produccion";
  byId("production-fields").hidden = !production;
  byId("draft-services-label").textContent = production ? "Qué fabricás" : "Servicios que ofrecés";
  byId("draft-services").placeholder = production ? "Ej. Exhibidores y mobiliario comercial" : "Ej. Diseño de mobiliario a medida";
}

function fillOwnerForm() {
  editorForm.reset();
  for (const field of ownerFields) editorForm.elements.namedItem(field).value = ownerDraft?.[field] ?? (field === "tipo_perfil" ? "profesional" : "");
  byId("draft-consent").checked = Boolean(ownerDraft?.acepta_publicar);
  select(".location-details", editorForm).open = Boolean(ownerDraft?.direccion || ownerDraft?.latitud);
  updateProductionFields();
}

async function paintOwnerPhoto() {
  const slot = byId("owner-photo-slot");
  const path = ownerPhoto;
  slot.replaceChildren();
  if (!path) return;
  try {
    const src = await backend.photoUrl(path);
    if (ownerPhoto !== path || !src) return;
    const img = new Image();
    img.src = src;
    img.alt = "Foto de portada de tu ficha";
    slot.replaceChildren(img);
  } catch {
    if (ownerPhoto === path) feedback("editor-message", "No se pudo cargar la vista previa de la foto.", true);
  }
}

async function showEditor() {
  if (canManage) return showReview();
  if (!sessionUser) {
    await showAccess("profile");
    return;
  }
  showPanel(editorDialog);
  const ownerId = sessionUser.id;
  await runAction(editorDialog, "editor-message", async () => {
    const draft = await backend.ownerDraft(ownerId);
    const visible = draft?.id ? await backend.publicVisible(draft.id) : false;
    if (sessionUser?.id !== ownerId) return;
    ownerDraft = draft;
    ownerPhoto = draft?.foto_ruta || "";
    ownerPublic = visible;
    fillOwnerForm();
    await paintOwnerPhoto();
  }, "No se pudo cargar tu ficha. Volvé a abrirla.");
}

async function convertirFoto(file, preserveTransparency = false) {
  if (file.size > 12_000_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw Error("Elegí una foto JPG, PNG o WebP de hasta 12 MB.");
  }
  let original;
  try {
    original = await createImageBitmap(file);
  } catch {
    throw Error("El archivo no se pudo leer como imagen.");
  }
  try {
    const scale = Math.min(1, 1200 / Math.max(original.width, original.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(original.width * scale));
    canvas.height = Math.max(1, Math.round(original.height * scale));
    const transparent = preserveTransparency && file.type !== "image/jpeg";
    const context = canvas.getContext("2d", { alpha: transparent });
    if (!context) throw Error("No se pudo preparar la imagen.");
    if (!transparent) {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(original, 0, 0, canvas.width, canvas.height);
    const result = await new Promise((resolve) => canvas.toBlob(resolve, transparent ? "image/png" : "image/jpeg", .83));
    if (!result || result.size > 1_500_000) throw Error("Elegí una imagen más liviana: una vez optimizada debe pesar hasta 1,5 MB.");
    return result;
  } finally {
    original.close();
  }
}

function clearMfa() {
  mfaFactors = null;
  mfaFactorId = null;
  byId("mfa-form").reset();
  byId("mfa-form").hidden = true;
  byId("mfa-qr").hidden = true;
  byId("mfa-qr").removeAttribute("src");
  byId("mfa-manual").hidden = true;
  byId("mfa-secret").textContent = "";
  byId("mfa-start").hidden = true;
}

async function renderQueue() {
  byId("review-contents").hidden = true;
  byId("review-prompt").hidden = false;
  reviewSelection = null;
  reviewQueue = await backend.queue(byId("review-filter").value);
  const list = byId("review-list");
  list.replaceChildren();
  if (!reviewQueue.length) {
    const message = document.createElement("p");
    message.textContent = adminView === "solicitudes" ? "No hay solicitudes pendientes." : "No hay fichas con este filtro.";
    list.append(message);
  }
  for (const entry of reviewQueue) {
    const row = document.createElement("div");
    row.className = "admin-profile-row";
    const button = document.createElement("button");
    button.className = "review-list-button";
    button.type = "button";
    button.dataset.review = entry.id;
    button.setAttribute("aria-pressed", "false");
    const title = document.createElement("strong");
    title.textContent = entry.nombre || "Ficha sin nombre";
    const location = document.createElement("span");
    location.textContent = [statusNames[entry.estado], communityLabels[entry.tipo_perfil] || "Profesional independiente", categories[entry.categoria]?.label, towns[entry.localidad]?.label].filter(Boolean).join(" · ");
    button.append(title, location);
    const requestLabel = document.createElement("span");
    requestLabel.className = "request-read-label";
    requestLabel.hidden = true;
    button.append(requestLabel);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button admin-delete-button";
    remove.dataset.reviewDelete = entry.id;
    remove.setAttribute("aria-label", "Eliminar ficha de " + (entry.nombre || "emprendimiento sin nombre"));
    remove.innerHTML = icon("trash") + "<span>Eliminar</span>";
    row.append(button, remove);
    list.append(row);
  }
  paintRequestNotifications();
}

async function renderAdmin(view) {
  if (!["fichas", "solicitudes", "publicidad", "manifesto", "oportunidades", "app"].includes(view)) return;
  adminView = view;
  byId("review-verification").hidden = true;
  clearMfa();
  byId("admin-content").hidden = false;
  byId("admin-fichas").hidden = !["fichas", "solicitudes"].includes(view);
  byId("admin-publicidad").hidden = view !== "publicidad";
  byId("admin-manifesto").hidden = view !== "manifesto";
  byId("admin-oportunidades").hidden = view !== "oportunidades";
  byId("admin-app").hidden = view !== "app";
  byId("review-filter-control").hidden = view === "solicitudes";
  byId("review-filter").value = view === "solicitudes" ? "en_revision" : "";
  for (const name of ["fichas", "solicitudes", "publicidad", "manifesto", "oportunidades", "app"]) {
    select('[data-admin-view="' + name + '"]', managementPanel).setAttribute("aria-pressed", name === view);
  }
  await refreshAdminNotifications(false);
  if (view === "oportunidades") { await renderOpportunityAdmin(); }
  else if (view === "app") { await loadAppAdmin(); }
  else if (view === "publicidad") {
    clearSponsorEditor();
    await loadSponsorAdmin();
  } else if (view === "manifesto") await loadManifestoEditor();
  else await renderQueue();
}

async function showReview() {
  if (!sessionUser) return showAccess("review");
  if (busyPanels.has(managementPanel)) return;
  for (const opened of selectAll("dialog[open]")) opened.close();
  activateSection("management");
  clearMfa();
  byId("review-list").replaceChildren();
  byId("review-contents").hidden = true;
  byId("review-verification").hidden = true;
  byId("admin-content").hidden = true;
  byId("admin-demo-note").hidden = backend?.mode !== "demo";
  await runAction(managementPanel, "review-message", async () => {
    const context = await backend.context();
    canManage = Boolean(context.es_administrador);
    paintAccountNav();
    configureNotifications(Boolean(context.puede_moderar));
    if (!canManage) throw Error("Esta cuenta no tiene acceso a la gestión.");
    if (context.puede_moderar) {
      await renderAdmin(adminView);
      return;
    }
    byId("review-verification").hidden = false;
    mfaFactors = await backend.mfaFactors();
    mfaFactorId = mfaFactors.totp[0]?.id || null;
    byId("mfa-help").textContent = mfaFactorId
      ? "Ingresá el código de tu aplicación de autenticación."
      : "Configurá un segundo factor para ingresar a Gestión.";
    byId("mfa-form").hidden = !mfaFactorId;
    byId("mfa-start").hidden = Boolean(mfaFactorId);
  }, "No se pudo abrir Gestión.");
  if (state.section === "management") managementPanel.focus({ preventScroll: true });
}

async function chooseReview(id) {
  const entry = reviewQueue.find((row) => row.id === id);
  if (!entry) return;
  reviewSelection = entry;
  for (const button of selectAll("[data-review]", managementPanel)) button.setAttribute("aria-pressed", button.dataset.review === id);
  const detail = byId("review-contents");
  detail.className = "review-detail";
  const category = categories[entry.categoria]?.label || "";
  const town = towns[entry.localidad]?.label || "";
  const contact = [entry.web, entry.red_social, entry.correo_publico, entry.telefono, entry.whatsapp].filter(Boolean).join(" · ");
  const coordinates = Number.isFinite(entry.latitud) && Number.isFinite(entry.longitud)
    ? [entry.latitud, entry.longitud].join(", ") : "Pin por localidad";
  const pending = entry.estado === "en_revision";
  detail.innerHTML = '<div id="review-thumbnail" class="review-thumbnail" hidden></div>' +
    "<h3>" + escapeHtml(entry.nombre || "Ficha sin nombre") + "</h3>" +
    '<p class="detail-row">' + escapeHtml([statusNames[entry.estado], category, town, entry.direccion].filter(Boolean).join(" · ")) + "</p>" +
    '<p class="detail-row">' + escapeHtml(coordinates) + "</p>" +
    '<p class="detail-row"><strong>' + escapeHtml(entry.servicios) + "</strong></p>" +
    '<p class="detail-row">' + escapeHtml(entry.descripcion) + "</p>" +
    productionMarkup({ processes: entry.procesos, materials: entry.materiales, scale: entry.escala_produccion }) +
    '<p class="detail-row">' + escapeHtml(contact) + "</p>" +
    (pending ? '<label for="review-comment">Indicación para el titular si pedís cambios</label>' +
      '<textarea id="review-comment" maxlength="500" rows="2"></textarea>' : "") +
    '<div class="dialog-actions">' +
    (pending ? '<button type="button" class="button primary" data-account="approve">Aprobar y publicar</button>' +
      '<button type="button" class="button secondary" data-account="corrections">Pedir correcciones</button>' : "") +
    '<button type="button" class="button secondary" data-account="admin-pause" id="admin-pause" hidden>Pausar ficha</button>' +
    '<button type="button" class="text-button danger-link" data-account="admin-delete">Eliminar ficha</button></div>';
  detail.hidden = false;
  byId("review-prompt").hidden = true;
  detail.scrollIntoView({ block: "nearest" });
  feedback("review-message");
  void markRequestRead(entry);
  try {
    const [visible, src] = await Promise.all([
      backend.publicVisible(entry.id),
      backend.photoUrl(entry.foto_ruta).catch(() => { if (reviewSelection === entry) feedback("review-message", "No se pudo abrir la foto.", true); }),
    ]);
    if (reviewSelection !== entry) return;
    byId("admin-pause").hidden = !visible;
    if (!src) return;
    const image = new Image();
    image.alt = "Foto propuesta para la publicación";
    image.src = src;
    const slot = byId("review-thumbnail");
    slot.replaceChildren(image);
    slot.hidden = false;
  } catch {
    if (reviewSelection === entry) feedback("review-message", "No se pudo abrir la foto de esta ficha.", true);
  }
}

async function transitionOwner(action, success, refresh = false) {
  await runAction(editorDialog, "editor-message", async () => {
    ownerDraft = await backend[action](ownerDraft);
    if (refresh) {
      ownerPublic = false;
      await refreshDirectory();
    }
    feedback("editor-message", success);
  }, "No se pudo actualizar tu ficha.");
}

function deleteOwner() {
  if (!ownerDraft || busyPanels.has(editorDialog) || !confirm("¿Eliminar tu ficha y sus calificaciones? Esta acción es definitiva.")) return;
  return runAction(editorDialog, "editor-message", async () => {
    await backend.remove(ownerDraft);
    ownerDraft = null;
    ownerPhoto = "";
    ownerPublic = false;
    fillOwnerForm();
    await Promise.all([paintOwnerPhoto(), refreshDirectory()]);
    feedback("editor-message", "Tu ficha se eliminó.");
  }, "No se pudo eliminar tu ficha.");
}

function moderateProfile(action, entry = reviewSelection) {
  if (!entry || busyPanels.has(managementPanel)) return;
  if (action === "remove" && !confirm('¿Eliminar la ficha de "' + (entry.nombre || "emprendimiento sin nombre") + '" y sus calificaciones? Esta acción es definitiva.')) return;
  return runAction(managementPanel, "review-message", async () => {
    await backend[action](entry);
    await Promise.all([renderQueue(), refreshDirectory(), refreshAdminNotifications(false)]);
    feedback("review-message", action === "remove" ? "Ficha eliminada." : "Ficha pausada y retirada del mapa.");
  }, "No se pudo actualizar la ficha.");
}

async function resolveReview(approved) {
  await runAction(managementPanel, "review-message", async () => {
    const note = byId("review-comment")?.value.trim() || "";
    if (!reviewSelection) throw Error("Elegí una ficha para revisar.");
    if (!approved && !note) throw Error("Escribí qué tiene que corregir el titular.");
    await backend.resolve(reviewSelection, approved, note);
    await refreshAdminNotifications(false);
    await renderQueue();
    await refreshDirectory();
    feedback("review-message", approved ? "Ficha publicada en el mapa." : "Correcciones enviadas al titular.");
  }, "No se pudo resolver la revisión. Volvé a abrir la lista.");
}

byId("send-code-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = byId("login-email").value.trim();
  void runAction(accessDialog, "account-message", async () => {
    await backend.sendCode(email);
    accessCodeEmail = email;
    await showAccess(accessIntent, false);
    byId("login-code").focus();
  }, "No se pudo enviar el código. Probá de nuevo en un momento.");
});

byId("verify-code-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const code = byId("login-code").value;
  void runAction(accessDialog, "account-message", async () => {
    await backend.checkCode(accessCodeEmail, code);
    await refreshSession();
    accessCodeEmail = "";
    await continueAccess();
  }, "Revisá el código de ingreso y volvé a intentar.");
});

function continueAccess() {
  if (canManage) return showReview();
  if (accessIntent === "opportunities") { accessDialog.close(); return showOpportunities(); }
  if (accessIntent === "profile") return showEditor();
  if (accessIntent === "rating") return resumeRating();
  if (accessIntent === "review") return showReview();
  return showAccess();
}

byId("draft-category").addEventListener("change", updateProductionFields);

editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const sending = event.submitter?.value === "submit";
  const model = ownerModel();
  try {
    isInputValid(model, sending);
  } catch (error) {
    feedback("editor-message", readableError(error, "Revisá los campos indicados."), true);
    return;
  }
  void runAction(editorDialog, "editor-message", async () => {
    ownerDraft = await backend.save(ownerDraft?.version ?? 0, model);
    if (sending) ownerDraft = await backend.submit(ownerDraft);
    void refreshCommunity();
    feedback("editor-message", sending ? "La ficha se envió a revisión." : "Borrador guardado.");
  }, "No se pudo guardar tu ficha.");
});

editorForm.addEventListener("input", (event) => event.target.removeAttribute("aria-invalid"));

byId("draft-photo").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || !ownerDraft) return;
  void runAction(editorDialog, "editor-message", async () => {
    ownerPhoto = await backend.upload(await convertirFoto(file));
    await paintOwnerPhoto();
    feedback("editor-message", "Guardá el borrador para conservar la foto.");
  }, "No se pudo subir la foto.");
});

byId("mfa-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const code = byId("mfa-code").value;
  void runAction(managementPanel, "review-message", async () => {
    await backend.mfaVerify(mfaFactorId, code);
    await refreshSession();
    await renderAdmin(adminView);
  }, "Revisá el código del autenticador y volvé a intentar.");
});

byId("review-filter").addEventListener("change", () => {
  void runAction(managementPanel, "review-message", renderQueue, "No se pudo cargar la lista de fichas.");
});

const accountActions = {
  account: () => showAccess("account"),
  profile: () => showEditor(),
  review: () => showReview(),
  "reload-catalog": () => refreshDirectory(),
  "change-email": async () => {
    await showAccess(accessIntent);
    byId("login-email").focus();
  },
  logout: () => runAction(accessDialog, "account-message", async () => {
    await backend.logout();
    await refreshSession();
    accessDialog.close();
    void refreshDirectory();
  }, "No se pudo cerrar la sesión."),
  withdraw: () => transitionOwner("withdraw", "La ficha volvió a borrador."),
  pause: () => transitionOwner("pause", "Ficha pausada y retirada del mapa.", true),
  "delete-profile": deleteOwner,
  "rate-profile": (button) => showRating(button.dataset.rateId),
  "admin-pause": () => moderateProfile("pause"),
  "admin-delete": () => moderateProfile("remove"),
  "remove-photo": () => {
    if (busyPanels.has(editorDialog)) return;
    ownerPhoto = "";
    editorStatus();
    void paintOwnerPhoto();
    feedback("editor-message", "Guardá el borrador para conservar el cambio.");
  },
  "mfa-start": () => runAction(managementPanel, "review-message", async () => {
    const factor = await backend.mfaStart(mfaFactors);
    mfaFactorId = factor.id;
    byId("mfa-qr").src = factor.totp.qr_code;
    byId("mfa-qr").hidden = false;
    byId("mfa-secret").textContent = factor.totp.secret;
    byId("mfa-manual").hidden = false;
    byId("mfa-form").hidden = false;
    byId("mfa-start").hidden = true;
    byId("mfa-help").textContent = "Escaneá el QR con tu aplicación de autenticación e ingresá el código.";
  }, "No se pudo configurar el autenticador."),
  approve: () => resolveReview(true),
  corrections: () => resolveReview(false),
};

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const { account, demoLogin, review, reviewDelete, adminView: view } = button.dataset;
  if (account && Object.hasOwn(accountActions, account)) void accountActions[account](button);
  if (demoLogin && backend?.mode === "demo") {
    void runAction(accessDialog, "account-message", async () => {
      await backend.loginDemo(demoLogin);
      await refreshSession();
      if (demoLogin === "admin" && accessIntent !== "rating") await showReview();
      else await continueAccess();
    }, "No se pudo iniciar la demostración.");
  }
  if (review && !busyPanels.has(managementPanel)) void chooseReview(review);
  if (reviewDelete) {
    const entry = reviewQueue.find((row) => row.id === reviewDelete);
    if (entry) void moderateProfile("remove", entry);
  }
  if (view && view !== adminView) {
    void runAction(managementPanel, "review-message", () => renderAdmin(view), "No se pudo cargar la sección.");
  }
});

byId("connection-note").textContent = backend?.mode === "demo"
  ? "Modo demo · Los cambios quedan en este navegador."
  : backend ? "Directorio público" : "Configuración de Supabase pendiente.";
if (backend) {
  backend.watch(() => { void refreshSession().catch(() => {}); });
  void refreshSession().catch(() => {});
}
void refreshDirectory();
void refreshSponsors();
