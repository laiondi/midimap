"use strict";

const connectionMode = modoDelMapa();
const backend = connectionMode === "demo" ? backendDemo()
  : connectionMode === "conectado" && window.supabase ? backendSupabase() : null;

const accessDialog = byId("account-dialog");
const editorDialog = byId("editor-dialog");
const reviewDialog = byId("review-dialog");
const editorForm = byId("draft-form");
const ownerFields = [
  "nombre", "categoria", "localidad", "servicios", "descripcion", "web", "correo_publico",
  "whatsapp", "telefono", "red_social", "procesos", "materiales", "escala_produccion",
  "direccion", "latitud", "longitud",
];
const statusNames = {
  borrador: "Borrador", en_revision: "En revisión", correcciones: "Con correcciones",
  publicada: "Publicada", pausada: "Pausada",
};

let sessionUser = null;
let accessIntent = "account";
let accessCodeEmail = "";
let ownerDraft = null;
let ownerPhoto = "";
let ownerPublic = false;
let reviewQueue = [];
let reviewSelection = null;
let adminView = "fichas";
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
}

async function refreshSession() {
  const request = ++sessionVersion;
  if (!backend) return;
  const account = await backend.user();
  if (request < lastSessionApplied) return;
  lastSessionApplied = request;
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
    accessCodeEmail = "";
    if (editorDialog.open) editorDialog.close();
    if (reviewDialog.open) reviewDialog.close();
  }
  sessionUser = account;
  paintAccountNav();
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
  byId("review-button").hidden = true;
  byId("send-code-form").hidden = !backend || demo || Boolean(sessionUser) || Boolean(accessCodeEmail);
  byId("verify-code-form").hidden = !accessCodeEmail || Boolean(sessionUser) || demo;
  const titles = { profile: "Sumá tu perfil", rating: "Ingresá para calificar", account: "Ingresá" };
  byId("account-title").textContent = sessionUser ? "Tu cuenta" : titles[intent];
  if (!backend) {
    byId("account-help").textContent = "La conexión con Supabase todavía requiere configuración.";
  } else if (sessionUser) {
    byId("account-help").textContent = sessionUser.email || "Sesión iniciada";
    try {
      const context = await backend.context();
      if (sessionUser && accessDialog.open) byId("review-button").hidden = !context.es_administrador;
    } catch {
      feedback("account-message", "No se pudieron consultar los permisos de la cuenta.", true);
    }
  } else if (demo) {
    byId("account-help").textContent = intent === "rating" ? "Usá la cuenta de cliente de prueba."
      : "Probá el directorio con cuentas de ejemplo. Los cambios quedan en este navegador.";
  } else if (accessCodeEmail) {
    byId("account-help").textContent = "Te enviamos un código a " + accessCodeEmail + ".";
  } else {
    byId("account-help").textContent = intent === "rating" ? "Ingresá con el correo que recibió la invitación."
      : "Ingresá con un código que enviamos a tu correo.";
  }
}

function isInputValid(model, sending) {
  if ([model.web, model.red_social].some((url) => url && !isPublicLink(url))) throw Error("Ingresá enlaces HTTPS válidos.");
  if (model.correo_publico && !safeMailto(model.correo_publico)) throw Error("Revisá el correo comercial.");
  if ([model.telefono, model.whatsapp].some((number) => number && !publicPhone(number))) {
    throw Error("Ingresá el teléfono y el WhatsApp con código de país y de área.");
  }
  if (model.latitud !== null || model.longitud !== null) {
    if (!Number.isFinite(model.latitud) || !Number.isFinite(model.longitud)
      || model.latitud < -28.4 || model.latitud > -25.3 || model.longitud < -56.3 || model.longitud > -53.3) {
      throw Error("Ingresá las dos coordenadas dentro de la zona de Misiones.");
    }
  }
  if (!sending) return;
  if (model.nombre.length < 2 || !model.categoria || !model.localidad
    || model.servicios.length < 5 || model.descripcion.length < 20) {
    throw Error("Completá nombre, rubro, localidad, servicios y una descripción de al menos 20 caracteres.");
  }
  if (![model.web, model.red_social, model.telefono, model.whatsapp, model.correo_publico].some(Boolean)) {
    throw Error("Agregá un medio de contacto público.");
  }
  if (!model.acepta_publicar) throw Error("Confirmá que querés publicar los datos de la ficha.");
}

