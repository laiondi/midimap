"use strict";

const byId = (id) => document.getElementById(id);
const select = (selector, root = document) => root.querySelector(selector);
const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];
const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const chars = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => chars[c]);
const normalize = (value) => value.toLocaleLowerCase("es-AR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
const pointOf = (profile) => profile.point || towns[profile.town].point;
const animate = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;
const countText = (count) => `${count} ${count === 1 ? "perfil" : "perfiles"}`;

const searchInput = byId("search");
const townSelect = byId("town");
const categorySelect = byId("category-detail");
const resultList = byId("result-list");
const mapPanel = byId("map-panel");
const profileDialog = byId("profile-dialog");
const profileBody = byId("profile-body");

const storageKeys = { saved: "midi.saved.1" };
function loadList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveList(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
    return true;
  } catch {
    return false;
  }
}

let catalog = [];
let catalogLoading = true;
let catalogProblem = "";
const saved = new Set(loadList(storageKeys.saved).filter((id) => typeof id === "string"));
const state = { section: "explore", view: "map", group: "all", category: "", town: "", query: "" };
let displayed = [];
let activeProfile = null;
let highlightedProfiles = [];
let toastTimer;

function visibleProfiles() {
  const terms = normalize(state.query.trim()).split(/\s+/).filter(Boolean);
  return catalog.filter((profile) => {
    if (state.section === "saved" && !saved.has(profile.id)) return false;
    const category = categories[profile.category];
    if (state.group !== "all" && state.group !== category.group && state.group !== profile.category) return false;
    if (state.category && state.category !== profile.category) return false;
    if (state.town && state.town !== profile.town) return false;
    if (!terms.length) return true;
    const index = normalize([
      profile.name, profile.services, profile.description, profile.address, towns[profile.town].label,
      category.label, profile.processes, profile.materials, profile.scale, ...profile.tags,
    ].filter(Boolean).join(" "));
    return terms.every((term) => index.includes(term));
  });
}

function hasFilters() {
  return Boolean(state.group !== "all" || state.town || state.query.trim());
}

function categoryStyle(category) {
  return `--category-color:${category.color};--category-light:${category.light};--category-text:${category.text};--pin-ink:${category.ink}`;
}

function saveLabel(profile, isSaved) {
  return `${isSaved ? "Quitar de guardados" : "Guardar"}: ${profile.name}`;
}

function saveButton(profile, extraClass = "") {
  const isSaved = saved.has(profile.id);
  const label = escapeHtml(saveLabel(profile, isSaved));
  return `<button type="button" class="icon-button save-button ${extraClass}" data-save="${profile.id}" aria-label="${label}" title="${label}" aria-pressed="${isSaved}">${icon("bookmark")}</button>`;
}

function coverImage(profile, className, forCard = false) {
  if (profile.photoUrl) {
    const photo = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(profile.photoUrl)
      ? profile.photoUrl : safeWebUrl(profile.photoUrl);
    if (photo) return '<img class="' + className + '" src="' + escapeHtml(photo) + '" alt="" loading="lazy" decoding="async">';
  }
  if (profile.image === "midi") {
    const asset = forCard ? "midi-simbolo" : "midi-marca";
    return `<img class="${className} ${forCard ? "card-image--brand" : "cover--brand"}" src="assets/${asset}.webp" alt="">`;
  }
  if (profile.image) {
    const alt = forCard ? "" : escapeHtml(profile.imageAlt || "Imagen ilustrativa del rubro");
    return `<img class="${className}" src="assets/photos/${profile.image}${forCard ? "-thumb" : ""}.webp" alt="${alt}" ${forCard ? 'loading="lazy" decoding="async"' : ""}>`;
  }
  if (forCard) return `<span class="${className} card-image--graphic">${icon(categories[profile.category].icon)}</span>`;
  return icon(categories[profile.category].icon);
}

function locationLabel(profile) {
  return '<span class="card-place">' + icon("pin") + escapeHtml(towns[profile.town].label) + '</span>';
}

function cardMarkup(profile) {
  const category = categories[profile.category];
  return `<article class="result-card" data-card="${profile.id}" style="${categoryStyle(category)}">
    <button type="button" class="card-main" data-profile="${profile.id}" aria-label="Ver ficha de ${escapeHtml(profile.name)}">
      ${coverImage(profile, "card-image", true)}
      <span class="card-meta">
        <span class="card-category"><i class="category-dot"></i>${category.label}</span>
        <span class="card-title">${escapeHtml(profile.name)}</span>
        <span class="card-service">${escapeHtml(profile.services)}</span>
        <span class="card-facts">${locationLabel(profile)}${profile.ratingCount ? ratingMarkup(profile) : ""}</span>
      </span>
    </button>
    ${saveButton(profile, "card-save")}
  </article>`;
}

