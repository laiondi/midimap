"use strict";

let manifestoRequest = 0;
let manifestoEditorRow = null;
const manifestoForm = byId("manifesto-form");
const manifestoFields = ["titulo", "bajada", "contenido", "cierre"];

function paintManifesto(row) {
  byId("manifesto-title").textContent = row.titulo;
  byId("manifesto-subtitle").textContent = row.bajada;
  byId("manifesto-subtitle").hidden = !row.bajada;
  const body = byId("manifesto-body");
  body.replaceChildren();
  for (const paragraph of row.contenido.split(/\n\s*\n/).filter(Boolean)) {
    const element = document.createElement("p");
    element.textContent = paragraph;
    body.append(element);
  }
  byId("manifesto-closing").textContent = row.cierre;
  byId("manifesto-closing").parentElement.hidden = !row.cierre;
  byId("manifesto-content").hidden = false;
}

async function refreshManifesto() {
  const request = ++manifestoRequest;
  const status = byId("manifesto-status");
  byId("manifesto-panel").setAttribute("aria-busy", "true");
  status.textContent = "Cargando manifiesto…";
  byId("manifesto-retry").hidden = true;
  try {
    if (!backend) throw Error("Sin conexión al directorio.");
    const row = await backend.manifesto();
    if (request !== manifestoRequest) return;
    if (!row) throw Error("El manifiesto todavía no está disponible.");
    paintManifesto(row);
    status.textContent = "";
  } catch {
    if (request !== manifestoRequest) return;
    status.textContent = "No se pudo cargar el manifiesto. Volvé a intentar.";
    byId("manifesto-retry").hidden = false;
  } finally {
    if (request === manifestoRequest) byId("manifesto-panel").removeAttribute("aria-busy");
  }
}

function clearManifestoEditor() {
  manifestoEditorRow = null;
  manifestoForm.reset();
  feedback("manifesto-message");
  byId("manifesto-version").textContent = "";
}

function manifestoVersionLabel(row) {
  byId("manifesto-version").textContent = "Versión publicada: " + row.version;
}

async function loadManifestoEditor(force = false) {
  if (!canManage) throw Error("Ingresá como administrador para editar el manifiesto.");
  if (manifestoEditorRow && !force) return;
  const user = sessionUser.id;
  const row = await backend.manifesto();
  if (sessionUser?.id !== user || !canManage) return;
  if (!row) throw Error("El manifiesto todavía no está disponible.");
  manifestoEditorRow = row;
  for (const field of manifestoFields) manifestoForm.elements.namedItem(field).value = row[field] || "";
  manifestoVersionLabel(row);
  feedback("manifesto-message");
}

manifestoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!canManage || !manifestoEditorRow) return;
  const model = Object.fromEntries(manifestoFields.map((field) => [field, manifestoForm.elements.namedItem(field).value.trim()]));
  const limits = { titulo: [2, 120], bajada: [0, 250], contenido: [20, 20000], cierre: [0, 500] };
  for (const [field, [min, max]] of Object.entries(limits)) {
    if (model[field].length < min || model[field].length > max) {
      feedback("manifesto-message", "Revisá el campo: " + manifestoForm.elements.namedItem(field).labels[0].textContent + ".", true);
      manifestoForm.elements.namedItem(field).focus();
      return;
    }
  }
  void runAction(managementPanel, "manifesto-message", async () => {
    const user = sessionUser.id;
    const row = await backend.saveManifesto(manifestoEditorRow.version, model);
    if (sessionUser?.id !== user || !canManage) return;
    manifestoEditorRow = row;
    manifestoVersionLabel(row);
    paintManifesto(row);
    feedback("manifesto-message", "Manifiesto guardado y publicado.");
  }, "No se pudo guardar el manifiesto.");
});
byId("manifesto-reload").addEventListener("click", () => {
  void runAction(managementPanel, "manifesto-message", () => loadManifestoEditor(true), "No se pudo cargar el texto publicado.");
});
byId("manifesto-retry").addEventListener("click", () => { void refreshManifesto(); });
