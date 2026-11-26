"use strict";

let adminNotifications = [];
let notificationsUser = null;
let notificationsEpoch = 0;
let notificationsRequest = null;
let notificationsTimer;
let notificationsInitialized = false;

function requestKey(row) { return row.ficha + ":" + row.version; }

function paintRequestNotifications() {
  const unread = adminNotifications.filter((row) => !row.leida).length;
  const pending = adminNotifications.length;
  const profilePending = adminNotifications.filter(row => row.tipo !== "oportunidad").length;
  const opportunityPending = pending - profilePending;
  const badge = byId("management-unread");
  badge.textContent = unread > 99 ? "99+" : String(unread);
  badge.hidden = !unread;
  byId("management-nav").setAttribute("aria-label", unread ? `Gestión, ${unread} ${unread === 1 ? "solicitud" : "solicitudes"} sin leer` : "Gestión");
  byId("requests-count").textContent = String(profilePending);
  byId("requests-count").hidden = !profilePending;
  byId("opportunity-requests-count").textContent = String(opportunityPending);
  byId("opportunity-requests-count").hidden = !opportunityPending;
  const summary = byId("notifications-summary");
  const text = pending ? `${pending} ${pending === 1 ? "solicitud pendiente" : "solicitudes pendientes"} · ${unread} sin leer.` : "No hay solicitudes pendientes.";
  if (summary.textContent !== text) summary.textContent = text;
  for (const card of selectAll("[data-opportunity-card]")) {
    const row = adminNotifications.find(row => row.tipo === "oportunidad" && row.ficha === card.dataset.opportunityCard);
    const unread = Boolean(row && !row.leida);
    card.classList.toggle("is-unread", unread);
    const label = card.querySelector(".opportunity-state");
    if (label) label.textContent = label.dataset.baseStatus + (unread ? " · Sin leer" : "");
  }
  const index = new Map(adminNotifications.map((row) => [row.ficha, row]));
  for (const button of selectAll("[data-review]", managementPanel)) {
    const row = index.get(button.dataset.review);
    const unreadRow = Boolean(row && !row.leida);
    button.classList.toggle("has-unread-request", unreadRow);
    const badge = button.querySelector(".request-read-label");
    if (badge) {
      badge.hidden = !row;
      badge.textContent = row ? (unreadRow ? "Sin leer" : "Leída") + " · " + (row.tipo === "modificacion" ? "Modificación de ficha" : "Nueva ficha") : "";
    }
  }
}

function configureNotifications(enabled) {
  const user = enabled && canManage ? sessionUser?.id : null;
  if (user === notificationsUser) return;
  clearInterval(notificationsTimer);
  notificationsEpoch++;
  notificationsUser = user;
  notificationsRequest = null;
  notificationsInitialized = false;
  adminNotifications = [];
  paintRequestNotifications();
  if (!user) return;
  void refreshAdminNotifications(false);
  notificationsTimer = setInterval(() => {
    if (!document.hidden) void refreshAdminNotifications(true);
  }, 30000);
}

async function refreshAdminNotifications(announce = false) {
  if (!notificationsUser || !canManage) return;
  if (notificationsRequest) return notificationsRequest;
  const epoch = notificationsEpoch, user = notificationsUser;
  const task = (async () => {
    try {
      const rows = await backend.notifications();
      if (epoch !== notificationsEpoch || user !== sessionUser?.id || !canManage) return;
      const previous = new Set(adminNotifications.map(requestKey));
      const incoming = rows.filter((row) => !row.leida && !previous.has(requestKey(row)));
      const canAnnounce = notificationsInitialized && announce;
      adminNotifications = rows;
      notificationsInitialized = true;
      byId("notifications-error").hidden = true;
      paintRequestNotifications();
      if (canAnnounce && incoming.length) {
        showToast(incoming.length === 1 ? "Llegó una solicitud nueva: " + (incoming[0].nombre || "Ficha sin nombre") : `Llegaron ${incoming.length} solicitudes nuevas.`);
      }
    } catch (error) {
      if (epoch !== notificationsEpoch || user !== sessionUser?.id) return;
      byId("notifications-error").textContent = "No se pudieron actualizar las solicitudes. Usá Actualizar para reintentar.";
      byId("notifications-error").hidden = false;
      if (error?.code === "42501") configureNotifications(false);
    } finally {
      if (epoch === notificationsEpoch) notificationsRequest = null;
    }
  })();
  notificationsRequest = task;
  return task;
}

async function markRequestRead(entry) {
  if (!notificationsUser || entry.estado !== "en_revision") return;
  const user = notificationsUser;
  try {
    const marked = await backend.markRequestRead(entry.id, entry.version);
    if (notificationsUser !== user || sessionUser?.id !== user) return;
    notificationsEpoch++;
    notificationsRequest = null;
    if (marked) {
      for (const row of adminNotifications) if (row.ficha === entry.id && row.version === entry.version) row.leida = true;
      paintRequestNotifications();
    }
    await refreshAdminNotifications(false);
  } catch {
    if (sessionUser?.id === user) feedback("review-message", "La solicitud sigue sin leer porque no se pudo guardar la lectura. Volvé a abrirla.", true);
  }
}

byId("notifications-refresh").addEventListener("click", () => {
  void runAction(managementPanel, "review-message", async () => {
    await refreshAdminNotifications(true);
    if (adminView === "solicitudes" && !reviewSelection) await renderQueue();
    if (adminView === "oportunidades") await renderOpportunityAdmin();
  }, "No se pudieron actualizar las solicitudes.");
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void refreshAdminNotifications(true);
});
window.addEventListener("focus", () => { void refreshAdminNotifications(true); });
window.addEventListener("storage", (event) => {
  if (backend?.mode === "demo" && event.key?.endsWith(".fichas.2")) void refreshAdminNotifications(true);
});