function ownerModel() {
  const model = {};
  for (const field of ownerFields) model[field] = editorForm.elements.namedItem(field).value.trim();
  for (const field of ["telefono", "whatsapp"]) model[field] = model[field].replace(/[+()\s-]/g, "");
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
  byId("invite-section").hidden = !ownerPublic;
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
  select('label[for="draft-services"]', editorForm).textContent = production ? "Qué fabricás" : "Servicios que ofrecés";
  byId("draft-services").placeholder = production ? "Ej. Exhibidores y mobiliario comercial" : "Ej. Diseño de mobiliario a medida";
}

function fillOwnerForm() {
  editorForm.reset();
  for (const field of ownerFields) editorForm.elements.namedItem(field).value = ownerDraft?.[field] ?? "";
  byId("draft-consent").checked = Boolean(ownerDraft?.acepta_publicar);
  select(".location-details", editorForm).open = Boolean(ownerDraft?.direccion || ownerDraft?.latitud);
  byId("invite-form").reset();
  byId("invite-link").value = "";
  byId("invite-link-group").hidden = true;
  feedback("invite-message");
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
    byId("invite-email").placeholder = backend.mode === "demo" ? "cliente@ejemplo.test" : "";
    await paintOwnerPhoto();
  }, "No se pudo cargar tu ficha. Volvé a abrirla.");
}

async function convertirFoto(file) {
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
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(original, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .83));
    if (!jpeg || jpeg.size > 1_500_000) throw Error("Elegí una foto más liviana.");
    return jpeg;
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
  reviewSelection = null;
  reviewQueue = await backend.queue(byId("review-filter").value);
  const list = byId("review-list");
  list.replaceChildren();
  if (!reviewQueue.length) {
    const message = document.createElement("p");
    message.textContent = "No hay fichas con este filtro.";
    list.append(message);
  }
  for (const entry of reviewQueue) {
    const button = document.createElement("button");
    button.className = "review-list-button";
    button.type = "button";
    button.dataset.review = entry.id;
    button.setAttribute("aria-pressed", "false");
    const title = document.createElement("strong");
    title.textContent = entry.nombre || "Ficha sin nombre";
    const location = document.createElement("span");
    location.textContent = [statusNames[entry.estado], categories[entry.categoria]?.label, towns[entry.localidad]?.label].filter(Boolean).join(" · ");
    button.append(title, location);
    list.append(button);
  }
}

async function renderAdmin(view) {
  adminView = view;
  byId("review-verification").hidden = true;
  clearMfa();
  byId("admin-content").hidden = false;
  for (const name of ["fichas", "publicidad"]) {
    byId("admin-" + name).hidden = name !== view;
    select('[data-admin-view="' + name + '"]', reviewDialog).setAttribute("aria-pressed", name === view);
  }
  if (view === "publicidad") {
    clearSponsorEditor();
    await loadSponsorAdmin();
  } else await renderQueue();
}

async function showReview() {
  showPanel(reviewDialog);
  clearMfa();
  byId("review-list").replaceChildren();
  byId("review-contents").hidden = true;
  byId("review-verification").hidden = true;
  byId("admin-content").hidden = true;
  byId("review-filter").value = "en_revision";
  await runAction(reviewDialog, "review-message", async () => {
    const context = await backend.context();
    if (!context.es_administrador) throw Error("Esta cuenta no tiene acceso a la administración.");
    if (context.puede_moderar) {
      await renderAdmin("fichas");
      return;
    }
    byId("review-verification").hidden = false;
    mfaFactors = await backend.mfaFactors();
    mfaFactorId = mfaFactors.totp[0]?.id || null;
    byId("mfa-help").textContent = mfaFactorId
      ? "Ingresá el código de tu aplicación de autenticación."
      : "Configurá un segundo factor para ingresar a la administración.";
    byId("mfa-form").hidden = !mfaFactorId;
    byId("mfa-start").hidden = Boolean(mfaFactorId);
  }, "No se pudo abrir la administración.");
}