function emptyMarkup() {
  if (catalogLoading) return '<div class="empty"><p>Cargando fichas…</p></div>';
  if (catalogProblem) {
    return '<div class="empty"><h3>El directorio no está disponible</h3><p>' + escapeHtml(catalogProblem) +
      '</p><button type="button" class="button secondary" data-account="reload-catalog">Volver a intentar</button></div>';
  }
  if (!catalog.length && !hasFilters() && state.section === "explore") {
    return '<div class="empty"><h3>Todavía no hay fichas publicadas</h3>' +
      '<button type="button" class="button primary" data-account="profile">Sumá tu perfil</button></div>';
  }
  const filtered = hasFilters();
  const title = filtered ? "No encontramos coincidencias" : "Todavía no guardaste perfiles";
  const copy = filtered ? "Probá con otro servicio, rubro o localidad." : "Usá el ícono de guardado en las fichas que quieras volver a consultar.";
  const button = filtered ? 'data-reset>Limpiar filtros' : 'data-section="explore">Explorar el directorio';
  return `<div class="empty">
    <span class="empty-mark">${icon(filtered ? "search" : "bookmark")}</span>
    <h3>${title}</h3><p>${copy}</p><button type="button" class="button secondary" ${button}</button>
  </div>`;
}

function updateSavedCount() {
  const element = byId("saved-count");
  const count = catalog.filter((profile) => saved.has(profile.id)).length;
  element.textContent = count;
  element.hidden = !count;
  select('.header-nav [data-section="saved"]').setAttribute("aria-label", count ? `Guardados (${count})` : "Guardados");
}

function renderResults() {
  displayed = visibleProfiles();
  byId("result-title").textContent = state.section === "saved" ? "Perfiles guardados" : "Directorio creativo";
  byId("result-count").textContent = countText(displayed.length);
  byId("map-scope").textContent = state.town ? towns[state.town].label : "Toda Misiones";
  byId("clear-filters").hidden = !hasFilters();
  byId("search-clear").hidden = !state.query;
  resultList.innerHTML = displayed.length ? displayed.map(cardMarkup).join("") : emptyMarkup();
  resultList.scrollTop = 0;
  for (const button of selectAll("[data-category]")) {
    button.setAttribute("aria-pressed", button.dataset.category === state.group);
  }
  renderPins();
  applyHighlight();
}

function updateSave(profile) {
  const isSaved = !saved.has(profile.id);
  if (isSaved) saved.add(profile.id);
  else saved.delete(profile.id);
  const stored = saveList(storageKeys.saved, [...saved]);
  updateSavedCount();
  if (state.section === "saved") renderResults();
  for (const button of selectAll(`[data-save="${profile.id}"]`)) {
    const label = saveLabel(profile, isSaved);
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", isSaved);
    button.title = label;
  }
  if (!stored) {
    if (profileDialog.open) byId("profile-status").textContent = "El cambio se conserva mientras esta página esté abierta.";
    else showToast("El cambio se conserva mientras esta página esté abierta.");
  }
  if (state.section === "saved" && !profileDialog.open && !isSaved) {
    (select(".card-save", resultList) || select(".empty button", resultList))?.focus();
  }
}

function resetFilters() {
  state.query = state.town = state.category = "";
  state.group = "all";
  searchInput.value = townSelect.value = "";
  updateCategoryOptions();
  renderResults();
  fitMap();
}

