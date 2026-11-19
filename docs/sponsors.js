"use strict";

const sponsorSection = byId("sponsors");
const sponsorSlide = byId("sponsor-slide");
const sponsorToggle = byId("sponsor-toggle");
let sponsorAds = [];
let sponsorIndex = 0;
let sponsorRequest = 0;
let sponsorPaused = !animate();
let sponsorTimer;

function sponsorImage(value) {
  if (!value) return "";
  if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
  if (/^assets\/photos\/(graphic|gear)\.webp$/.test(value)) return value;
  return safeWebUrl(value);
}

function paintSponsor() {
  const ad = sponsorAds[sponsorIndex];
  if (!ad) return;
  const image = sponsorImage(ad.imageUrl);
  const link = safeWebUrl(ad.enlace);
  sponsorSlide.innerHTML = `<article class="sponsor-banner" data-style="${sponsorIndex % 2}">
    <div class="sponsor-copy">
      <h3>${escapeHtml(ad.titulo)}</h3>
      ${ad.texto ? `<p>${escapeHtml(ad.texto)}</p>` : ""}
      ${link ? externalContact(link, "Visitar patrocinador", "sponsor-link") : ""}
    </div>
    ${image ? `<img class="sponsor-banner-image" src="${escapeHtml(image)}" alt="" decoding="async">` : ""}
  </article>`;
  byId("sponsor-position").textContent = (sponsorIndex + 1) + " de " + sponsorAds.length;
}

function advanceSponsor(step) {
  if (sponsorAds.length < 2) return;
  sponsorIndex = (sponsorIndex + step + sponsorAds.length) % sponsorAds.length;
  paintSponsor();
}

function scheduleSponsors() {
  clearInterval(sponsorTimer);
  if (sponsorAds.length < 2 || sponsorPaused) return;
  sponsorTimer = setInterval(() => {
    if (document.hidden || sponsorSection.matches(":hover") || sponsorSection.contains(document.activeElement)) return;
    sponsorSlide.setAttribute("aria-live", "off");
    advanceSponsor(1);
  }, 6500);
}

function updateSponsorControls() {
  byId("sponsor-controls").hidden = sponsorAds.length < 2;
  sponsorToggle.setAttribute("aria-label", sponsorPaused ? "Reanudar anuncios" : "Pausar anuncios");
  sponsorToggle.innerHTML = icon(sponsorPaused ? "play" : "pause");
  scheduleSponsors();
}

async function refreshSponsors() {
  const request = ++sponsorRequest;
  try {
    const rows = backend ? await backend.publicSponsors() : [];
    if (request !== sponsorRequest) return;
    const currentId = sponsorAds[sponsorIndex]?.id;
    sponsorAds = rows;
    sponsorIndex = Math.max(0, rows.findIndex((row) => row.id === currentId));
    sponsorSection.hidden = !rows.length;
    byId("sponsor-demo").hidden = backend?.mode !== "demo";
    if (rows.length) paintSponsor();
    else sponsorSlide.replaceChildren();
    updateSponsorControls();
  } catch {
    if (request === sponsorRequest && !sponsorAds.length) sponsorSection.hidden = true;
  }
}

sponsorSection.addEventListener("click", (event) => {
  const control = event.target.closest("button");
  if (!control) return;
  if (control === sponsorToggle) {
    sponsorPaused = !sponsorPaused;
    updateSponsorControls();
  } else if (control.dataset.adStep) {
    sponsorSlide.setAttribute("aria-live", "polite");
    advanceSponsor(Number(control.dataset.adStep));
    scheduleSponsors();
  }
});

const sponsorForm = byId("sponsor-form");
const sponsorList = byId("sponsor-list");
let sponsorAdminRows = [];
let sponsorDraft = null;
let sponsorDraftId = null;
let sponsorPhoto = "";

function clearSponsorEditor() {
  sponsorForm.reset();
  sponsorForm.hidden = true;
  byId("ad-preview").replaceChildren();
  sponsorDraft = null;
  sponsorDraftId = null;
  sponsorPhoto = "";
}

async function loadSponsorAdmin() {
  const rows = await backend.sponsors();
  sponsorAdminRows = rows;
  sponsorList.replaceChildren();
  const list = document.createDocumentFragment();
  for (const row of rows) {
    const button = document.createElement("button");
    button.className = "review-list-button";
    button.type = "button";
    button.dataset.editSponsor = row.id;
    button.setAttribute("aria-pressed", row.id === sponsorDraft?.id);
    const title = document.createElement("strong");
    title.textContent = row.titulo;
    const status = document.createElement("span");
    status.textContent = row.activo ? "En el carrusel" : "Inactivo";
    button.append(title, status);
    list.append(button);
  }
  if (!rows.length) {
    const message = document.createElement("p");
    message.textContent = "Todavía no hay anuncios.";
    list.append(message);
  }
  sponsorList.append(list);
}

