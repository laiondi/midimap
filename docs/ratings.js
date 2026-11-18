"use strict";

const ratingDialog = byId("rating-dialog");
const ratingForm = byId("rating-form");
const scoreFormat = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
let ratingDraft = null;
let openedInvitation = "";

function ratingMarkup(profile) {
  const count = profile.ratingCount || 0;
  const score = count ? scoreFormat.format(profile.rating) : "";
  const countLabel = count === 1 ? "1 calificación" : count + " calificaciones";
  const summary = count ? score + " de 5, " + countLabel : "Sin calificaciones";
  return `<span class="rating-summary" role="img" aria-label="${summary}">
    <span class="rating-display" aria-hidden="true">★★★★★<span style="width:${count ? Math.max(0, Math.min(100, profile.rating * 20)) : 0}%">★★★★★</span></span>
    <span aria-hidden="true">${count ? `<strong>${score}</strong> (${count})` : summary}</span>
  </span>`;
}

byId("rating-stars").innerHTML = [1, 2, 3, 4, 5].map((value) => `
  <label class="rating-choice">
    <input type="radio" name="score" value="${value}" class="sr-only" required>
    <span aria-hidden="true">★</span><span class="sr-only">${value} ${value === 1 ? "estrella" : "estrellas"}</span>
  </label>`).join("");

function showRating(id, invitation = "", score = "") {
  const profile = findProfile(id);
  const available = Boolean(profile?.canRate && backend);
  ratingDraft = available ? { id, invitation, score } : null;
  ratingForm.reset();
  ratingForm.hidden = !available;
  byId("rating-profile").textContent = available ? profile.name : "Esta ficha no está disponible para calificar.";
  byId("rating-invite").value = invitation;
  if (score) ratingForm.elements.score.value = score;
  feedback("rating-message");
  showPanel(ratingDialog);
}

function openLinkedRating() {
  const hash = location.hash;
  if (hash === openedInvitation || catalogLoading || catalogProblem) return;
  openedInvitation = hash;
  const invitation = new URLSearchParams(hash.slice(1));
  const id = invitation.get("perfil");
  if (uuidPattern.test(id || "") && uuidPattern.test(invitation.get("resena") || "")) {
    showRating(id, location.href);
  }
}
window.addEventListener("hashchange", openLinkedRating);

function readInvitation(value, id) {
  try {
    const link = new URL(value);
    const params = new URLSearchParams(link.hash.slice(1));
    if (params.get("perfil") === id && uuidPattern.test(params.get("resena") || "")) {
      return params.get("resena").toLowerCase();
    }
  } catch {
    // El formulario muestra el mismo mensaje para un enlace incompleto.
  }
  throw Error("Pegá el enlace completo de invitación para esta ficha.");
}

function resumeRating() {
  if (!ratingDraft) return showAccess();
  const { id, invitation, score } = ratingDraft;
  showRating(id, invitation, score);
}

ratingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = ratingDraft?.id;
  if (!id) return;
  const invitation = byId("rating-invite").value.trim();
  const score = ratingForm.elements.score.value;
  void runAction(ratingDialog, "rating-message", async () => {
    const code = readInvitation(invitation, id);
    ratingDraft = { id, invitation, score };
    if (!sessionUser) {
      await showAccess("rating");
      return;
    }

    await backend.rate(id, code, Number(score));
    if (new URLSearchParams(location.hash.slice(1)).has("resena")) {
      history.replaceState(null, "", "#perfil=" + id);
      openedInvitation = location.hash;
    }
    ratingDraft = null;
    await refreshDirectory();
    if (ratingDialog.open) {
      ratingDialog.close();
      const profile = findProfile(id);
      if (profile) {
        openProfile(profile);
        byId("profile-status").textContent = "Tu calificación se publicó.";
      }
    }
  }, "No se pudo publicar la calificación.");
});