async function chooseReview(id) {
  const entry = reviewQueue.find((row) => row.id === id);
  if (!entry) return;
  reviewSelection = entry;
  for (const button of selectAll("[data-review]", reviewDialog)) button.setAttribute("aria-pressed", button.dataset.review === id);
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
  feedback("review-message");
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

function moderateProfile(action) {
  if (!reviewSelection || busyPanels.has(reviewDialog)) return;
  if (action === "remove" && !confirm("¿Eliminar esta ficha y sus calificaciones? Esta acción es definitiva.")) return;
  return runAction(reviewDialog, "review-message", async () => {
    await backend[action](reviewSelection);
    await Promise.all([renderQueue(), refreshDirectory()]);
    feedback("review-message", action === "remove" ? "Ficha eliminada." : "Ficha pausada y retirada del mapa.");
  }, "No se pudo actualizar la ficha.");
}

async function resolveReview(approved) {
  await runAction(reviewDialog, "review-message", async () => {
    const note = byId("review-comment")?.value.trim() || "";
    if (!reviewSelection) throw Error("Elegí una ficha para revisar.");
    if (!approved && !note) throw Error("Escribí qué tiene que corregir el titular.");
    await backend.resolve(reviewSelection, approved, note);
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
  if (accessIntent === "profile") return showEditor();
  if (accessIntent === "rating") return resumeRating();
  return showAccess();
}

byId("draft-category").addEventListener("change", updateProductionFields);

byId("invite-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = byId("invite-email").value.trim();
  void runAction(editorDialog, "invite-message", async () => {
    byId("invite-link-group").hidden = true;
    const id = ownerDraft.id;
    const code = await backend.invite(id, email);
    const url = new URL(location.href);
    url.hash = new URLSearchParams({ perfil: id, resena: code });
    byId("invite-link").value = url.href;
    byId("invite-link-group").hidden = false;
    feedback("invite-message", "El enlace es de un solo uso y tiene una validez de hasta 30 días.");
  }, "No se pudo generar la invitación.");
});

async function copyInvitation() {
  const field = byId("invite-link");
  if (!field.value) return;
  try {
    await navigator.clipboard.writeText(field.value);
    feedback("invite-message", "Enlace copiado.");
  } catch {
    field.focus();
    field.select();
    feedback("invite-message", "Copiá el enlace seleccionado.");
  }
}

editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const sending = event.submitter?.value === "submit";
  const model = ownerModel();
  void runAction(editorDialog, "editor-message", async () => {
    isInputValid(model, sending);
    ownerDraft = await backend.save(ownerDraft?.version ?? 0, model);
    if (sending) ownerDraft = await backend.submit(ownerDraft);
    feedback("editor-message", sending ? "La ficha se envió a revisión." : "Borrador guardado.");
  }, "No se pudo guardar tu ficha.");
});

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
  void runAction(reviewDialog, "review-message", async () => {
    await backend.mfaVerify(mfaFactorId, code);
    await renderAdmin("fichas");
  }, "Revisá el código del autenticador y volvé a intentar.");
});

byId("review-filter").addEventListener("change", () => {
  void runAction(reviewDialog, "review-message", renderQueue, "No se pudo cargar la lista de fichas.");
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
  "copy-invitation": copyInvitation,
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
  "mfa-start": () => runAction(reviewDialog, "review-message", async () => {
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
  const { account, demoLogin, review, adminView: view } = button.dataset;
  if (account && Object.hasOwn(accountActions, account)) void accountActions[account](button);
  if (demoLogin && backend?.mode === "demo") {
    void runAction(accessDialog, "account-message", async () => {
      await backend.loginDemo(demoLogin);
      await refreshSession();
      if (demoLogin === "admin" && accessIntent !== "rating") await showReview();
      else await continueAccess();
    }, "No se pudo iniciar la demostración.");
  }
  if (review && !busyPanels.has(reviewDialog)) void chooseReview(review);
  if (view && view !== adminView) {
    void runAction(reviewDialog, "review-message", () => renderAdmin(view), "No se pudo cargar la sección.");
  }
});

reviewDialog.addEventListener("close", clearMfa);
byId("connection-note").textContent = backend?.mode === "demo"
  ? "Modo demo · Los cambios quedan en este navegador."
  : backend ? "Directorio público" : "Configuración de Supabase pendiente.";
if (backend) {
  backend.watch(() => { void refreshSession().catch(() => {}); });
  void refreshSession().catch(() => {});
}
void refreshDirectory();
void refreshSponsors();