async function paintSponsorPhoto() {
  const slot = byId("ad-preview");
  const path = sponsorPhoto;
  slot.replaceChildren();
  byId("ad-remove-image").hidden = !path;
  if (!path) return;
  const src = sponsorImage(await backend.sponsorPhoto(path));
  if (path !== sponsorPhoto || !src) return;
  const image = new Image();
  image.src = src;
  image.alt = "Vista previa del anuncio";
  slot.replaceChildren(image);
}

async function editSponsor(row = null) {
  clearSponsorEditor();
  sponsorDraft = row;
  sponsorDraftId = row?.id || crypto.randomUUID();
  sponsorPhoto = row?.imagen_ruta || "";
  for (const button of selectAll("[data-edit-sponsor]", sponsorList)) {
    button.setAttribute("aria-pressed", button.dataset.editSponsor === row?.id);
  }
  byId("sponsor-form-title").textContent = row ? "Editar anuncio" : "Nuevo anuncio";
  byId("ad-remove").hidden = !row;
  for (const field of ["titulo", "texto", "enlace", "orden"]) {
    sponsorForm.elements[field].value = row?.[field] ?? (field === "orden" ? "0" : "");
  }
  sponsorForm.elements.activo.checked = Boolean(row?.activo);
  sponsorForm.hidden = false;
  byId("ad-title").focus({ preventScroll: true });
  await paintSponsorPhoto();
}

function sponsorAdminAction(task, fallback) {
  return runAction(managementPanel, "review-message", task, fallback);
}

byId("sponsor-new").addEventListener("click", () => {
  void sponsorAdminAction(() => editSponsor(), "No se pudo abrir el formulario.");
});

sponsorList.addEventListener("click", (event) => {
  const id = event.target.closest("[data-edit-sponsor]")?.dataset.editSponsor;
  const row = sponsorAdminRows.find((item) => item.id === id);
  if (row) void sponsorAdminAction(() => editSponsor(row), "No se pudo abrir el anuncio.");
});

byId("ad-image").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  void sponsorAdminAction(async () => {
    sponsorPhoto = await backend.upload(await convertirFoto(file), "patrocinio");
    await paintSponsorPhoto();
    feedback("review-message", "Guardá el anuncio para conservar la imagen.");
  }, "No se pudo subir la imagen del anuncio.");
});

byId("ad-remove-image").addEventListener("click", () => {
  if (busyPanels.has(managementPanel)) return;
  sponsorPhoto = "";
  void paintSponsorPhoto();
});

sponsorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(sponsorForm);
  const model = {
    titulo: String(form.get("titulo")).trim(),
    texto: String(form.get("texto")).trim(),
    enlace: String(form.get("enlace")).trim(),
    orden: Number(form.get("orden")),
    activo: sponsorForm.elements.activo.checked,
    imagen_ruta: sponsorPhoto || null,
  };
  void sponsorAdminAction(async () => {
    if (model.titulo.length < 2) throw Error("Ingresá el nombre del patrocinador.");
    if (model.enlace && !isPublicLink(model.enlace)) throw Error("Ingresá un enlace HTTPS válido.");
    if (!Number.isInteger(model.orden) || model.orden < 0 || model.orden > 999) throw Error("Elegí un orden entre 0 y 999.");
    const row = await backend.saveSponsor(sponsorDraftId, sponsorDraft?.version ?? 0, model);
    sponsorDraft = row;
    await Promise.all([loadSponsorAdmin(), refreshSponsors()]);
    await editSponsor(row);
    feedback("review-message", row.activo ? "Anuncio guardado y visible en el carrusel." : "Anuncio guardado como inactivo.");
  }, "No se pudo guardar el anuncio.");
});

byId("ad-remove").addEventListener("click", () => {
  if (!sponsorDraft || busyPanels.has(managementPanel) || !confirm("¿Eliminar este anuncio del carrusel y de la administración?")) return;
  void sponsorAdminAction(async () => {
    await backend.removeSponsor(sponsorDraft);
    clearSponsorEditor();
    await Promise.all([loadSponsorAdmin(), refreshSponsors()]);
    feedback("review-message", "Anuncio eliminado.");
  }, "No se pudo eliminar el anuncio.");
});