function activateSection(section) {
  state.section = section;
  const managing = section === "management";
  byId("explorar").hidden = managing;
  select(".hero").hidden = managing;
  byId("management-panel").hidden = !managing;
  const skip = select(".skip-link");
  skip.href = managing ? "#management-panel" : "#explorar";
  skip.textContent = managing ? "Ir a Gestión" : "Ir al explorador";
  for (const button of selectAll(".header-nav [data-section]")) {
    const current = button.dataset.section === section;
    button.classList.toggle("is-active", current);
    if (current) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  if (!managing) {
    clearMfa();
    if (map && state.view === "map") map.invalidateSize({ pan: false });
  }
}

function setSection(section) {
  if (!["explore", "saved", "management"].includes(section) || section === state.section) return;
  if (section === "management") {
    void showReview();
    return;
  }
  activateSection(section);
  resetFilters();
}

function setView(view) {
  if (view === state.view) return;
  state.view = view;
  byId("workspace").dataset.mode = view;
  mapPanel.hidden = view !== "map";
  for (const button of selectAll("[data-view]")) {
    button.setAttribute("aria-pressed", button.dataset.view === view);
  }
  if (view === "map" && map) {
    map.invalidateSize({ pan: false });
    fitMap();
  }
}

function showToast(message) {
  const toast = byId("toast");
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function findProfile(id) {
  return catalog.find((profile) => profile.id === id);
}

function safeWebUrl(value) {
  if (typeof value !== "string" || !value || value.length > 4096
    || /[\s\u0000-\u001f\u007f<>"'\\]/u.test(value)
    || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)
    || !/^https:\/\/[a-z0-9.-]+(?::\d{1,5})?(?:[/?#]|$)/i.test(value)) return "";
  try {
    const url = new URL(value);
    const host = url.hostname;
    const domain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i;
    return url.protocol === "https:" && !url.username && !url.password && domain.test(host)
      && !/\.(?:local|localhost|internal|invalid|test)$/i.test(host)
      && (!url.port || Number(url.port) >= 1) ? url.href : "";
  } catch {
    return "";
  }
}

function safeMailto(value) {
  if (typeof value !== "string" || value.length > 160) return "";
  const parts = /^([a-z0-9_+%.-]{1,64})@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/i.exec(value);
  if (!parts || /(^\.|\.$|\.\.)/.test(parts[1])) return "";
  return "mailto:" + encodeURIComponent(parts[1]) + "@" + parts[2];
}

function isPublicLink(value) {
  return typeof value === "string" && value.length <= 300 && Boolean(safeWebUrl(value));
}

function publicPhone(value) {
  return typeof value === "string" && /^[1-9][0-9]{7,14}$/.test(value) ? value : "";
}

function normalizePhone(value) {
  if (!/^\+?[0-9][0-9() .-]*$/.test(value)) return value;
  return value.replace(/[() .-]/g, "").replace(/^\+/, "");
}

function showEmailContact() {
  const email = activeProfile?.email;
  const mailto = safeMailto(email);
  if (!mailto) return;
  byId("contact-email").value = email;
  byId("contact-mail-app").href = mailto;
  byId("contact-gmail").href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(email);
  byId("contact-outlook").href = "https://outlook.live.com/mail/0/deeplink/compose?to=" + encodeURIComponent(email);
  byId("contact-email-status").textContent = "";
  byId("email-dialog").showModal();
}

async function copyContactEmail() {
  const field = byId("contact-email");
  if (!safeMailto(field.value)) return;
  try {
    await navigator.clipboard.writeText(field.value);
    byId("contact-email-status").textContent = "Correo copiado.";
  } catch {
    field.focus();
    field.select();
    byId("contact-email-status").textContent = "Seleccioná y copiá el correo que aparece arriba.";
  }
}

function socialLabel(url) {
  const domain = new URL(url).hostname.replace(/^(www\.|m\.)/, "");
  const labels = {
    "instagram.com": "Instagram", "facebook.com": "Facebook", "linkedin.com": "LinkedIn", "tiktok.com": "TikTok",
    "behance.net": "Behance", "youtube.com": "YouTube", "youtu.be": "YouTube", "pinterest.com": "Pinterest",
  };
  return Object.hasOwn(labels, domain) ? labels[domain] : "Ver enlace";
}

function externalContact(url, label, style) {
  return url ? `<a class="button ${style}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ${icon("external")}</a>` : "";
}

function productionMarkup(profile) {
  const fields = [["Procesos", profile.processes], ["Materiales", profile.materials], ["Escala de producción", profile.scale]];
  const contents = fields.filter(([, value]) => value).map(([label, value]) =>
    `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
  return contents ? `<dl class="production-details">${contents}</dl>` : "";
}

function openProfile(profile) {
  if (!profile) return;
  const category = categories[profile.category];
  const url = safeWebUrl(profile.url);
  const social = safeWebUrl(profile.social);
  const email = safeMailto(profile.email);
  const urlButton = externalContact(url, profile.linkLabel || "Ver sitio web", "primary");
  const socialButton = social ? externalContact(social, socialLabel(social), url ? "secondary" : "primary") : "";
  const emailButton = email ? '<button type="button" class="button secondary" data-email-contact>' + icon("mail") + ' Escribir por correo</button>' : "";
  const phone = publicPhone(profile.phone);
  const callButton = phone ? `<a class="button secondary" href="tel:+${phone}">${icon("phone")} +${phone}</a>` : "";
  const whatsapp = publicPhone(profile.whatsapp);
  const whatsappButton = whatsapp ? '<a class="button secondary" href="https://wa.me/' + whatsapp +
    '" target="_blank" rel="noopener noreferrer">' + icon("message") + ' WhatsApp</a>' : "";
  const categoryNote = profile.demo ? ' <span class="draft-label">Perfil de ejemplo</span>' : "";
  const description = escapeHtml(profile.description);
  const tags = profile.tags.length
    ? `<ul class="tag-list" aria-label="Servicios y especialidades">${profile.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>`
    : "";
  activeProfile = profile;
  profileBody.style.cssText = categoryStyle(category);
  profileBody.innerHTML = `<div class="profile-cover">
      ${coverImage(profile, "cover-image")}
      <form method="dialog"><button class="icon-button" type="submit" aria-label="Cerrar ficha" autofocus>${icon("close")}</button></form>
    </div>
    <div class="profile-content">
      <div class="profile-category"><i class="category-dot"></i>${category.label}${categoryNote}</div>
      <div class="profile-heading"><h2 id="profile-title">${escapeHtml(profile.name)}</h2>${saveButton(profile)}</div>
      ${locationLabel(profile)}
      ${profile.address ? `<p class="card-place">${escapeHtml(profile.address)}</p>` : ""}
      <p class="profile-copy"><strong>${escapeHtml(profile.services)}</strong></p>
      <p class="profile-description">${description}</p>
      ${productionMarkup(profile)}
      ${tags}
      <div class="profile-actions">
        ${urlButton}${socialButton}${emailButton}${callButton}${whatsappButton}
        ${map ? `<button type="button" class="button secondary" data-show-on-map>${icon("pin")} Ver en el mapa</button>` : ""}
        <button type="button" class="button secondary" data-copy>Copiar enlace</button>
      </div>
      ${profile.canRate ? `<section class="profile-ratings" aria-label="Calificaciones">${ratingMarkup(profile)}
        <button type="button" class="text-button" data-account="rate-profile" data-rate-id="${profile.id}">Calificar un servicio</button></section>` : ""}
      ${profile.credit ? `<p class="profile-credit">${escapeHtml(profile.credit)}</p>` : ""}
      ${profile.demo ? '<p class="profile-credit">Imagen ilustrativa.</p>' : ""}
      <p id="profile-status" class="profile-credit" role="status"></p>
    </div>`;
  if (!profileDialog.open) profileDialog.showModal();
  profileDialog.scrollTop = 0;
  applyHighlight();
}

async function copyProfile() {
  const url = new URL(location.href);
  url.hash = `perfil=${activeProfile.id}`;
  const status = byId("profile-status");
  try {
    await navigator.clipboard.writeText(url.href);
    status.textContent = "Enlace copiado.";
  } catch {
    const field = document.createElement("input");
    field.className = "copy-fallback";
    field.readOnly = true;
    field.value = url.href;
    field.setAttribute("aria-label", "Enlace de la ficha");
    status.replaceChildren("Copiá este enlace:", field);
    field.focus();
    field.select();
    try {
      if (document.execCommand("copy")) status.textContent = "Enlace copiado.";
    } catch {
      // El enlace queda seleccionado para copiarlo manualmente.
    }
  }
}

function viewProfileOnMap(profile) {
  if (!displayed.includes(profile)) {
    if (state.section !== "explore") setSection("explore");
    else resetFilters();
  }
  profileDialog.close();
  setView("map");
  map.stop().setView(pointOf(profile), Math.max(14, map.getZoom()), { animate: false });
  const marker = pins.find((entry) => entry.profiles.includes(profile))?.marker;
  if (marker) {
    marker.getElement()?.focus({ preventScroll: true });
    if (marker.getPopup()) marker.openPopup();
    else marker.openTooltip();
  }
  mapPanel.scrollIntoView({ block: "nearest", behavior: animate() ? "smooth" : "instant" });
}

profileDialog.addEventListener("close", () => {
  activeProfile = null;
  highlightedProfiles = [];
  applyHighlight();
});

function openLinkedProfile() {
  const link = new URLSearchParams(location.hash.slice(1));
  if (link.has("resena")) return;
  const id = link.get("perfil");
  const profile = findProfile(id);
  if (profile) openProfile(profile);
}

for (const dialog of selectAll("dialog")) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

const quickCategories = {
  all: { label: "Todos", icon: "grid" },
  ...Object.fromEntries(["diseno", "produccion"].map((key) => [key, { ...categoryPalettes[categoryGroups[key].palette], label: categoryGroups[key].label }])),
  gear: categories.gear,
  space: categories.space,
};
byId("categories").innerHTML = Object.entries(quickCategories).map(([key, category]) =>
  `<button class="category-button" type="button" data-category="${key}" aria-pressed="${key === "all"}"${key === "all" ? "" : ` style="${categoryStyle(category)}"`}>${icon(category.icon)}${escapeHtml(category.label)}</button>`,
).join("");

function categoryOptionGroups(groups) {
  return groups.map((group) => `<optgroup label="${escapeHtml(categoryGroups[group].label)}">${categoryOptions[group]
    .map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`).join("")}</optgroup>`).join("");
}

function updateCategoryOptions() {
  const placeholders = { all: "Todas las ramas y rubros", diseno: "Todas las ramas", produccion: "Todos los rubros" };
  const title = placeholders[state.group];
  byId("category-select").hidden = !title;
  if (!title) return;
  const groups = state.group === "all" ? ["diseno", "produccion"] : [state.group];
  categorySelect.innerHTML = `<option value="">${title}</option>` + categoryOptionGroups(groups);
  categorySelect.value = state.category;
}
updateCategoryOptions();

const townOptions = Object.entries(towns).map(([key, town]) => `<option value="${key}">${escapeHtml(town.label)}</option>`).join("");
townSelect.insertAdjacentHTML("beforeend", townOptions);
byId("draft-town").innerHTML = '<option value="">Elegí una localidad</option>' + townOptions;
byId("draft-category").innerHTML = '<option value="">Elegí una rama o rubro</option>' + categoryOptionGroups(Object.keys(categoryGroups));

categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  if (state.category && state.group === "all") {
    state.group = categories[state.category].group;
    updateCategoryOptions();
  }
  applyCategoryFilter();
});

function applyCategoryFilter() {
  renderResults();
  if (map && displayed.length && displayed.every((item) => !map.getBounds().contains(pointOf(item)))) fitMap();
}

searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  renderResults();
});

townSelect.addEventListener("change", () => {
  state.town = townSelect.value;
  renderResults();
  fitMap();
});

byId("search-clear").addEventListener("click", () => {
  searchInput.value = state.query = "";
  renderResults();
  searchInput.focus();
});
byId("clear-filters").addEventListener("click", () => {
  resetFilters();
  searchInput.focus();
});
select(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  if (state.section !== "explore") setSection("explore");
  else resetFilters();
  window.scrollTo({ top: 0, behavior: animate() ? "smooth" : "instant" });
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const { section, view, category, profile, save, open, map: mapAction } = button.dataset;
  if (section) setSection(section);
  if (view) setView(view);
  if (category && (category !== state.group || state.category)) {
    state.group = category;
    state.category = "";
    updateCategoryOptions();
    applyCategoryFilter();
  }
  if (profile) openProfile(findProfile(profile));
  if (save) {
    const item = findProfile(save);
    if (item) updateSave(item);
  }
  if (open) {
    byId(`${open}-dialog`).showModal();
  }
  if (button.hasAttribute("data-reset")) {
    resetFilters();
    searchInput.focus();
  }
  if (button.hasAttribute("data-show-on-map")) viewProfileOnMap(activeProfile);
  if (button.hasAttribute("data-copy")) void copyProfile();
  if (button.hasAttribute("data-email-contact")) showEmailContact();
  if (button.hasAttribute("data-copy-email")) void copyContactEmail();
  if (map && mapAction === "fit") fitMap();
  if (map && mapAction === "in") map.zoomIn(1, { animate: animate() });
  if (map && mapAction === "out") map.zoomOut(1, { animate: animate() });
});

resultList.addEventListener("pointerover", (event) => {
  const card = event.target.closest("[data-card]");
  if (card && !card.contains(event.relatedTarget)) setHighlight([card.dataset.card]);
});
resultList.addEventListener("pointerout", (event) => {
  const card = event.target.closest("[data-card]");
  if (card && !card.contains(event.relatedTarget)) setHighlight([]);
});

function setHighlight(ids) {
  highlightedProfiles = ids;
  applyHighlight();
}

function applyHighlight() {
  const ids = activeProfile ? [activeProfile.id, ...highlightedProfiles] : highlightedProfiles;
  for (const card of selectAll("[data-card]", resultList)) {
    card.classList.toggle("is-highlighted", ids.includes(card.dataset.card));
  }
  for (const { marker, profiles } of pins) {
    marker.getElement()?.classList.toggle("is-highlighted", profiles.some((profile) => ids.includes(profile.id)));
  }
}

const map = window.L && typeof mapData !== "undefined" ? L.map("map", {
  attributionControl: false,
  zoomControl: false,
  zoomSnap: .25,
  zoomDelta: .75,
  minZoom: 6,
  maxZoom: 19,
  scrollWheelZoom: true,
  wheelPxPerZoomLevel: 90,
  maxBounds: [[-31.5, -60.5], [-22.5, -49.5]],
  maxBoundsViscosity: .85,
  zoomAnimation: animate(),
  fadeAnimation: animate(),
}) : null;

const markerLayer = map ? L.layerGroup().addTo(map) : null;
const placeLayer = map ? L.layerGroup().addTo(map) : null;
const provinceBounds = map ? L.latLngBounds([[-28.17, -56.15], [-25.45, -53.5]]) : null;
let pins = [];
const placeNamesBySize = map ? [...mapData.places].sort((a, b) => b[2] - a[2]) : [];

function mapLabel(label, point, className, layer) {
  L.marker(point, {
    pane: "placeNames", keyboard: false, interactive: false,
    icon: L.divIcon({ className: `map-name ${className}`, iconSize: [0, 0], html: `<span>${escapeHtml(label)}</span>` }),
  }).addTo(layer);
}

function drawPlaceNames() {
  placeLayer.clearLayers();
  const zoom = map.getZoom();
  if (zoom < 9.25) {
    mapLabel("MISIONES", [-26.58, -54.03], "region province", placeLayer);
    mapLabel("PARAGUAY", [-26.25, -56.29], "region", placeLayer);
    mapLabel("BRASIL", [-26.78, -52.94], "region", placeLayer);
    mapLabel("CORRIENTES", [-28.32, -56.3], "region", placeLayer);
    mapLabel("Río Paraná", [-27.04, -55.44], "river", placeLayer);
    mapLabel("Río Uruguay", [-27.8, -54.86], "river", placeLayer);
  }
  const listed = new Set(displayed.map((profile) => normalize(towns[profile.town].label)));
  const screen = map.getSize();
  const pinPoints = pins.map(({ marker }) => map.latLngToContainerPoint(marker.getLatLng()));
  const placed = [];
  for (const [label, point, population] of placeNamesBySize) {
    if (listed.has(normalize(label)) || (population < 53000 && zoom < 9.25)) continue;
    const pixel = map.latLngToContainerPoint(point);
    const halfWidth = (label.length * 6 + 10) / 2;
    if (pixel.x < halfWidth + 8 || pixel.x > screen.x - halfWidth - 8 || pixel.y < 14 || pixel.y > screen.y - 15) continue;
    if (pinPoints.some((pin) => Math.abs(pin.x - pixel.x) < halfWidth + 32 && Math.abs(pin.y - pixel.y) < 28)) continue;
    if (placed.some((name) => Math.abs(name.pixel.x - pixel.x) < name.halfWidth + halfWidth + 9 && Math.abs(name.pixel.y - pixel.y) < 15)) continue;
    placed.push({ pixel, halfWidth });
    mapLabel(label, point, "city", placeLayer);
  }
}

function drawBaseMap() {
  // Keep the bundled overview below the street tiles as a fallback.
  const fallbackPane = map.createPane("fallbackBase");
  fallbackPane.style.zIndex = 150;
  fallbackPane.style.pointerEvents = "none";
  fallbackPane.setAttribute("aria-hidden", "true");
  const placePane = map.createPane("placeNames");
  placePane.style.zIndex = 180;
  placePane.style.pointerEvents = "none";
  placePane.setAttribute("aria-hidden", "true");
  map.getPane("overlayPane").setAttribute("aria-hidden", "true");
  const fills = { Argentina: "#f1ede2", Paraguay: "#f0efe4", Brazil: "#eeede3", Uruguay: "#f0efe5" };
  L.geoJSON(mapData.provinces, {
    pane: "fallbackBase", interactive: false,
    style: ({ properties }) => {
      const local = properties.iso_3166_2 === "AR-N";
      return {
        fill: true, fillOpacity: 1, fillColor: local ? "#e1e7d7" : (fills[properties.admin] || "#f0efe5"),
        weight: local ? 1.25 : .8, opacity: .86, color: local ? "#879479" : "#c1bfb1",
      };
    },
  }).addTo(map);
  L.geoJSON(mapData.urban, {
    pane: "fallbackBase", interactive: false,
    style: { stroke: false, fillColor: "#d6cbbd", fillOpacity: .56 },
  }).addTo(map);
  L.geoJSON(mapData.roads, {
    pane: "fallbackBase", interactive: false,
    style: ({ properties }) => ({
      color: "#d0c5a7", weight: properties.type === "Major Highway" ? 2.2 : 1.7, opacity: .78,
    }),
  }).addTo(map);
  L.geoJSON(mapData.roads, {
    pane: "fallbackBase", interactive: false,
    style: ({ properties }) => ({
      color: properties.type === "Major Highway" ? "#fff8df" : "#fffdf2",
      weight: properties.type === "Major Highway" ? 1.4 : .95, opacity: .96,
    }),
  }).addTo(map);
  L.geoJSON(mapData.lakes, {
    pane: "fallbackBase", interactive: false,
    style: { color: "#a8c8d3", weight: .7, fillColor: "#b9d6e0", fillOpacity: 1 },
  }).addTo(map);
  L.geoJSON(mapData.rivers, {
    pane: "fallbackBase", interactive: false,
    style: ({ properties }) => ({
      color: "#94b8c7",
      weight: properties.name === "Paraná" ? 2.9 : properties.name === "Uruguay" ? 2.3 : 1.1,
      opacity: .86,
    }),
  }).addTo(map);
}

function drawStreetMap() {
  const failedTiles = new Set();
  const message = byId("map-message");
  const updateMessage = () => {
    message.hidden = failedTiles.size === 0;
    message.textContent = failedTiles.size
      ? "No se pudieron cargar algunas calles. Podés seguir usando el mapa general y las fichas de la lista."
      : "";
  };
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: 6,
    maxZoom: 19,
    maxNativeZoom: 19,
    updateWhenIdle: true,
    keepBuffer: 1,
    referrerPolicy: "strict-origin-when-cross-origin",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  }).on("tileerror", ({ tile }) => {
    failedTiles.add(tile);
    updateMessage();
  }).on("tileload tileunload", ({ tile }) => {
    failedTiles.delete(tile);
    updateMessage();
  }).addTo(map);
}

function groupPins(profiles) {
  const groups = [];
  for (const profile of profiles) {
    const point = pointOf(profile);
    const pixel = map.project(point);
    const group = groups.find((candidate) => candidate.pixel.distanceTo(pixel) < 38);
    if (group) group.profiles.push(profile);
    else groups.push({ point, pixel, profiles: [profile] });
  }
  return groups;
}

function townPopup(profiles, title) {
  const content = document.createElement("div");
  content.innerHTML = `<h3 class="popup-town">${escapeHtml(title)}</h3>`
    + profiles.map((profile) => `<button type="button" class="popup-result" data-profile="${profile.id}" style="${categoryStyle(categories[profile.category])}">
      <i class="category-dot"></i><span>${escapeHtml(profile.name)}</span>${icon("right")}
    </button>`).join("");
  content.addEventListener("click", (event) => {
    const button = event.target.closest("[data-profile]");
    if (button) {
      event.stopPropagation();
      openProfile(findProfile(button.dataset.profile));
    }
  });
  return content;
}

function renderPins() {
  if (!map || !Number.isFinite(map.getZoom()) || state.view !== "map" || state.section === "management") return;
  markerLayer.clearLayers();
  pins = groupPins(displayed).map(({ point, profiles }) => {
    const first = profiles[0];
    const grouped = profiles.length > 1;
    const singleTown = profiles.every((profile) => profile.town === first.town);
    const townName = towns[first.town].label;
    const category = categories[first.category];
    const title = grouped ? `${countText(profiles.length)} en ${singleTown ? townName : "esta zona"}` : first.name;
    const mark = grouped ? profiles.length : icon(category.icon);
    const nearbyTowns = [...new Set(profiles.map((profile) => towns[profile.town].label.replace("Leandro N. ", "")))];
    const label = displayed.length > 1 && map.getZoom() < 9.75 && nearbyTowns.length <= 2
      ? `<span class="pin-label">${escapeHtml(nearbyTowns.join(" y "))}</span>`
      : "";
    const className = grouped ? "map-marker city-marker" : "map-marker";
    const marker = L.marker(point, {
      icon: L.divIcon({
        className, iconSize: [34, 36], iconAnchor: [17, 35], popupAnchor: [0, -35], tooltipAnchor: [0, -16],
        html: `<span class="pin-core" style="${categoryStyle(category)}">${mark}</span>${label}`,
      }),
      title,
      riseOnHover: true,
    }).addTo(markerLayer);
    marker.getElement()?.setAttribute("aria-label", title);
    marker.on("mouseover focus", () => setHighlight(profiles.map((profile) => profile.id)));
    marker.on("mouseout blur", () => setHighlight([]));
    if (grouped) {
      marker.bindPopup(townPopup(profiles, singleTown ? townName : "Perfiles en esta zona"), { className: "town-popup" });
    } else {
      const tooltip = document.createElement("span");
      tooltip.textContent = first.name;
      marker.bindTooltip(tooltip, { direction: "top", offset: [0, -16], className: "place-tooltip" });
      marker.on("click", () => openProfile(first));
    }
    return { marker, profiles };
  });
  positionPinLabels();
  drawPlaceNames();
  applyHighlight();
}

function positionPinLabels() {
  const screen = map.getSize();
  const entries = pins.map(({ marker }) => ({
    element: marker.getElement(),
    point: map.latLngToContainerPoint(marker.getLatLng()),
  }));
  // Preserve room for the pins, the controls, and the location label.
  const occupied = [
    ...entries.map(({ point }) => ({ x: point.x - 20, y: point.y - 36, width: 40, height: 40 })),
    { x: 0, y: 0, width: 152, height: 53 },
    { x: screen.x - 61, y: 0, width: 61, height: 148 },
  ];
  for (const { element, point } of entries) {
    const label = select(".pin-label", element);
    if (!label) continue;
    label.hidden = false;
    const width = label.offsetWidth;
    const height = label.offsetHeight;
    const positions = [
      { side: "right", x: point.x + 23, y: point.y - 29 },
      { side: "left", x: point.x - 23 - width, y: point.y - 29 },
      { side: "above", x: point.x - width / 2, y: point.y - 40 - height },
      { side: "below", x: point.x - width / 2, y: point.y + 8 },
    ];
    const position = positions.find(({ x, y }) => x >= 5 && x + width <= screen.x - 5 && y >= 5 && y + height <= screen.y - 5
      && occupied.every((box) => x + width <= box.x || box.x + box.width <= x || y + height <= box.y || box.y + box.height <= y));
    label.hidden = !position;
    if (!position) continue;
    element.dataset.labelSide = position.side;
    occupied.push({ x: position.x - 3, y: position.y - 3, width: width + 6, height: height + 6 });
  }
}

function fitMap() {
  if (!map || state.view !== "map") return;
  map.closePopup();
  const options = { animate: false, paddingTopLeft: [37, 33], paddingBottomRight: [44, 37], maxZoom: state.town ? 14 : 9.5 };
  if (displayed.length && (hasFilters() || state.section === "saved")) {
    map.fitBounds(L.latLngBounds(displayed.map(pointOf)), options);
  } else if (state.town) {
    map.setView(towns[state.town].point, options.maxZoom, { animate: false });
  } else {
    map.fitBounds(provinceBounds, options);
  }
  renderPins();
}

function syncMapControls() {
  select('[data-map="in"]').disabled = map.getZoom() >= map.getMaxZoom();
  select('[data-map="out"]').disabled = map.getZoom() <= map.getMinZoom();
}

if (map) {
  drawBaseMap();
  drawStreetMap();
  map.getContainer().setAttribute("aria-label", "Mapa de Misiones con calles. Usá las flechas para moverlo, la rueda del mouse o los botones para acercar y alejar. En una pantalla táctil, usá dos dedos para cambiar el zoom.");
  map.on("zoomend", () => { renderPins(); syncMapControls(); });
  map.on("moveend", () => { drawPlaceNames(); positionPinLabels(); });
  fitMap();
  syncMapControls();
  let mapSize = map.getSize();
  new ResizeObserver(() => {
    if (state.view !== "map") return;
    const previous = mapSize;
    map.invalidateSize({ pan: false });
    mapSize = map.getSize();
    if (!previous.equals(mapSize) && mapSize.x) {
      if (Math.abs(previous.x - mapSize.x) > 110) fitMap();
      else positionPinLabels();
    }
  }).observe(map.getContainer());
} else {
  select(".map-controls").hidden = true;
  byId("map-message").textContent = "El mapa no se pudo cargar. Podés seguir explorando las fichas en la lista.";
  byId("map-message").hidden = false;
}
function setCatalog(profiles, problem = "") {
  const firstLoad = catalogLoading || Boolean(catalogProblem);
  catalog = profiles;
  catalogProblem = problem;
  catalogLoading = false;
  updateSavedCount();
  renderResults();
  if (firstLoad && !problem) openLinkedProfile();
}

updateSavedCount();
renderResults();
window.addEventListener("hashchange", openLinkedProfile);
